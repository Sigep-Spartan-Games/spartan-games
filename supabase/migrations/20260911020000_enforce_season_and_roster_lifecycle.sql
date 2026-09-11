-- Make season transitions and team roster rules explicit at the database
-- boundary so every client and future job observes the same behavior.

begin;

create or replace function public.enforce_team_membership_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_season_id uuid;
  v_team_archived_at timestamptz;
begin
  if new.left_at is not null then
    return new;
  end if;

  select t.season_id, t.archived_at
  into v_team_season_id, v_team_archived_at
  from public.teams t
  where t.id = new.team_id
  for update;

  if v_team_season_id is null then
    raise exception 'Team not found';
  end if;
  if v_team_archived_at is not null then
    raise exception 'Cannot add a member to an archived team';
  end if;
  if new.season_id <> v_team_season_id then
    raise exception 'Membership season must match the team season';
  end if;
  if (
    select count(*)
    from public.team_memberships tm
    where tm.team_id = new.team_id
      and tm.left_at is null
      and tm.id <> new.id
  ) >= 2 then
    raise exception 'Team is full';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_team_membership_capacity() from public, anon, authenticated;

drop trigger if exists team_memberships_enforce_capacity on public.team_memberships;
create trigger team_memberships_enforce_capacity
before insert or update of team_id, season_id, left_at on public.team_memberships
for each row execute function public.enforce_team_membership_capacity();

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
  if v_season.status not in ('registration', 'active') then
    raise exception 'Team registration is unavailable for this season';
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
  if exists (
    select 1 from public.submissions submission
    where submission.season_id = v_season.id
      and submission.submitted_by = v_uid
      and submission.submission_kind = 'activity'
      and submission.voided_at is null
  ) then
    raise exception 'You cannot create or switch teams after submitting an activity in this season';
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

create or replace function public.join_team_by_code_v2(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_season public.seasons%rowtype;
  v_display_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select s.* into v_season
  from public.seasons s
  where s.id = public.current_season_id()
  for update;

  if v_season.id is null then
    raise exception 'No current season configured';
  end if;

  select t.* into v_team
  from public.teams t
  where t.invite_code = upper(trim(p_code))
    and t.archived_at is null
    and t.season_id = v_season.id
  for update;

  if v_team.id is null then
    raise exception 'Invalid invite code';
  end if;

  if not coalesce(v_season.registration_open, false) then
    raise exception 'Team registration is closed';
  end if;
  if v_season.status not in ('registration', 'active') then
    raise exception 'Team registration is unavailable for this season';
  end if;
  if exists (
    select 1 from public.team_memberships tm
    where tm.season_id = v_team.season_id and tm.user_id = v_uid and tm.left_at is null
  ) then
    raise exception 'You already belong to a team in this season';
  end if;
  if exists (
    select 1 from public.submissions submission
    where submission.season_id = v_team.season_id
      and submission.submitted_by = v_uid
      and submission.submission_kind = 'activity'
      and submission.voided_at is null
  ) then
    raise exception 'You cannot join or switch teams after submitting an activity in this season';
  end if;
  if (
    select count(*) from public.team_memberships tm
    where tm.team_id = v_team.id and tm.left_at is null
  ) >= 2 then
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

create or replace function public.leave_team_v2(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_membership public.team_memberships%rowtype;
  v_season_id uuid;
  v_registration_open boolean;
  v_season_status text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select t.season_id into v_season_id
  from public.teams t
  where t.id = p_team_id;

  if v_season_id is null then
    raise exception 'Team not found';
  end if;

  select s.registration_open, s.status
  into v_registration_open, v_season_status
  from public.seasons s
  where s.id = v_season_id
  for update;

  perform 1 from public.teams where id = p_team_id for update;

  select tm.* into v_membership
  from public.team_memberships tm
  where tm.team_id = p_team_id and tm.user_id = v_uid and tm.left_at is null
  for update;

  if v_membership.id is null then
    raise exception 'You are not an active member of this team';
  end if;
  if not coalesce(v_registration_open, false)
     or v_season_status not in ('registration', 'active') then
    raise exception 'Team registration is closed';
  end if;
  if exists (
    select 1 from public.submissions submission
    where submission.season_id = v_membership.season_id
      and submission.submitted_by = v_uid
      and submission.submission_kind = 'activity'
      and submission.voided_at is null
  ) then
    raise exception 'You cannot leave or switch teams after submitting an activity in this season';
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

create or replace function public.change_team_tier_v2(p_team_id uuid, p_tier_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id uuid;
  v_season_status text;
  v_is_admin boolean := public.is_admin(auth.uid());
begin
  select t.season_id, s.status
  into v_season_id, v_season_status
  from public.teams t
  join public.seasons s on s.id = t.season_id
  where t.id = p_team_id and t.archived_at is null
  for update of t, s;

  if v_season_id is null then raise exception 'Team not found'; end if;
  if not v_is_admin and not exists (
    select 1 from public.team_memberships tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
      and tm.role = 'captain' and tm.left_at is null
  ) then
    raise exception 'Only the team captain can change the tier' using errcode = '42501';
  end if;
  if not v_is_admin and v_season_status <> 'registration' then
    raise exception 'Only admins can change a team tier after the games start';
  end if;
  if not exists (
    select 1 from public.season_tiers st
    where st.season_id = v_season_id and st.tier_key = lower(trim(p_tier_key))
  ) then
    raise exception 'Invalid tier';
  end if;

  update public.teams set tier = lower(trim(p_tier_key)) where id = p_team_id;
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
  v_next_status text;
begin
  perform public.assert_admin();
  if p_status is not null and p_status not in ('draft', 'registration', 'active', 'completed') then
    raise exception 'Invalid season status';
  end if;

  select s.* into v_season
  from public.seasons s
  where s.id = public.current_season_id()
  for update;

  if v_season.id is null then raise exception 'No current season configured'; end if;

  if p_status = 'completed' then
    if p_registration_open is true or p_submissions_open is true then
      raise exception 'A completed season cannot have registration or submissions open';
    end if;
    return public.close_current_season_v2();
  end if;

  if v_season.status = 'completed' then
    raise exception 'Completed seasons cannot be reopened; start a new season instead';
  end if;

  v_next_status := coalesce(p_status, v_season.status);
  if v_next_status <> v_season.status and not (
    (v_season.status = 'draft' and v_next_status = 'registration')
    or (v_season.status = 'registration' and v_next_status = 'active')
  ) then
    raise exception 'Invalid season transition from % to %', v_season.status, v_next_status;
  end if;

  if v_next_status = 'registration' and p_submissions_open is true then
    raise exception 'Start the games before opening submissions';
  end if;
  if p_status = 'active'
     and (p_registration_open is false or p_submissions_open is false) then
    raise exception 'Starting the games must keep registration and submissions open';
  end if;

  update public.seasons s
  set registration_open = case
        when p_status = 'active' then true
        else coalesce(p_registration_open, s.registration_open)
      end,
      submissions_open = case
        when p_status = 'active' then true
        else coalesce(p_submissions_open, s.submissions_open)
      end,
      status = v_next_status,
      ends_on = case when p_status = 'active' then null else s.ends_on end
  where s.id = v_season.id
  returning s.* into v_season;

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', v_season.status,
    'registration_open', v_season.registration_open,
    'submissions_open', v_season.submissions_open
  );
end;
$$;

-- Adopt the late-registration policy for a season that was already active
-- before this migration. Completed seasons remain closed.
update public.seasons
set registration_open = true
where id = public.current_season_id()
  and status = 'active';

commit;
