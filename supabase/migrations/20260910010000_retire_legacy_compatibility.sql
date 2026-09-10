-- Remove the legacy compatibility layer after every application read has moved
-- to the normalized model. Public RPC signatures remain stable; only their
-- implementations and storage targets change.

begin;

create or replace function public.create_team_v2(p_name text, p_tier_key text)
returns table(team_id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_season public.seasons%rowtype;
  v_team_id uuid;
  v_code text;
  v_display_name text;
  attempts integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 40 then
    raise exception 'Team name must be between 2 and 40 characters';
  end if;

  select s.* into v_season
  from public.seasons s
  where s.id = public.current_season_id()
  for update;

  if v_season.id is null or not v_season.registration_open then
    raise exception 'Team registration is closed';
  end if;
  if not exists (
    select 1 from public.season_tiers st
    where st.season_id = v_season.id and st.tier_key = lower(trim(p_tier_key))
  ) then
    raise exception 'Invalid tier';
  end if;
  if exists (
    select 1 from public.team_memberships tm
    where tm.season_id = v_season.id and tm.user_id = v_uid and tm.left_at is null
  ) then
    raise exception 'You already belong to a team in this season';
  end if;

  select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Member')
  into v_display_name
  from public.profiles p
  where p.id = v_uid;
  v_display_name := coalesce(v_display_name, auth.jwt()->>'email', 'Member');

  loop
    attempts := attempts + 1;
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    exit when not exists (select 1 from public.teams t where t.invite_code = v_code);
    if attempts >= 10 then
      raise exception 'Unable to allocate a unique invite code';
    end if;
  end loop;

  insert into public.teams (name, invite_code, tier, season_id)
  values (trim(p_name), v_code, lower(trim(p_tier_key)), v_season.id)
  returning id into v_team_id;

  insert into public.team_memberships (
    team_id, season_id, user_id, role, display_name_snapshot
  ) values (
    v_team_id, v_season.id, v_uid, 'captain', v_display_name
  );

  insert into public.team_streaks (team_id) values (v_team_id);

  return query select v_team_id, v_code;
end;
$$;

create or replace function public.create_activity_submission_v2(
  p_team_id uuid,
  p_activity_key text,
  p_activity_date date,
  p_did_with_teammate boolean,
  p_value_number numeric default null,
  p_value_text text default null,
  p_value_bool boolean default null,
  p_proof_path text default null,
  p_proof_mime text default null,
  p_proof_size integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team record;
  v_activity public.activities%rowtype;
  v_rule public.scoring_rule_versions%rowtype;
  v_week_id uuid;
  v_today date;
  v_units numeric;
  v_base_points integer;
  v_points integer;
  v_current_cap_points integer;
  v_submission_id uuid;
  v_submitter_name text;
  v_streak public.team_streaks%rowtype;
  v_new_streak integer;
  v_bonus integer := 0;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;

  select t.*, s.timezone, s.submissions_open, s.daily_bonus_increment, s.max_streak_bonus
  into v_team
  from public.teams t
  join public.seasons s on s.id = t.season_id
  where t.id = p_team_id and t.archived_at is null
  for update of t, s;

  if v_team.id is null then raise exception 'Team not found'; end if;
  if not v_team.submissions_open then raise exception 'Submissions are closed'; end if;
  if not exists (
    select 1 from public.team_memberships tm
    where tm.team_id = p_team_id and tm.user_id = v_uid and tm.left_at is null
  ) then raise exception 'You are not an active member of this team' using errcode = '42501'; end if;

  v_today := (now() at time zone v_team.timezone)::date;
  if p_activity_date > v_today
    or p_activity_date < public.week_start(v_today)
    or p_activity_date >= public.week_start(v_today) + 7 then
    raise exception 'Date is not in the current active week';
  end if;

  select a.* into v_activity
  from public.activities a
  where a.key = p_activity_key and a.archived_at is null;
  if v_activity.id is null then raise exception 'Invalid or archived activity'; end if;

  select rv.* into v_rule
  from public.scoring_rule_versions rv
  where rv.activity_id = v_activity.id
    and rv.season_id = v_team.season_id
    and rv.effective_to is null
  for share;
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

  if p_proof_path is not null then
    if p_proof_path not like v_uid::text || '/%' then
      raise exception 'Invalid proof object path' using errcode = '42501';
    end if;
    if p_proof_mime is null or p_proof_mime not like 'image/%' then
      raise exception 'Proof attachment must be an image';
    end if;
    if p_proof_size is null or p_proof_size <= 0 or p_proof_size > 10485760 then
      raise exception 'Proof attachment must be 10 MB or smaller';
    end if;
  end if;

  v_week_id := public.ensure_competition_week(v_team.season_id, p_activity_date);
  perform pg_advisory_xact_lock(hashtextextended(p_team_id::text || ':' || v_activity.id::text || ':' || v_week_id::text, 0));

  v_base_points := greatest(1, floor(v_rule.points_per_unit * v_units)::integer);
  v_points := v_base_points;
  if coalesce(p_did_with_teammate, false) then
    v_points := greatest(1, floor(v_points * v_rule.teammate_multiplier)::integer);
  end if;

  if v_rule.weekly_cap_points is not null then
    select coalesce(sum(se.points), 0)::integer into v_current_cap_points
    from public.score_events se
    where se.team_id = p_team_id
      and se.week_id = v_week_id
      and se.activity_id = v_activity.id
      and se.event_type = 'activity';
    if v_current_cap_points + v_points > v_rule.weekly_cap_points then
      raise exception 'This submission would exceed the % point weekly cap', v_rule.weekly_cap_points;
    end if;
  end if;

  select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Member')
  into v_submitter_name from public.profiles p where p.id = v_uid;
  v_submitter_name := coalesce(v_submitter_name, auth.jwt()->>'email', 'Member');

  insert into public.submissions (
    team_id, submitted_by, submitted_by_name, base_points,
    did_with_teammate, multiplier, points_awarded, activity_key, activity_date,
    activity_value_number, activity_value_text, activity_value_bool,
    points_per_unit, teammate_bonus, streak_bonus,
    proof_image_path, season_id, week_id, activity_id,
    scoring_rule_version_id, submission_kind
  ) values (
    p_team_id, v_uid, v_submitter_name, v_base_points,
    coalesce(p_did_with_teammate, false), 1, v_points, p_activity_key, p_activity_date,
    case when v_activity.measurement_type = 'number' then p_value_number end,
    case when v_activity.measurement_type = 'text' then trim(p_value_text) end,
    case when v_activity.measurement_type = 'boolean' then true end,
    v_rule.points_per_unit, v_rule.teammate_multiplier, 0,
    p_proof_path, v_team.season_id, v_week_id, v_activity.id,
    v_rule.id, 'activity'
  ) returning id into v_submission_id;

  insert into public.team_streaks (team_id) values (p_team_id) on conflict (team_id) do nothing;
  select * into v_streak from public.team_streaks where team_id = p_team_id for update;
  v_new_streak := v_streak.streak_count;

  if v_streak.last_activity_date is null then
    v_new_streak := 1;
    v_bonus := least(v_team.daily_bonus_increment, v_team.max_streak_bonus);
  elsif p_activity_date = v_streak.last_activity_date + 1 then
    v_new_streak := v_streak.streak_count + 1;
    v_bonus := least(v_new_streak * v_team.daily_bonus_increment, v_team.max_streak_bonus);
  elsif p_activity_date > v_streak.last_activity_date + 1 then
    v_new_streak := 1;
    v_bonus := least(v_team.daily_bonus_increment, v_team.max_streak_bonus);
  end if;

  if v_streak.last_activity_date is null or p_activity_date > v_streak.last_activity_date then
    update public.team_streaks
    set streak_count = v_new_streak, last_activity_date = p_activity_date
    where team_id = p_team_id;
  end if;

  if v_bonus > 0 then
    insert into public.score_events (
      season_id, week_id, team_id, actor_id, event_type,
      source_submission_id, points, metadata
    ) values (
      v_team.season_id, v_week_id, p_team_id, v_uid, 'streak_bonus',
      v_submission_id, v_bonus,
      jsonb_build_object('streak_count', v_new_streak, 'daily_bonus_increment', v_team.daily_bonus_increment)
    );
  end if;

  if p_proof_path is not null then
    insert into public.submission_attachments (
      submission_id, uploaded_by, object_path, mime_type, size_bytes
    ) values (
      v_submission_id, v_uid, p_proof_path, p_proof_mime, p_proof_size
    ) on conflict (object_path) do update
      set submission_id = excluded.submission_id,
          uploaded_by = excluded.uploaded_by,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes,
          deleted_at = null,
          last_cleanup_error = null;
  end if;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'activity_points', v_points,
    'streak_bonus', v_bonus,
    'total_points', v_points + v_bonus
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
  v_team public.teams%rowtype;
  v_activity public.activities%rowtype;
  v_rule public.scoring_rule_versions%rowtype;
  v_week_id uuid;
  v_units numeric;
  v_base_points integer;
  v_points integer;
begin
  perform public.assert_admin();

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
  where id = p_submission_id and submission_kind = 'activity';
  if not found then raise exception 'Activity submission not found'; end if;
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
  v_request_id uuid;
  v_request_type text;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'A reason is required'; end if;
  if p_suggested_changes is null or jsonb_typeof(p_suggested_changes) <> 'object' then
    raise exception 'Suggested changes must be a JSON object';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_suggested_changes) key
    where key not in (
      'activity_key', 'activity_date', 'activity_units', 'activity_value_text',
      'activity_value_bool', 'did_with_teammate', 'is_deletion'
    )
  ) then raise exception 'Suggested changes contain unsupported fields'; end if;

  select s.team_id into v_team_id
  from public.submissions s
  where s.id = p_submission_id
    and s.submitted_by = v_uid
    and s.submission_kind = 'activity'
    and s.voided_at is null;
  if v_team_id is null then raise exception 'Submission not found or not owned by requester' using errcode = '42501'; end if;

  v_request_type := case when coalesce((p_suggested_changes->>'is_deletion')::boolean, false) then 'delete' else 'edit' end;
  insert into public.submission_edit_requests (
    submission_id, user_id, suggested_changes, reason, status, request_type
  ) values (
    p_submission_id, v_uid, p_suggested_changes, trim(p_reason), 'pending', v_request_type
  ) returning id into v_request_id;
  return v_request_id;
