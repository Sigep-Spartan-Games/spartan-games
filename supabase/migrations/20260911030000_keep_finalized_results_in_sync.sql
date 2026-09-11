-- Keep finalized weekly snapshots synchronized with the authoritative score
-- ledger after administrator corrections, and repair imported discrepancies.

begin;

create or replace function public.recalculate_week_results(
  p_week_id uuid,
  p_preserve_snapshots boolean default true
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week public.competition_weeks%rowtype;
  v_result_count integer;
begin
  select week.* into v_week
  from public.competition_weeks week
  where week.id = p_week_id
  for update;

  if v_week.id is null then
    raise exception 'Competition week not found';
  end if;

  with participants as (
    select
      team.id as team_id,
      coalesce(
        case when p_preserve_snapshots then existing.tier_key end,
        team.tier
      ) as tier_key,
      coalesce(
        case when p_preserve_snapshots then existing.goal_points end,
        season_tier.weekly_goal,
        0
      )::integer as goal_points,
      coalesce(
        case when p_preserve_snapshots then existing.streak_count end,
        streak.streak_count,
        0
      )::integer as streak_count,
      team.created_at
    from public.teams team
    left join public.team_week_results existing
      on existing.team_id = team.id and existing.week_id = v_week.id
    left join public.season_tiers season_tier
      on season_tier.season_id = team.season_id
     and season_tier.tier_key = coalesce(
       case when p_preserve_snapshots then existing.tier_key end,
       team.tier
     )
    left join public.team_streaks streak on streak.team_id = team.id
    where team.season_id = v_week.season_id
      and (
        (not p_preserve_snapshots and team.archived_at is null)
        or (
          p_preserve_snapshots
          and (
            existing.id is not null
            or exists (
              select 1
              from public.score_events participant_event
              where participant_event.team_id = team.id
                and participant_event.week_id = v_week.id
            )
          )
        )
      )
  ), scored as (
    select
      participant.*,
      coalesce((
        select sum(week_event.points)
        from public.score_events week_event
        where week_event.team_id = participant.team_id
          and week_event.week_id = v_week.id
      ), 0)::integer as points,
      coalesce((
        select sum(previous_event.points)
        from public.score_events previous_event
        join public.competition_weeks previous_week
          on previous_week.id = previous_event.week_id
        where previous_event.team_id = participant.team_id
          and previous_week.starts_on < v_week.starts_on
      ), 0)::integer as prior_points
    from participants participant
  ), ranked as (
    select
      scored.*,
      row_number() over (
        partition by scored.tier_key
        order by scored.points desc, scored.prior_points desc,
          scored.created_at, scored.team_id
      )::integer as team_rank
    from scored
  )
  insert into public.team_week_results (
    season_id, week_id, team_id, tier_key, points, goal_points,
    rank, won, streak_count, finalized_at
  )
  select
    v_week.season_id,
    v_week.id,
    ranked.team_id,
    ranked.tier_key,
    ranked.points,
    ranked.goal_points,
    ranked.team_rank,
    ranked.team_rank = 1 and ranked.points > 0,
    ranked.streak_count,
    now()
  from ranked
  on conflict (team_id, week_id) do update
  set tier_key = excluded.tier_key,
      points = excluded.points,
      goal_points = excluded.goal_points,
      rank = excluded.rank,
      won = excluded.won,
      streak_count = excluded.streak_count;

  get diagnostics v_result_count = row_count;
  return v_result_count;
end;
$$;

revoke all on function public.recalculate_week_results(uuid, boolean)
from public, anon, authenticated;

create or replace function public.finalize_competition_week(p_week_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_week public.competition_weeks%rowtype;
  v_job_id uuid;
  v_existing_status text;
  v_result_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin(auth.uid()) then
    raise exception 'Administrator or service role access required' using errcode = '42501';
  end if;

  select season.* into v_season
  from public.seasons season
  where season.id = public.current_season_id();
  if v_season.id is null then raise exception 'No current season configured'; end if;

  if p_week_id is null then
    p_week_id := public.ensure_competition_week(
      v_season.id,
      public.week_start((now() at time zone v_season.timezone)::date) - 7
    );
  end if;

  select week.* into v_week
  from public.competition_weeks week
  where week.id = p_week_id and week.season_id = v_season.id
  for update;
  if v_week.id is null then raise exception 'Competition week not found'; end if;

  if v_week.ends_on >= (now() at time zone v_season.timezone)::date
     and v_season.submissions_open then
    raise exception 'Only completed weeks can be finalized while submissions are open';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('finalize_week:' || v_week.id::text, 0));
  select job.status into v_existing_status
  from public.job_runs job
  where job.job_type = 'finalize_week' and job.deduplication_key = v_week.id::text
  for update;
  if v_existing_status = 'completed' then
    return jsonb_build_object(
      'status', 'already_finalized',
      'week_id', v_week.id,
      'label', v_week.label
    );
  end if;

  insert into public.job_runs (job_type, deduplication_key, status, started_at, attempt_count)
  values ('finalize_week', v_week.id::text, 'running', now(), 1)
  on conflict (job_type, deduplication_key) do update
  set status = 'running',
      started_at = now(),
      completed_at = null,
      error_message = null,
      attempt_count = public.job_runs.attempt_count + 1
  returning id into v_job_id;

  update public.competition_weeks
  set status = 'finalizing'
  where id = v_week.id;

  v_result_count := public.recalculate_week_results(v_week.id, false);

  update public.competition_weeks
  set status = 'finalized', finalized_at = now()
  where id = v_week.id;

  update public.job_runs
  set status = 'completed',
      completed_at = now(),
      metadata = jsonb_build_object(
        'week_id', v_week.id,
        'week_label', v_week.label,
        'result_count', v_result_count
      )
  where id = v_job_id;

  return jsonb_build_object(
    'status', 'completed',
    'week_id', v_week.id,
    'label', v_week.label,
    'result_count', v_result_count
  );
end;
$$;

create or replace function public.admin_update_submission_v2(
  p_submission_id uuid,
  p_team_id uuid,
  p_activity_key text,
  p_activity_date date,
  p_did_with_teammate boolean,
  p_value_number numeric default null,
  p_value_text text default null,
  p_value_bool boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_original public.submissions%rowtype;
  v_team public.teams%rowtype;
  v_activity public.activities%rowtype;
  v_rule public.scoring_rule_versions%rowtype;
  v_week_id uuid;
  v_units numeric;
  v_base_points integer;
  v_points integer;
begin
  perform public.assert_admin();

  select submission.* into v_original
  from public.submissions submission
  where submission.id = p_submission_id
    and submission.submission_kind = 'activity'
  for update;
  if v_original.id is null then raise exception 'Activity submission not found'; end if;

  select * into v_team from public.teams where id = p_team_id;
  if v_team.id is null then raise exception 'Team not found'; end if;

  select * into v_activity
  from public.activities where key = p_activity_key and archived_at is null;
  if v_activity.id is null then raise exception 'Invalid or archived activity'; end if;

  select * into v_rule
  from public.scoring_rule_versions
  where activity_id = v_activity.id and season_id = v_team.season_id and effective_to is null;
  if v_rule.id is null then raise exception 'No active scoring rule for this activity'; end if;

  if v_activity.measurement_type = 'number' then
    if p_value_number is null or p_value_number <= 0
      or (v_activity.min_value is not null and p_value_number < v_activity.min_value) then
      raise exception 'Invalid numeric activity value';
    end if;
    v_units := p_value_number;
  elsif v_activity.measurement_type = 'text' then
    if nullif(trim(p_value_text), '') is null then raise exception 'Activity details are required'; end if;
    v_units := 1;
  else
    if p_value_bool is distinct from true then raise exception 'Activity confirmation is required'; end if;
    v_units := 1;
  end if;

  v_week_id := public.ensure_competition_week(v_team.season_id, p_activity_date);
  v_base_points := greatest(1, floor(v_rule.points_per_unit * v_units)::integer);
  v_points := v_base_points;
  if coalesce(p_did_with_teammate, false) then
    v_points := greatest(1, floor(v_points * v_rule.teammate_multiplier)::integer);
  end if;

  update public.submissions
  set team_id = p_team_id,
      season_id = v_team.season_id,
      week_id = v_week_id,
      activity_id = v_activity.id,
      scoring_rule_version_id = v_rule.id,
      activity_key = p_activity_key,
      activity_date = p_activity_date,
      activity_value_number = case when v_activity.measurement_type = 'number' then p_value_number end,
      activity_value_text = case when v_activity.measurement_type = 'text' then trim(p_value_text) end,
      activity_value_bool = case when v_activity.measurement_type = 'boolean' then true end,
      points_per_unit = v_rule.points_per_unit,
      teammate_bonus = v_rule.teammate_multiplier,
      did_with_teammate = coalesce(p_did_with_teammate, false),
      base_points = v_base_points,
      points_awarded = v_points,
      voided_at = null
  where id = p_submission_id;

  if exists (
    select 1 from public.competition_weeks week
    where week.id = v_original.week_id and week.status = 'finalized'
  ) then
    perform public.recalculate_week_results(v_original.week_id, true);
  end if;

  if v_week_id is distinct from v_original.week_id and exists (
    select 1 from public.competition_weeks week
    where week.id = v_week_id and week.status = 'finalized'
  ) then
    perform public.recalculate_week_results(v_week_id, true);
  end if;
end;
$$;

create or replace function public.void_submission_v2(p_submission_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_week_id uuid;
begin
  perform public.assert_admin();

  select submission.proof_image_path, submission.week_id
  into v_path, v_week_id
  from public.submissions submission
  where submission.id = p_submission_id
  for update;
  if not found then raise exception 'Submission not found'; end if;

  update public.submissions
  set voided_at = coalesce(voided_at, now())
  where id = p_submission_id;

  update public.submission_attachments
  set deleted_at = coalesce(deleted_at, now())
  where submission_id = p_submission_id;

  if exists (
    select 1 from public.competition_weeks week
    where week.id = v_week_id and week.status = 'finalized'
  ) then
    perform public.recalculate_week_results(v_week_id, true);
  end if;

  return v_path;
end;
$$;

do $$
declare
  v_week_id uuid;
begin
  for v_week_id in
    select distinct result.week_id
    from public.team_week_results result
    where result.points <> coalesce((
      select sum(event.points)
      from public.score_events event
      where event.team_id = result.team_id
        and event.week_id = result.week_id
    ), 0)
  loop
    perform public.recalculate_week_results(v_week_id, true);
  end loop;
end;
$$;

commit;
