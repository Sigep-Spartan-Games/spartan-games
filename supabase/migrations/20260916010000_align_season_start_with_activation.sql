begin;

-- A season may be created early for registration. Its authoritative start date
-- is the local calendar day when an administrator actually starts the games.
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
  v_next_status text;
  v_activation_date date;
begin
  perform public.assert_admin();

  if p_status is not null
     and p_status not in ('draft', 'registration', 'active', 'completed') then
    raise exception 'Invalid season status';
  end if;

  select season.* into v_season
  from public.seasons season
  where season.id = public.current_season_id()
  for update;

  if v_season.id is null then
    raise exception 'No current season configured';
  end if;

  if p_status = 'completed' then
    if p_registration_open is true or p_submissions_open is true then
      raise exception 'A completed season cannot have registration or submissions open';
    end if;
    return public.close_current_season_v2();
  end if;

  if v_season.status = 'finalizing' then
    raise exception 'Resolve champion ties before changing season controls';
  end if;

  if v_season.status = 'completed' then
    raise exception 'Completed seasons cannot be reopened; start a new season instead';
  end if;

  v_next_status := coalesce(p_status, v_season.status);
  if v_next_status <> v_season.status and not (
    (v_season.status = 'draft' and v_next_status = 'registration')
    or (v_season.status = 'registration' and v_next_status = 'active')
  ) then
    raise exception 'Invalid season transition from % to %',
      v_season.status, v_next_status;
  end if;

  if v_next_status = 'registration' and p_submissions_open is true then
    raise exception 'Start the games before opening submissions';
  end if;

  if p_status = 'active'
     and (p_registration_open is false or p_submissions_open is false) then
    raise exception 'Starting the games must keep registration and submissions open';
  end if;

  if v_season.status = 'registration' and v_next_status = 'active' then
    v_activation_date := (now() at time zone v_season.timezone)::date;
  end if;

  update public.seasons season
  set registration_open = case
        when p_status = 'active' then true
        else coalesce(p_registration_open, season.registration_open)
      end,
      submissions_open = case
        when p_status = 'active' then true
        else coalesce(p_submissions_open, season.submissions_open)
      end,
      status = v_next_status,
      starts_on = coalesce(v_activation_date, season.starts_on),
      ends_on = case when p_status = 'active' then null else season.ends_on end
  where season.id = v_season.id
  returning season.* into v_season;

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', v_season.status,
    'starts_on', v_season.starts_on,
    'registration_open', v_season.registration_open,
    'submissions_open', v_season.submissions_open
  );
end;
$$;

-- Enforce the boundary for every write path, including future RPCs and direct
-- administrative edits, rather than relying only on the submission UI.
create or replace function public.guard_submission_on_or_after_season_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_starts_on date;
begin
  select season.starts_on into v_starts_on
  from public.seasons season
  where season.id = new.season_id;

  if v_starts_on is null then
    raise exception 'Submission season was not found';
  end if;

  if new.activity_date < v_starts_on then
    raise exception 'Activity date cannot be before the season start date';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_submission_on_or_after_season_start()
from public, anon, authenticated;

drop trigger if exists submissions_guard_season_start on public.submissions;
create trigger submissions_guard_season_start
before insert or update of season_id, activity_date on public.submissions
for each row execute function public.guard_submission_on_or_after_season_start();

-- A daily run before the first season week has ended should be an idempotent
-- no-op and must not create an empty pre-season competition week.
create or replace function public.finalize_competition_week(p_week_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_week public.competition_weeks%rowtype;
  v_target_start date;
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
    if v_season.status <> 'active' then
      return jsonb_build_object(
        'status', 'season_not_active',
        'season_id', v_season.id
      );
    end if;

    v_target_start := public.week_start(
      (now() at time zone v_season.timezone)::date
    ) - 7;

    if v_target_start + 6 < v_season.starts_on then
      return jsonb_build_object(
        'status', 'before_season',
        'season_id', v_season.id,
        'target_week_start', v_target_start,
        'season_starts_on', v_season.starts_on
      );
    end if;

    p_week_id := public.ensure_competition_week(v_season.id, v_target_start);
  end if;

  select week.* into v_week
  from public.competition_weeks week
  where week.id = p_week_id and week.season_id = v_season.id
  for update;
  if v_week.id is null then raise exception 'Competition week not found'; end if;

  if v_week.ends_on < v_season.starts_on then
    return jsonb_build_object(
      'status', 'before_season',
      'season_id', v_season.id,
      'week_id', v_week.id,
      'label', v_week.label,
      'season_starts_on', v_season.starts_on
    );
  end if;

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

commit;