exception
  when unique_violation then raise exception 'A pending request already exists for this submission';
end;
$$;

create or replace function public.join_team_by_code_v2(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_registration_open boolean;
  v_display_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select t.* into v_team
  from public.teams t
  where t.invite_code = upper(trim(p_code))
    and t.archived_at is null
    and t.season_id = public.current_season_id()
  for update;

  if v_team.id is null then
    raise exception 'Invalid invite code';
  end if;

  select s.registration_open into v_registration_open
  from public.seasons s where s.id = v_team.season_id;
  if not coalesce(v_registration_open, false) then
    raise exception 'Team registration is closed';
  end if;
  if exists (
    select 1 from public.team_memberships tm
    where tm.season_id = v_team.season_id and tm.user_id = v_uid and tm.left_at is null
  ) then
    raise exception 'You already belong to a team in this season';
  end if;
  if (select count(*) from public.team_memberships tm where tm.team_id = v_team.id and tm.left_at is null) >= 2 then
    raise exception 'Team is full';
  end if;

  select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Member')
  into v_display_name
  from public.profiles p where p.id = v_uid;
  v_display_name := coalesce(v_display_name, auth.jwt()->>'email', 'Member');

  insert into public.team_memberships (
    team_id, season_id, user_id, role, display_name_snapshot
  ) values (
    v_team.id, v_team.season_id, v_uid, 'member', v_display_name
  );

  return v_team.id;
end;
$$;

create or replace function public.get_my_team_v2()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'season_id', t.season_id,
    'name', t.name,
    'tier', t.tier,
    'invite_code', t.invite_code,
    'role', tm.role,
    'weekly_points', coalesce(standings.weekly_points, 0),
    'total_points', coalesce(standings.season_points, 0),
    'streak_count', coalesce(standings.streak_count, 0),
    'last_activity_date', standings.last_activity_date
  )
  from public.team_memberships tm
  join public.teams t on t.id = tm.team_id and t.archived_at is null
  left join public.team_standings standings on standings.id = t.id
  where tm.user_id = auth.uid()
    and tm.left_at is null
    and tm.season_id = public.current_season_id()
  limit 1;
