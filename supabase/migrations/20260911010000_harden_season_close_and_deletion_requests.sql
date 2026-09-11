-- Keep weekly results season-safe through team archival and make season closure
-- and approved deletion requests complete their dependent work atomically.

begin;

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

  select s.* into v_season
  from public.seasons s
  where s.id = public.current_season_id();
  if v_season.id is null then raise exception 'No current season configured'; end if;

  if p_week_id is null then
    p_week_id := public.ensure_competition_week(
      v_season.id,
      public.week_start((now() at time zone v_season.timezone)::date) - 7
    );
  end if;

  select cw.* into v_week
  from public.competition_weeks cw
  where cw.id = p_week_id and cw.season_id = v_season.id
  for update;
  if v_week.id is null then raise exception 'Competition week not found'; end if;

  -- A normal manual/cron run may only finalize a completed week. Season close
  -- first locks the season and closes submissions, which safely permits the
  -- current partial week to become the final immutable result.
  if v_week.ends_on >= (now() at time zone v_season.timezone)::date
     and v_season.submissions_open then
    raise exception 'Only completed weeks can be finalized while submissions are open';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('finalize_week:' || v_week.id::text, 0));
  select jr.status into v_existing_status
  from public.job_runs jr
  where jr.job_type = 'finalize_week' and jr.deduplication_key = v_week.id::text
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

  with scored as (
    select
      t.id as team_id,
      t.tier as tier_key,
      coalesce(sum(se.points), 0)::integer as points,
      coalesce(st.weekly_goal, 0)::integer as goal_points,
      coalesce(ts.streak_count, 0)::integer as streak_count,
      coalesce((
        select sum(previous.points)
        from public.score_events previous
        join public.competition_weeks previous_week on previous_week.id = previous.week_id
        where previous.team_id = t.id and previous_week.starts_on < v_week.starts_on
      ), 0)::integer as prior_points,
      t.created_at
    from public.teams t
    left join public.score_events se on se.team_id = t.id and se.week_id = v_week.id
    left join public.season_tiers st on st.season_id = t.season_id and st.tier_key = t.tier
    left join public.team_streaks ts on ts.team_id = t.id
    where t.season_id = v_season.id
      and t.archived_at is null
    group by t.id, t.tier, st.weekly_goal, ts.streak_count
  ), ranked as (
    select
      scored.*,
      row_number() over (
        partition by tier_key
        order by points desc, prior_points desc, created_at, team_id
      )::integer as team_rank
    from scored
  )
  insert into public.team_week_results (
    season_id, week_id, team_id, tier_key, points, goal_points,
    rank, won, streak_count, finalized_at
  )
  select
    v_season.id, v_week.id, r.team_id, r.tier_key, r.points, r.goal_points,
    r.team_rank, (r.team_rank = 1 and r.points > 0), r.streak_count, now()
  from ranked r
  on conflict (team_id, week_id) do update
  set tier_key = excluded.tier_key,
      points = excluded.points,
      goal_points = excluded.goal_points,
      rank = excluded.rank,
      won = excluded.won,
      streak_count = excluded.streak_count,
      finalized_at = excluded.finalized_at;

  get diagnostics v_result_count = row_count;

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

create or replace function public.close_current_season_v2()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_today date;
  v_week_start date;
  v_week_id uuid;
  v_result jsonb;
  v_finalized_count integer := 0;
  v_already_finalized_count integer := 0;
begin
  perform public.assert_admin();

  select s.* into v_season
  from public.seasons s
  where s.id = public.current_season_id()
  for update;
  if v_season.id is null then raise exception 'No current season configured'; end if;

  if v_season.status = 'completed' then
    return jsonb_build_object(
      'season_id', v_season.id,
      'status', 'already_completed',
      'registration_open', v_season.registration_open,
      'submissions_open', v_season.submissions_open,
      'weeks_finalized', 0,
      'weeks_already_finalized', 0
    );
  end if;

  v_today := (now() at time zone v_season.timezone)::date;

  -- Holding the season row lock coordinates with submission creation, which
  -- locks the same row before accepting activity data. The switch is therefore
  -- closed before any final result is calculated.
  update public.seasons
  set registration_open = false,
      submissions_open = false
  where id = v_season.id;

  if v_season.status = 'active' and v_today >= v_season.starts_on then
    for v_week_start in
      select generated.week_start::date
      from generate_series(
        public.week_start(v_season.starts_on)::timestamp,
        public.week_start(v_today)::timestamp,
        interval '7 days'
      ) as generated(week_start)
      order by generated.week_start
    loop
      v_week_id := public.ensure_competition_week(v_season.id, v_week_start);
      v_result := public.finalize_competition_week(v_week_id);

      if v_result->>'status' = 'completed' then
        v_finalized_count := v_finalized_count + 1;
      elsif v_result->>'status' = 'already_finalized' then
        v_already_finalized_count := v_already_finalized_count + 1;
      end if;
    end loop;
  end if;

  update public.seasons
  set status = 'completed',
      registration_open = false,
      submissions_open = false,
      ends_on = coalesce(ends_on, v_today)
  where id = v_season.id
  returning * into v_season;

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', v_season.status,
    'registration_open', v_season.registration_open,
    'submissions_open', v_season.submissions_open,
    'ends_on', v_season.ends_on,
    'weeks_finalized', v_finalized_count,
    'weeks_already_finalized', v_already_finalized_count
  );
end;
$$;

revoke all on function public.close_current_season_v2() from public, anon;
grant execute on function public.close_current_season_v2() to authenticated;

