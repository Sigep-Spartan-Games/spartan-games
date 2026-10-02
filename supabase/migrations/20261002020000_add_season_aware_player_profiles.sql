begin;

create index if not exists submissions_profile_history_idx
on public.submissions (
  submitted_by,
  season_id,
  activity_date desc,
  created_at desc,
  id desc
)
where voided_at is null;

drop policy if exists submissions_read_team_or_admin on public.submissions;

create policy submissions_read_own_team_or_admin
on public.submissions
for select
to authenticated
using (
  submitted_by = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1
    from public.team_memberships membership
    where membership.team_id = submissions.team_id
      and membership.user_id = auth.uid()
      and membership.left_at is null
  )
);

create or replace function public.get_my_profile_seasons_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_current_season_id uuid := public.current_season_id();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  with relevant_seasons as (
    select v_current_season_id as season_id
    where v_current_season_id is not null

    union

    select membership.season_id
    from public.team_memberships membership
    where membership.user_id = v_uid

    union

    select submission.season_id
    from public.submissions submission
    where submission.submitted_by = v_uid
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', season.id,
        'slug', season.slug,
        'name', season.name,
        'status', season.status,
        'starts_on', season.starts_on,
        'ends_on', season.ends_on,
        'is_current', season.id = v_current_season_id
      )
      order by
        (season.id = v_current_season_id) desc,
        season.starts_on desc,
        season.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from relevant_seasons relevant
  join public.seasons season on season.id = relevant.season_id;

  return v_result;
end;
$$;

create or replace function public.get_my_profile_summary_v1(
  p_season_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_current_season_id uuid := public.current_season_id();
  v_contribution_points integer := 0;
  v_activity_count integer := 0;
  v_seasons_played integer := 0;
  v_teams jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_season_id is not null
     and p_season_id is distinct from v_current_season_id
     and not exists (
       select 1
       from public.team_memberships membership
       where membership.user_id = v_uid
         and membership.season_id = p_season_id
     )
     and not exists (
       select 1
       from public.submissions submission
       where submission.submitted_by = v_uid
         and submission.season_id = p_season_id
     ) then
    raise exception 'Season is not available on this profile' using errcode = '42501';
  end if;

  select coalesce(sum(event.points), 0)::integer
  into v_contribution_points
  from public.submissions submission
  join public.score_events event
    on event.source_submission_id = submission.id
  where submission.submitted_by = v_uid
    and submission.voided_at is null
    and (p_season_id is null or submission.season_id = p_season_id);

  select count(*)::integer
  into v_activity_count
  from public.submissions submission
  where submission.submitted_by = v_uid
    and submission.voided_at is null
    and submission.submission_kind = 'activity'
    and (p_season_id is null or submission.season_id = p_season_id);

  with participated_seasons as (
    select membership.season_id
    from public.team_memberships membership
    where membership.user_id = v_uid

    union

    select submission.season_id
    from public.submissions submission
    where submission.submitted_by = v_uid
  )
  select count(*)::integer
  into v_seasons_played
  from participated_seasons participated
  where p_season_id is null or participated.season_id = p_season_id;

  with player_teams as (
    select
      team.id as team_id,
      team.season_id,
      team.name as team_name,
      team.tier,
      membership.role,
      membership.left_at is null as is_active_membership,
      season.slug as season_slug,
      season.name as season_name,
      season.status as season_status,
      season.starts_on,
      season.created_at
    from public.teams team
    join public.seasons season on season.id = team.season_id
    join lateral (
      select candidate.role, candidate.left_at
      from public.team_memberships candidate
      where candidate.team_id = team.id
        and candidate.user_id = v_uid
      order by candidate.joined_at desc, candidate.id desc
      limit 1
    ) membership on true
    where p_season_id is null or team.season_id = p_season_id
  ), team_metrics as (
    select
      player_team.*,
      coalesce((
        select sum(event.points)
        from public.score_events event
        where event.team_id = player_team.team_id
      ), 0)::integer as season_points,
      coalesce((
        select sum(event.points)
        from public.score_events event
        join public.competition_weeks week on week.id = event.week_id
        join public.seasons metric_season on metric_season.id = event.season_id
        where event.team_id = player_team.team_id
          and week.starts_on = public.week_start(
            (now() at time zone metric_season.timezone)::date
          )
      ), 0)::integer as weekly_points,
      coalesce((
        select count(*)
        from public.team_week_results result
        where result.team_id = player_team.team_id
          and result.won
      ), 0)::integer as weeks_won_count,
      coalesce((
        select count(*)
        from public.team_week_results result
        where result.team_id = player_team.team_id
          and result.points >= result.goal_points
      ), 0)::integer as goals_met_count,
      coalesce(streak.streak_count, 0)::integer as streak_count,
      exists (
        select 1
        from public.season_champions champion
        where champion.team_id = player_team.team_id
          and champion.season_id = player_team.season_id
      ) as is_champion
    from player_teams player_team
    left join public.team_streaks streak on streak.team_id = player_team.team_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'team_id', metric.team_id,
        'season_id', metric.season_id,
        'season_slug', metric.season_slug,
        'season_name', metric.season_name,
        'season_status', metric.season_status,
        'team_name', metric.team_name,
        'tier', metric.tier,
        'role', metric.role,
        'is_active_membership', metric.is_active_membership,
        'season_points', metric.season_points,
        'weekly_points', metric.weekly_points,
        'weeks_won_count', metric.weeks_won_count,
        'goals_met_count', metric.goals_met_count,
        'streak_count', metric.streak_count,
        'is_champion', metric.is_champion
      )
      order by
        (metric.season_id = v_current_season_id) desc,
        metric.starts_on desc,
        metric.created_at desc,
        metric.team_name
    ),
    '[]'::jsonb
  )
  into v_teams
  from team_metrics metric;

  return jsonb_build_object(
    'contribution_points', v_contribution_points,
    'activity_count', v_activity_count,
    'seasons_played', v_seasons_played,
    'teams', v_teams
  );