$$;

create or replace function public.leave_team_v2(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_membership public.team_memberships%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  perform 1 from public.teams where id = p_team_id for update;
  select tm.* into v_membership
  from public.team_memberships tm
  where tm.team_id = p_team_id and tm.user_id = v_uid and tm.left_at is null
  for update;

  if v_membership.id is null then
    raise exception 'You are not an active member of this team';
  end if;

  update public.team_memberships
  set left_at = now()
  where id = v_membership.id;

  if v_membership.role = 'captain' then
    update public.team_memberships
    set role = 'captain'
    where id = (
      select tm.id
      from public.team_memberships tm
      where tm.team_id = p_team_id and tm.left_at is null
      order by tm.joined_at, tm.id
      limit 1
    );
  end if;

  update public.teams
  set archived_at = coalesce(archived_at, now())
  where id = p_team_id
    and not exists (
      select 1 from public.team_memberships tm
      where tm.team_id = p_team_id and tm.left_at is null
    );
end;
$$;

create or replace function public.archive_team_v2(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.team_memberships
  set left_at = coalesce(left_at, now())
  where team_id = p_team_id;
  update public.teams
  set archived_at = coalesce(archived_at, now())
  where id = p_team_id;
  if not found then raise exception 'Team not found'; end if;
end;
$$;

create or replace function public.save_activity_rule_v2(
  p_activity_key text,
  p_label text,
  p_measurement_type text,
  p_unit_label text,
  p_description text,
  p_min_value numeric,
  p_step_value numeric,
  p_points_per_unit numeric,
  p_teammate_multiplier numeric,
  p_weekly_cap_points integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_season_id uuid := public.current_season_id();
  v_version_id uuid;
begin
  perform public.assert_admin();
  if p_activity_key is null or lower(trim(p_activity_key)) !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'Invalid activity key';
  end if;
  if p_measurement_type not in ('number', 'text', 'boolean') then raise exception 'Invalid measurement type'; end if;
  if p_points_per_unit <= 0 then raise exception 'Points per unit must be positive'; end if;
  if p_teammate_multiplier <= 0 then raise exception 'Teammate multiplier must be positive'; end if;
  if p_weekly_cap_points is not null and p_weekly_cap_points <= 0 then raise exception 'Weekly cap must be positive'; end if;

  insert into public.activities (
    key, label, measurement_type, unit_label, description, min_value, step_value, archived_at
  ) values (
    lower(trim(p_activity_key)), coalesce(nullif(trim(p_label), ''), lower(trim(p_activity_key))),
    p_measurement_type, nullif(trim(p_unit_label), ''), nullif(trim(p_description), ''),
    p_min_value, p_step_value, null
  )
  on conflict (key) do update
  set label = excluded.label,
      measurement_type = excluded.measurement_type,
      unit_label = excluded.unit_label,
      description = excluded.description,
      min_value = excluded.min_value,
      step_value = excluded.step_value,
      archived_at = null
  returning id into v_activity_id;

  update public.scoring_rule_versions
  set effective_to = clock_timestamp()
  where activity_id = v_activity_id and season_id = v_season_id and effective_to is null;

  insert into public.scoring_rule_versions (
    activity_id, season_id, points_per_unit, teammate_multiplier,
    weekly_cap_points, effective_from, created_by
  ) values (
    v_activity_id, v_season_id, p_points_per_unit, p_teammate_multiplier,
    p_weekly_cap_points, clock_timestamp(), auth.uid()
  ) returning id into v_version_id;

  return v_version_id;
end;
$$;

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

  update public.seasons s
  set registration_open = coalesce(p_registration_open, s.registration_open),
      submissions_open = coalesce(p_submissions_open, s.submissions_open),
      status = coalesce(p_status, s.status),
      ends_on = case
        when p_status = 'completed' then coalesce(s.ends_on, (now() at time zone s.timezone)::date)
        when p_status = 'active' then null
        else s.ends_on
      end
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

create or replace function public.update_streak_settings_v2(
  p_daily_bonus_increment integer,
  p_max_streak_bonus integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_daily_bonus_increment < 0 or p_max_streak_bonus < 0 then
    raise exception 'Streak settings cannot be negative';
  end if;

  update public.seasons
  set daily_bonus_increment = p_daily_bonus_increment,
      max_streak_bonus = p_max_streak_bonus
  where id = public.current_season_id();
  if not found then raise exception 'No current season configured'; end if;
end;
$$;

create or replace function public.update_tier_goals_v2(
  p_gold integer,
  p_purple integer,
  p_red integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id uuid := public.current_season_id();
begin
  perform public.assert_admin();
  if p_gold < 0 or p_purple < 0 or p_red < 0 then
    raise exception 'Tier goals cannot be negative';
  end if;
  if v_season_id is null then raise exception 'No current season configured'; end if;

  insert into public.season_tiers (season_id, tier_key, weekly_goal)
  values
    (v_season_id, 'gold', p_gold),
    (v_season_id, 'purple', p_purple),
    (v_season_id, 'red', p_red)
  on conflict (season_id, tier_key) do update
  set weekly_goal = excluded.weekly_goal;
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
  v_new_id uuid;
  v_slug text;
  v_timezone text := 'America/New_York';
  v_increment integer := 1;
  v_max_bonus integer := 10;
begin
  perform public.assert_admin();
  if nullif(trim(p_name), '') is null then raise exception 'Season name is required'; end if;

  if v_previous_id is not null then
    select timezone, daily_bonus_increment, max_streak_bonus
    into v_timezone, v_increment, v_max_bonus
    from public.seasons where id = v_previous_id for update;

    update public.seasons
    set status = 'completed', registration_open = false, submissions_open = false,
        ends_on = coalesce(ends_on, p_starts_on - 1), archived_at = now()
    where id = v_previous_id;
    update public.teams set archived_at = coalesce(archived_at, now()) where season_id = v_previous_id;
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
    from public.season_tiers st where st.season_id = v_previous_id;

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

create or replace function public.archive_activity_v2(p_activity_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.activities
  set archived_at = coalesce(archived_at, now())
  where key = p_activity_key;
  if not found then raise exception 'Activity not found'; end if;
  update public.scoring_rule_versions rv
  set effective_to = now()
  from public.activities a
  where a.id = rv.activity_id and a.key = p_activity_key and rv.effective_to is null;
end;
$$;

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

  select s.* into v_season from public.seasons s where s.id = public.current_season_id();
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
  if v_week.ends_on >= (now() at time zone v_season.timezone)::date then
    raise exception 'Only completed weeks can be finalized';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('finalize_week:' || v_week.id::text, 0));
  select jr.status into v_existing_status
  from public.job_runs jr
  where jr.job_type = 'finalize_week' and jr.deduplication_key = v_week.id::text
  for update;
  if v_existing_status = 'completed' then
    return jsonb_build_object('status', 'already_finalized', 'week_id', v_week.id, 'label', v_week.label);
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

  update public.competition_weeks set status = 'finalizing' where id = v_week.id;

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
      metadata = jsonb_build_object('week_id', v_week.id, 'week_label', v_week.label, 'result_count', v_result_count)
  where id = v_job_id;

  return jsonb_build_object(
    'status', 'completed',
    'week_id', v_week.id,
    'label', v_week.label,
    'result_count', v_result_count
  );
end;
$$;

create or replace function public.handle_user_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    for v_team_id in
      select distinct tm.team_id
      from public.team_memberships tm
      where tm.user_id = new.id and tm.left_at is null
    loop
      update public.team_memberships
      set left_at = now()
      where team_id = v_team_id and user_id = new.id and left_at is null;

      update public.team_memberships
      set role = 'captain'
      where id = (
        select tm.id from public.team_memberships tm
        where tm.team_id = v_team_id and tm.left_at is null
        order by tm.joined_at, tm.id limit 1
      );

      update public.teams
      set archived_at = coalesce(archived_at, now())
      where id = v_team_id
        and not exists (
          select 1 from public.team_memberships tm
          where tm.team_id = v_team_id and tm.left_at is null
        );
    end loop;
    delete from public.profiles where id = new.id;
  end if;
  return new;
end;
$$;

-- Keep the transitional view contract while sourcing every computed field
-- from the canonical standings view.
create or replace view public.active_teams
with (security_invoker = true)
as
select
  standings.id,
  standings.season_id,
  standings.name,
  standings.tier,
  standings.created_at,
  standings.weekly_points,
  standings.season_points as total_points,
  standings.streak_count,
  standings.last_activity_date
from public.team_standings standings
where standings.archived_at is null
  and standings.season_id = public.current_season_id();

drop trigger if exists score_events_project_points on public.score_events;
drop function if exists public.score_event_projection_trigger();
drop function if exists public.rebuild_team_point_projection(uuid);
drop function if exists public.sync_legacy_team_members(uuid);

drop table public.weekly_history;
drop table public.activity_rules;
drop table public.game_settings;
drop table public.streak_settings;
drop table public.tier_settings;

alter table public.teams
  drop constraint if exists teams_points_nonnegative,
  drop column member1_id,
  drop column member1_name,
  drop column member2_id,
  drop column member2_name,
  drop column weekly_points,
  drop column total_points,
  drop column weeks_won,
  drop column streak_count,
  drop column last_activity_date;

alter table public.submissions
  drop column activity,
  drop column activity_units;

alter table public.submission_edit_requests
  drop column team_id;

drop function if exists public.date_array_is_unique(date[]);
drop function if exists public.touch_updated_at();
drop function if exists public.touch_game_settings_updated_at();
drop function if exists public.update_tier_settings_updated_at();

revoke select on table public.teams from anon, authenticated;
grant select (id, season_id, name, created_at, tier, archived_at)
on public.teams to authenticated;
grant all on table public.teams to service_role;

comment on table public.team_memberships is
  'Canonical team roster. Active members have left_at IS NULL; roles determine captain/member ordering.';
comment on table public.score_events is
  'Canonical append-only point ledger used to derive weekly and season standings.';
comment on table public.team_week_results is
  'Canonical immutable-by-week finalization result and winner history.';

commit;