create or replace function public.set_season_controls_v2(
  p_registration_open boolean default null,
  p_submissions_open boolean default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
begin
  perform public.assert_admin();
  if p_status is not null and p_status not in ('draft', 'registration', 'active', 'completed') then
    raise exception 'Invalid season status';
  end if;

  -- Preserve the old stable API while routing every completion through the
  -- coordinated close workflow. This prevents older callers from bypassing it.
  if p_status = 'completed' then
    if p_registration_open is true or p_submissions_open is true then
      raise exception 'A completed season cannot have registration or submissions open';
    end if;
    return public.close_current_season_v2();
  end if;

  update public.seasons s
  set registration_open = coalesce(p_registration_open, s.registration_open),
      submissions_open = coalesce(p_submissions_open, s.submissions_open),
      status = coalesce(p_status, s.status),
      ends_on = case when p_status = 'active' then null else s.ends_on end
  where s.id = public.current_season_id()
  returning s.* into v_season;

  if v_season.id is null then raise exception 'No current season configured'; end if;

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', v_season.status,
    'registration_open', v_season.registration_open,
    'submissions_open', v_season.submissions_open
  );
end;
$$;

create or replace function public.start_new_season_v2(
  p_name text,
  p_starts_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_id uuid := public.current_season_id();
  v_previous_status text;
  v_new_id uuid;
  v_slug text;
  v_timezone text := 'America/New_York';
  v_increment integer := 1;
  v_max_bonus integer := 10;
begin
  perform public.assert_admin();
  if nullif(trim(p_name), '') is null then raise exception 'Season name is required'; end if;

  if v_previous_id is not null then
    select timezone, daily_bonus_increment, max_streak_bonus, status
    into v_timezone, v_increment, v_max_bonus, v_previous_status
    from public.seasons
    where id = v_previous_id
    for update;

    if v_previous_status <> 'completed' then
      perform public.close_current_season_v2();
    end if;

    update public.seasons
    set status = 'completed',
        registration_open = false,
        submissions_open = false,
        ends_on = coalesce(ends_on, p_starts_on - 1),
        archived_at = coalesce(archived_at, now())
    where id = v_previous_id;

    update public.teams
    set archived_at = coalesce(archived_at, now())
    where season_id = v_previous_id;
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'))
    || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');

  insert into public.seasons (
    slug, name, status, timezone, starts_on, registration_open, submissions_open,
    daily_bonus_increment, max_streak_bonus
  ) values (
    v_slug, trim(p_name), 'registration', v_timezone, p_starts_on, true, false,
    v_increment, v_max_bonus
  ) returning id into v_new_id;

  if v_previous_id is not null then
    insert into public.season_tiers (season_id, tier_key, weekly_goal)
    select v_new_id, st.tier_key, st.weekly_goal
    from public.season_tiers st
    where st.season_id = v_previous_id;

    insert into public.scoring_rule_versions (
      activity_id, season_id, points_per_unit, teammate_multiplier,
      weekly_cap_points, effective_from, created_by
    )
    select rv.activity_id, v_new_id, rv.points_per_unit, rv.teammate_multiplier,
      rv.weekly_cap_points, now(), auth.uid()
    from public.scoring_rule_versions rv
    where rv.season_id = v_previous_id and rv.effective_to is null;
  end if;

  return v_new_id;
end;
$$;

create or replace function public.resolve_submission_edit_request_v2(
  p_request_id uuid,
  p_status text,
  p_resolution_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.submission_edit_requests%rowtype;
begin
  perform public.assert_admin();
  if p_status not in ('approved', 'rejected') then raise exception 'Invalid resolution status'; end if;

  select request.* into v_request
  from public.submission_edit_requests request
  where request.id = p_request_id and request.status = 'pending'
  for update;
  if v_request.id is null then raise exception 'Pending edit request not found'; end if;

  if p_status = 'approved' and v_request.request_type = 'delete' then
    perform public.void_submission_v2(v_request.submission_id);
  end if;

  update public.submission_edit_requests
  set status = p_status,
      resolved_by = auth.uid(),
      resolved_at = now(),
      resolution_note = coalesce(
        nullif(trim(p_resolution_note), ''),
        case
          when p_status = 'approved' and v_request.request_type = 'delete'
            then 'Submission voided by approved deletion request'
        end
      ),
      updated_at = now()
  where id = v_request.id;
end;
$$;

-- Repair deletion requests approved before approval and voiding were made one
-- transaction. Updating submissions invokes the existing ledger trigger.
update public.submissions submission
set voided_at = coalesce(submission.voided_at, request.resolved_at, now())
from public.submission_edit_requests request
where request.submission_id = submission.id
  and request.request_type = 'delete'
  and request.status = 'approved'
  and submission.voided_at is null;

update public.submission_attachments attachment
set deleted_at = coalesce(attachment.deleted_at, request.resolved_at, now()),
    last_cleanup_error = null
from public.submission_edit_requests request
where request.submission_id = attachment.submission_id
  and request.request_type = 'delete'
  and request.status = 'approved'
  and attachment.deleted_at is null;

update public.submission_edit_requests
set resolution_note = coalesce(
      resolution_note,
      'Submission voided by deletion-request workflow repair'
    ),
    updated_at = now()
where request_type = 'delete' and status = 'approved';

comment on function public.close_current_season_v2() is
  'Atomically closes submissions, finalizes every season week including the current partial week, and completes the current season.';

commit;