end;
$$;

create or replace function public.request_submission_edit_v2(
  p_submission_id uuid,
  p_suggested_changes jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team_id uuid;
  v_season_id uuid;
  v_season_status text;
  v_request_id uuid;
  v_request_type text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'A reason is required';
  end if;
  if p_suggested_changes is null or jsonb_typeof(p_suggested_changes) <> 'object' then
    raise exception 'Suggested changes must be a JSON object';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(p_suggested_changes) key
    where key not in (
      'activity_key',
      'activity_date',
      'activity_value_number',
      'activity_value_text',
      'activity_value_bool',
      'did_with_teammate',
      'is_deletion'
    )
  ) then
    raise exception 'Suggested changes contain unsupported fields';
  end if;

  select submission.team_id, submission.season_id, season.status
  into v_team_id, v_season_id, v_season_status
  from public.submissions submission
  join public.seasons season on season.id = submission.season_id
  where submission.id = p_submission_id
    and submission.submitted_by = v_uid
    and submission.submission_kind = 'activity'
    and submission.voided_at is null;

  if v_team_id is null then
    raise exception 'Submission not found or not owned by requester' using errcode = '42501';
  end if;

  if v_season_id is distinct from public.current_season_id()
     or v_season_status <> 'active' then
    raise exception 'Submission edits are only available during the active season';
  end if;

  v_request_type := case
    when coalesce((p_suggested_changes->>'is_deletion')::boolean, false) then 'delete'
    else 'edit'
  end;

  insert into public.submission_edit_requests (
    submission_id,
    user_id,
    suggested_changes,
    reason,
    status,
    request_type
  ) values (
    p_submission_id,
    v_uid,
    p_suggested_changes,
    trim(p_reason),
    'pending',
    v_request_type
  )
  returning id into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception 'A pending request already exists for this submission';
end;
$$;

revoke execute on function public.get_my_profile_seasons_v1()
from public, anon;
grant execute on function public.get_my_profile_seasons_v1()
to authenticated;

revoke execute on function public.get_my_profile_summary_v1(uuid)
from public, anon;
grant execute on function public.get_my_profile_summary_v1(uuid)
to authenticated;

comment on function public.get_my_profile_seasons_v1() is
  'Returns the current season and seasons in which the authenticated player participated.';

comment on function public.get_my_profile_summary_v1(uuid) is
  'Returns season-scoped or lifetime contribution and team summaries for the authenticated player.';

commit;
