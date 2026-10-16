begin;

create or replace function public.build_season_wrapped_v1(
  p_season_id uuid,
  p_user_id uuid,
  p_allow_incomplete boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_team public.teams%rowtype;
  v_player_name text;
  v_result jsonb;
begin
  select season.*
  into v_season
  from public.seasons season
  where season.id = p_season_id;

  if v_season.id is null then
    return jsonb_build_object('version', 1, 'status', 'not_found');
  end if;

  if not p_allow_incomplete and v_season.status <> 'completed' then
    return jsonb_build_object(
      'version', 1,
      'status', 'locked',
      'season', jsonb_build_object(
        'id', v_season.id,
        'slug', v_season.slug,
        'name', v_season.name,
        'status', v_season.status
      )
    );
  end if;

  select team.*
  into v_team
  from public.teams team
  where team.id = coalesce(
    (
      select submission.team_id
      from public.submissions submission
      where submission.season_id = p_season_id
        and submission.submitted_by = p_user_id
        and submission.submission_kind = 'activity'
        and submission.voided_at is null
      order by submission.created_at desc, submission.id desc
      limit 1
    ),
    (
      select membership.team_id
      from public.team_memberships membership
      where membership.season_id = p_season_id
        and membership.user_id = p_user_id
        and membership.left_at is null
      order by membership.joined_at desc, membership.id desc
      limit 1
    )
  )
  and team.season_id = p_season_id;

  if v_team.id is null then
    return jsonb_build_object(
      'version', 1,
      'status', 'not_eligible',
      'season', jsonb_build_object(
        'id', v_season.id,
        'slug', v_season.slug,
        'name', v_season.name,
        'status', v_season.status
      )
    );
  end if;

  select coalesce(
    nullif(trim(concat_ws(' ', profile.first_name, profile.last_name)), ''),
    (
      select membership.display_name_snapshot
      from public.team_memberships membership
      where membership.season_id = p_season_id
        and membership.user_id = p_user_id
      order by membership.joined_at desc, membership.id desc
      limit 1
    ),
    (
      select submission.submitted_by_name
      from public.submissions submission
      where submission.season_id = p_season_id
        and submission.submitted_by = p_user_id
      order by submission.created_at desc, submission.id desc
      limit 1
    ),
    'Spartan'
  )
  into v_player_name
  from (select 1) anchor
  left join public.profiles profile on profile.id = p_user_id;

  with
  team_submission_points as (
    select
      submission.id,
      submission.submitted_by,
      submission.submitted_by_name,
      submission.activity_id,
      submission.activity_key,
      submission.activity_date,
      submission.week_id,
      submission.activity_value_number,
      submission.did_with_teammate,
      submission.base_points,
      coalesce(sum(event.points), 0)::integer as total_points,
      coalesce(sum(event.points) filter (where event.event_type = 'activity'), 0)::integer as activity_points,
      coalesce(sum(event.points) filter (where event.event_type = 'streak_bonus'), 0)::integer as streak_points
    from public.submissions submission
    left join public.score_events event
      on event.source_submission_id = submission.id
    where submission.season_id = p_season_id
      and submission.team_id = v_team.id
      and submission.submission_kind = 'activity'
      and submission.voided_at is null
    group by submission.id
  ),
  personal_submissions as (
    select *
    from team_submission_points submission
    where submission.submitted_by = p_user_id
  ),
  personal_dates as (
    select distinct submission.activity_date
    from personal_submissions submission
  ),
  personal_date_groups as (
    select
      activity_date,
      activity_date - row_number() over (order by activity_date)::integer as run_group
    from personal_dates
  ),
  personal_runs as (
    select count(*)::integer as run_length
    from personal_date_groups
    group by run_group
  ),
  personal_activity_ranked as (
    select
      submission.activity_key,
      coalesce(activity.label, initcap(replace(submission.activity_key, '_', ' '))) as label,
      activity.measurement_type,
      activity.unit_label,
      count(*)::integer as submission_count,
      coalesce(sum(submission.total_points), 0)::integer as points,
      case
        when activity.measurement_type = 'number'
          then sum(submission.activity_value_number)
        else null
      end as numeric_total,
      row_number() over (
        order by count(*) desc, coalesce(sum(submission.total_points), 0) desc, submission.activity_key
      ) as activity_rank
    from personal_submissions submission
    left join public.activities activity on activity.id = submission.activity_id
    group by submission.activity_key, activity.label, activity.measurement_type, activity.unit_label
  ),
  team_activity_ranked as (
    select
      submission.activity_key,
      coalesce(activity.label, initcap(replace(submission.activity_key, '_', ' '))) as label,
      activity.measurement_type,
      activity.unit_label,
      count(*)::integer as submission_count,
      coalesce(sum(submission.total_points), 0)::integer as points,
      case
        when activity.measurement_type = 'number'
          then sum(submission.activity_value_number)
        else null
      end as numeric_total,
      row_number() over (
        order by count(*) desc, coalesce(sum(submission.total_points), 0) desc, submission.activity_key
      ) as activity_rank
    from team_submission_points submission
    left join public.activities activity on activity.id = submission.activity_id
    group by submission.activity_key, activity.label, activity.measurement_type, activity.unit_label
  ),
  personal_day_ranked as (
    select
      submission.activity_date,
      coalesce(sum(submission.total_points), 0)::integer as points,
      count(*)::integer as submission_count,
      row_number() over (
        order by coalesce(sum(submission.total_points), 0) desc, count(*) desc, submission.activity_date
      ) as day_rank
    from personal_submissions submission
    group by submission.activity_date
  ),
  personal_week_ranked as (
    select
      week.id,
      week.label,
      week.starts_on,
      coalesce(sum(submission.total_points), 0)::integer as points,
      count(*)::integer as submission_count,
      row_number() over (
        order by coalesce(sum(submission.total_points), 0) desc, count(*) desc, week.starts_on
      ) as week_rank
    from personal_submissions submission
    join public.competition_weeks week on week.id = submission.week_id
    group by week.id
  ),
  team_week_points as (
    select
      week.id,
      week.label,
      week.starts_on,
      coalesce(sum(event.points), 0)::integer as points,
      result.rank,
      result.won,
      result.goal_points,
      row_number() over (
        order by coalesce(sum(event.points), 0) desc, week.starts_on
      ) as points_rank
    from public.competition_weeks week
    left join public.score_events event
      on event.week_id = week.id
     and event.team_id = v_team.id
    left join public.team_week_results result
      on result.week_id = week.id
     and result.team_id = v_team.id
    where week.season_id = p_season_id
      and (week.status = 'finalized' or event.id is not null)
    group by week.id, result.rank, result.won, result.goal_points
  ),
  team_rank_changes as (
    select
      week.id,
      week.label,
      week.starts_on,
      week.rank,
      lag(week.rank) over (order by week.starts_on) as previous_rank,
      lag(week.label) over (order by week.starts_on) as previous_label
    from team_week_points week
    where week.rank is not null
  ),
  best_comeback as (
    select
      change.previous_label as from_week,
      change.label as to_week,
      change.previous_rank,
      change.rank,
      (change.previous_rank - change.rank)::integer as places_gained
    from team_rank_changes change
    where change.previous_rank - change.rank > 0
    order by places_gained desc, change.starts_on
    limit 1
  ),
  season_team_metrics as (
    select
      team.id,
      team.tier,
      coalesce((
        select sum(event.points)
        from public.score_events event
        where event.season_id = p_season_id
          and event.team_id = team.id
      ), 0)::integer as season_points,
      coalesce((
        select count(*)
        from public.team_week_results result
        where result.season_id = p_season_id
          and result.team_id = team.id
          and result.won
      ), 0)::integer as weekly_wins,
      coalesce((
        select count(*)
        from public.team_week_results result
        where result.season_id = p_season_id
          and result.team_id = team.id
          and result.points >= result.goal_points
      ), 0)::integer as goals_met
    from public.teams team
    where team.season_id = p_season_id
      and team.archived_at is null
  ),
  ranked_teams as (
    select
      metric.*,
      dense_rank() over (
        partition by metric.tier
        order by metric.weekly_wins desc, metric.season_points desc, metric.goals_met desc
      )::integer as tier_rank,
      count(*) over (partition by metric.tier)::integer as tier_team_count
    from season_team_metrics metric
  ),
  participant_points as (
    select
      submission.submitted_by as user_id,
      coalesce(sum(event.points), 0)::integer as points
    from public.submissions submission
    left join public.score_events event on event.source_submission_id = submission.id
    where submission.season_id = p_season_id
      and submission.submission_kind = 'activity'
      and submission.voided_at is null
      and submission.submitted_by is not null
    group by submission.submitted_by
  ),
  ranked_participants as (
    select
      participant.*,
      rank() over (order by participant.points desc)::integer as contribution_rank,
      count(*) over ()::integer as participant_count
    from participant_points participant
  ),
  roster as (
    select
      membership.id,
      membership.user_id,
      membership.role,
      membership.display_name_snapshot,
      membership.joined_at
    from public.team_memberships membership
    where membership.team_id = v_team.id
      and membership.joined_at::date <= coalesce(v_season.ends_on, current_date)
      and (
        membership.left_at is null
        or membership.left_at::date > coalesce(v_season.ends_on, current_date)
      )
  ),
  roster_with_points as (
    select
      member.*,
      coalesce((
        select sum(submission.total_points)
        from team_submission_points submission
        where submission.submitted_by = member.user_id
           or (
             member.user_id is null
             and submission.submitted_by is null
             and submission.submitted_by_name = member.display_name_snapshot
           )
      ), 0)::integer as contribution_points
    from roster member
  ),
  aggregates as (
    select
      coalesce((select sum(submission.total_points) from personal_submissions submission), 0)::integer as personal_points,
      coalesce((select sum(submission.streak_points) from personal_submissions submission), 0)::integer as personal_streak_points,
      coalesce((select count(*) from personal_submissions), 0)::integer as personal_activity_count,
      coalesce((select count(*) from personal_dates), 0)::integer as personal_active_days,
      coalesce((select count(distinct submission.week_id) from personal_submissions submission), 0)::integer as personal_active_weeks,
      coalesce((select max(run.run_length) from personal_runs run), 0)::integer as personal_longest_run,
      coalesce((select count(*) from personal_submissions submission where submission.did_with_teammate), 0)::integer as personal_teammate_activities,
      coalesce((
        select sum(greatest(submission.activity_points - submission.base_points, 0))
        from personal_submissions submission
        where submission.did_with_teammate
      ), 0)::integer as personal_teammate_bonus,
      coalesce((select sum(event.points) from public.score_events event where event.season_id = p_season_id and event.team_id = v_team.id), 0)::integer as team_points,
      coalesce((select count(*) from team_submission_points), 0)::integer as team_activity_count,
      coalesce((select count(distinct submission.activity_date) from team_submission_points submission), 0)::integer as team_active_days,
      coalesce((select count(*) from team_submission_points submission where submission.did_with_teammate), 0)::integer as team_teammate_activities,
      coalesce((
        select sum(greatest(submission.activity_points - submission.base_points, 0))
        from team_submission_points submission
        where submission.did_with_teammate
      ), 0)::integer as team_teammate_bonus,
      coalesce((select count(*) from public.team_week_results result where result.season_id = p_season_id and result.team_id = v_team.id and result.won), 0)::integer as weeks_won,
      coalesce((select count(*) from public.team_week_results result where result.season_id = p_season_id and result.team_id = v_team.id and result.points >= result.goal_points), 0)::integer as goals_met,
      coalesce((select count(*) from public.team_week_results result where result.season_id = p_season_id and result.team_id = v_team.id), 0)::integer as finalized_weeks,
      coalesce(
        (
          select max((event.metadata->>'streak_count')::integer)
          from public.score_events event
          where event.season_id = p_season_id
            and event.team_id = v_team.id
            and event.event_type = 'streak_bonus'
            and event.metadata->>'streak_count' ~ '^[0-9]+$'
        ),
        (select max(result.streak_count) from public.team_week_results result where result.season_id = p_season_id and result.team_id = v_team.id),
        (select streak.streak_count from public.team_streaks streak where streak.team_id = v_team.id),
        0
      )::integer as longest_team_streak,
      coalesce((select sum(event.points) from public.score_events event where event.season_id = p_season_id and event.team_id = v_team.id and event.event_type = 'admin_adjustment'), 0)::integer as adjustment_points
  )
  select jsonb_build_object(
    'version', 1,
    'status', 'ready',
    'preview', p_allow_incomplete and v_season.status <> 'completed',
    'season', jsonb_build_object(
      'id', v_season.id,
      'slug', v_season.slug,
      'name', v_season.name,
      'status', v_season.status,
      'starts_on', v_season.starts_on,
      'ends_on', v_season.ends_on
    ),
    'player', jsonb_build_object(
      'id', p_user_id,
      'name', v_player_name
    ),
    'personal', jsonb_build_object(
      'points', aggregate.personal_points,
      'activity_count', aggregate.personal_activity_count,
      'active_days', aggregate.personal_active_days,
      'active_weeks', aggregate.personal_active_weeks,
      'longest_active_day_run', aggregate.personal_longest_run,
      'streak_bonus_points', aggregate.personal_streak_points,
      'teammate_activities', aggregate.personal_teammate_activities,
      'teammate_bonus_points', aggregate.personal_teammate_bonus,
      'team_score_share_percent', case
        when aggregate.team_points = 0 then 0
        else round((aggregate.personal_points::numeric / aggregate.team_points::numeric) * 100, 1)
      end,
      'contribution_rank', (select participant.contribution_rank from ranked_participants participant where participant.user_id = p_user_id),
      'participant_count', coalesce((select max(participant.participant_count) from ranked_participants participant), 0),
      'top_activity', (
        select jsonb_build_object(
          'key', activity.activity_key,
          'label', activity.label,
          'measurement_type', activity.measurement_type,
          'unit_label', activity.unit_label,
          'submission_count', activity.submission_count,
          'points', activity.points,
          'numeric_total', activity.numeric_total
        )
        from personal_activity_ranked activity
        where activity.activity_rank = 1
      ),
      'best_day', (
        select jsonb_build_object(
          'date', day.activity_date,
          'points', day.points,
          'submission_count', day.submission_count
        )
        from personal_day_ranked day
        where day.day_rank = 1
      ),
      'best_week', (
        select jsonb_build_object(
          'id', week.id,
          'label', week.label,
          'points', week.points,
          'submission_count', week.submission_count
        )
        from personal_week_ranked week
        where week.week_rank = 1
      )
    ),
    'team', jsonb_build_object(
      'id', v_team.id,
      'name', v_team.name,
      'tier', v_team.tier,
      'points', aggregate.team_points,
      'activity_count', aggregate.team_activity_count,
      'active_days', aggregate.team_active_days,
      'teammate_activities', aggregate.team_teammate_activities,
      'teammate_bonus_points', aggregate.team_teammate_bonus,
      'weeks_won', aggregate.weeks_won,
      'goals_met', aggregate.goals_met,
      'finalized_weeks', aggregate.finalized_weeks,
      'longest_streak', aggregate.longest_team_streak,
      'adjustment_points', aggregate.adjustment_points,
      'tier_rank', (select ranked.tier_rank from ranked_teams ranked where ranked.id = v_team.id),
      'tier_team_count', (select ranked.tier_team_count from ranked_teams ranked where ranked.id = v_team.id),
      'is_champion', exists (
        select 1
        from public.season_champions champion
        where champion.season_id = p_season_id
          and champion.team_id = v_team.id
      ),
      'top_activity', (
        select jsonb_build_object(
          'key', activity.activity_key,
          'label', activity.label,
          'measurement_type', activity.measurement_type,
          'unit_label', activity.unit_label,
          'submission_count', activity.submission_count,
          'points', activity.points,
          'numeric_total', activity.numeric_total
        )
        from team_activity_ranked activity
        where activity.activity_rank = 1
      ),
      'best_week', (
        select jsonb_build_object(
          'id', week.id,
          'label', week.label,
          'points', week.points,
          'rank', week.rank,
          'won', coalesce(week.won, false),
          'goal_points', week.goal_points
        )
        from team_week_points week
        where week.points_rank = 1
      ),
      'best_comeback', (
        select to_jsonb(comeback)
        from best_comeback comeback
      ),
      'members', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'name', member.display_name_snapshot,
            'role', member.role,
            'is_current_user', member.user_id = p_user_id,
            'contribution_points', member.contribution_points,
            'team_score_share_percent', case
              when aggregate.team_points = 0 then 0
              else round((member.contribution_points::numeric / aggregate.team_points::numeric) * 100, 1)
            end
          )
          order by case when member.role = 'captain' then 0 else 1 end, member.joined_at, member.id
        )
        from roster_with_points member
      ), '[]'::jsonb)
    )
  )
  into v_result
  from aggregates aggregate;

  return v_result;
end;
$$;

create or replace function public.get_my_season_wrapped_v1(p_season_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return public.build_season_wrapped_v1(p_season_id, v_uid, false);
end;
$$;

create or replace function public.get_season_wrapped_preview_v1(
  p_season_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return public.build_season_wrapped_v1(p_season_id, p_user_id, true);
end;
$$;

revoke all on function public.build_season_wrapped_v1(uuid, uuid, boolean)
from public, anon, authenticated;

revoke all on function public.get_my_season_wrapped_v1(uuid)
from public, anon;
grant execute on function public.get_my_season_wrapped_v1(uuid)
to authenticated;

revoke all on function public.get_season_wrapped_preview_v1(uuid, uuid)
from public, anon;
grant execute on function public.get_season_wrapped_preview_v1(uuid, uuid)
to authenticated;

comment on function public.build_season_wrapped_v1(uuid, uuid, boolean) is
  'Internal read-only season recap aggregator. Direct client execution is revoked.';

comment on function public.get_my_season_wrapped_v1(uuid) is
  'Returns the authenticated player and team recap for a completed season.';

comment on function public.get_season_wrapped_preview_v1(uuid, uuid) is
  'Admin-only read preview of a player and team recap before or after season completion.';

commit;
