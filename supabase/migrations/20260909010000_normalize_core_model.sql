-- Additive, data-preserving normalization of the Spartan Games core model.
-- Legacy columns remain during the application cutover and are documented as
-- compatibility projections. No user, team, submission, or history row is deleted.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.tiers (
  key text primary key,
  name text not null,
  sort_order smallint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint tiers_key_format check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint tiers_sort_order_positive check (sort_order > 0)
);

insert into public.tiers (key, name, sort_order)
values
  ('gold', 'Gold', 1),
  ('purple', 'Purple', 2),
  ('red', 'Red', 3)
on conflict (key) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'registration',
  timezone text not null default 'America/New_York',
  starts_on date not null,
  ends_on date,
  registration_open boolean not null default true,
  submissions_open boolean not null default false,
  daily_bonus_increment integer not null default 1,
  max_streak_bonus integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint seasons_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint seasons_status_check check (status in ('draft', 'registration', 'active', 'completed')),
  constraint seasons_date_order check (ends_on is null or ends_on >= starts_on),
  constraint seasons_streak_values check (daily_bonus_increment >= 0 and max_streak_bonus >= 0)
);

create unique index seasons_one_unarchived_active_idx
on public.seasons ((true))
where archived_at is null and status in ('registration', 'active');

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

insert into public.seasons (
  id,
  slug,
  name,
  status,
  timezone,
  starts_on,
  ends_on,
  registration_open,
  submissions_open,
  daily_bonus_increment,
  max_streak_bonus
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  '2026-spartan-games',
  '2026 Spartan Games',
  case
    when gs.games_ended_at is not null then 'completed'
    when gs.games_started_at is not null then 'active'
    else 'registration'
  end,
  'America/New_York',
  coalesce(
    (select min(s.activity_date) from public.submissions s),
    gs.games_started_at::date,
    current_date
  ),
  gs.games_ended_at::date,
  gs.registration_open,
  gs.submissions_open,
  coalesce(ss.daily_bonus_increment, 1),
  coalesce(ss.max_bonus, 10)
from public.game_settings gs
left join public.streak_settings ss on ss.id = true
where gs.id = true
on conflict (id) do nothing;

create table public.season_tiers (
  season_id uuid not null references public.seasons(id) on delete cascade,
  tier_key text not null references public.tiers(key) on delete restrict,
  weekly_goal integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season_id, tier_key),
  constraint season_tiers_weekly_goal_nonnegative check (weekly_goal >= 0)
);

create trigger season_tiers_set_updated_at
before update on public.season_tiers
for each row execute function public.set_updated_at();

insert into public.season_tiers (season_id, tier_key, weekly_goal)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  t.key,
  coalesce(ts.weekly_goal, case t.key when 'gold' then 100 when 'purple' then 75 else 50 end)
from public.tiers t
left join public.tier_settings ts on ts.tier = t.key
on conflict (season_id, tier_key) do update
set weekly_goal = excluded.weekly_goal;

alter table public.teams
  add column season_id uuid,
  add column archived_at timestamptz;

update public.teams
set season_id = '00000000-0000-4000-8000-000000000001'::uuid
where season_id is null;

alter table public.teams
  alter column season_id set not null,
  alter column weekly_points type integer using weekly_points::integer,
  drop constraint if exists teams_weekly_points_smallint_range,
  drop constraint if exists teams_name_key,
  add constraint teams_season_id_fkey foreign key (season_id) references public.seasons(id) on delete restrict,
  add constraint teams_tier_key_fkey foreign key (tier) references public.tiers(key) on delete restrict,
  add constraint teams_id_season_unique unique (id, season_id),
  add constraint teams_points_nonnegative check (weekly_points >= 0 and total_points >= 0);

drop index if exists public.teams_name_key;
create unique index teams_active_name_per_season_idx
on public.teams (season_id, lower(name))
where archived_at is null;

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  role text not null default 'member',
  display_name_snapshot text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  constraint team_memberships_role_check check (role in ('captain', 'member')),
  constraint team_memberships_date_order check (left_at is null or left_at >= joined_at)
);

create unique index team_memberships_one_active_team_per_season_idx
on public.team_memberships (season_id, user_id)
where left_at is null and user_id is not null;

create unique index team_memberships_one_active_row_per_team_user_idx
on public.team_memberships (team_id, user_id)
where left_at is null and user_id is not null;

create unique index team_memberships_one_active_captain_idx
on public.team_memberships (team_id)
where left_at is null and role = 'captain';

create index team_memberships_active_team_idx
on public.team_memberships (team_id, joined_at)
where left_at is null;

insert into public.team_memberships (
  team_id,
  season_id,
  user_id,
  role,
  display_name_snapshot,
  joined_at
)
select
  t.id,
  t.season_id,
  t.member1_id,
  'captain',
  coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), t.member1_name, 'Former member'),
  t.created_at
from public.teams t
left join public.profiles p on p.id = t.member1_id
where t.member1_id is not null
on conflict do nothing;

insert into public.team_memberships (
  team_id,
  season_id,
  user_id,
  role,
  display_name_snapshot,
  joined_at
)
select
  t.id,
  t.season_id,
  t.member2_id,
  'member',
  coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), t.member2_name, 'Former member'),
  t.created_at
from public.teams t
left join public.profiles p on p.id = t.member2_id
where t.member2_id is not null
on conflict do nothing;

create table public.team_streaks (
  team_id uuid primary key references public.teams(id) on delete restrict,
  streak_count integer not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now(),
  constraint team_streaks_nonnegative check (streak_count >= 0)
);

create trigger team_streaks_set_updated_at
before update on public.team_streaks
for each row execute function public.set_updated_at();

insert into public.team_streaks (team_id, streak_count, last_activity_date)
select id, coalesce(streak_count, 0), last_activity_date
from public.teams
on conflict (team_id) do update
set streak_count = excluded.streak_count,
    last_activity_date = excluded.last_activity_date;

create or replace function public.parse_week_start(p_label text)
returns date
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  m text[];
  parsed_start date;
begin
  m := regexp_match(
    p_label,
    '^([A-Z][a-z]{2}) ([0-9]{1,2}) - (?:(?:[A-Z][a-z]{2}) )?[0-9]{1,2}, ([0-9]{4})$'
  );
  if m is null then
    raise exception 'Unsupported historical week label: %', p_label;
  end if;
  parsed_start := to_date(m[1] || ' ' || m[2] || ' ' || m[3], 'Mon DD YYYY');
  return date_trunc('week', parsed_start::timestamp)::date;
end;
$$;

create or replace function public.parse_week_end(p_label text)
returns date
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  m text[];
  start_month integer;
  end_month_name text;
  end_year integer;
begin
  m := regexp_match(
    p_label,
    '^([A-Z][a-z]{2}) ([0-9]{1,2}) - (?:(?:([A-Z][a-z]{2}) )?)([0-9]{1,2}), ([0-9]{4})$'
  );
  if m is null then
    raise exception 'Unsupported historical week label: %', p_label;
  end if;
  start_month := extract(month from to_date(m[1], 'Mon'))::integer;
  end_month_name := coalesce(m[3], m[1]);
  end_year := m[5]::integer;
  if extract(month from to_date(end_month_name, 'Mon'))::integer < start_month then
    end_year := end_year + 1;
  end if;
  return to_date(end_month_name || ' ' || m[4] || ' ' || end_year, 'Mon DD YYYY');
end;
$$;

create table public.competition_weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  label text not null,
  status text not null default 'open',
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, starts_on),
  unique (season_id, label),
  constraint competition_weeks_status_check check (status in ('scheduled', 'open', 'finalizing', 'finalized')),
  constraint competition_weeks_date_order check (ends_on >= starts_on)
);

create trigger competition_weeks_set_updated_at
before update on public.competition_weeks
for each row execute function public.set_updated_at();

insert into public.competition_weeks (
  season_id,
  starts_on,
  ends_on,
  label,
  status,
  finalized_at
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  public.parse_week_start(wh.week_identifier),
  public.parse_week_end(wh.week_identifier),
  wh.week_identifier,
  'finalized',
  max(wh.created_at)
from public.weekly_history wh
group by wh.week_identifier
on conflict (season_id, starts_on) do update
set label = excluded.label,
    ends_on = excluded.ends_on,
    status = 'finalized',
    finalized_at = excluded.finalized_at;

insert into public.competition_weeks (season_id, starts_on, ends_on, label, status)
select distinct
  '00000000-0000-4000-8000-000000000001'::uuid,
  public.week_start(s.activity_date),
  public.week_start(s.activity_date) + 6,
  public.week_identifier(public.week_start(s.activity_date)),
  case
    when public.week_start(s.activity_date) <= coalesce(gs.last_week_finalized, '-infinity'::date)
      then 'finalized'
    else 'open'
  end
from public.submissions s
cross join public.game_settings gs
where gs.id = true
  and not exists (
    select 1
    from public.competition_weeks cw
    where cw.season_id = '00000000-0000-4000-8000-000000000001'::uuid
      and s.activity_date between cw.starts_on and cw.ends_on
  )
on conflict (season_id, starts_on) do nothing;

insert into public.competition_weeks (season_id, starts_on, ends_on, label, status)
select
  s.id,
  public.week_start((now() at time zone s.timezone)::date),
  public.week_start((now() at time zone s.timezone)::date) + 6,
  public.week_identifier(public.week_start((now() at time zone s.timezone)::date)),
  'open'
from public.seasons s
where s.id = '00000000-0000-4000-8000-000000000001'::uuid
on conflict (season_id, starts_on) do nothing;

create index competition_weeks_status_idx
on public.competition_weeks (season_id, status, starts_on desc);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  measurement_type text not null,
  unit_label text,
  description text,
  min_value numeric,
  step_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint activities_key_format check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint activities_measurement_type_check check (measurement_type in ('number', 'text', 'boolean')),
  constraint activities_min_value_nonnegative check (min_value is null or min_value >= 0),
  constraint activities_step_value_positive check (step_value is null or step_value > 0)
);

create trigger activities_set_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

insert into public.activities (
  key,
  label,
  measurement_type,
  unit_label,
  description,
  min_value,
  step_value
)
select
  ar.activity_key,
  coalesce(nullif(trim(ar.label), ''), ar.activity_key),
  coalesce(ar.input_type, 'number'),
  coalesce(nullif(trim(ar.unit_label), ''), nullif(trim(ar.unit), '')),
  ar.description,
  ar.min_value,
  ar.step_value
from public.activity_rules ar
where ar.activity_key <> 'daily_streak_bonus'
on conflict (key) do update
set label = excluded.label,
    measurement_type = excluded.measurement_type,
    unit_label = excluded.unit_label,
    description = excluded.description,
    min_value = excluded.min_value,
    step_value = excluded.step_value;

create table public.scoring_rule_versions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  points_per_unit numeric not null,
  teammate_multiplier numeric not null default 1,
  weekly_cap_points integer,
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint scoring_rule_versions_points_nonnegative check (points_per_unit >= 0),
  constraint scoring_rule_versions_multiplier_positive check (teammate_multiplier > 0),
  constraint scoring_rule_versions_cap_positive check (weekly_cap_points is null or weekly_cap_points > 0),
  constraint scoring_rule_versions_date_order check (effective_to is null or effective_to > effective_from)
);

create unique index scoring_rule_versions_one_current_idx
on public.scoring_rule_versions (activity_id, season_id)
where effective_to is null;

create index scoring_rule_versions_history_idx
on public.scoring_rule_versions (activity_id, season_id, effective_from desc);

insert into public.scoring_rule_versions (
  activity_id,
  season_id,
  points_per_unit,
  teammate_multiplier,
  weekly_cap_points,
  effective_from
)
select
  a.id,
  '00000000-0000-4000-8000-000000000001'::uuid,
  ar.points_per_unit,
  ar.teammate_bonus,
  ar.weekly_cap,
  s.starts_on::timestamptz
from public.activity_rules ar
join public.activities a on a.key = ar.activity_key
join public.seasons s on s.id = '00000000-0000-4000-8000-000000000001'::uuid
where ar.activity_key <> 'daily_streak_bonus'
on conflict do nothing;

insert into public.scoring_rule_versions (
  activity_id,
  season_id,
  points_per_unit,
  teammate_multiplier,
  weekly_cap_points,
  effective_from,
  effective_to
)
select
  a.id,
  '00000000-0000-4000-8000-000000000001'::uuid,
  snapshots.points_per_unit,
  snapshots.teammate_bonus,
  null,
  snapshots.first_date::timestamptz,
  (snapshots.last_date + 1)::timestamptz
from (
  select
    activity_key,
    coalesce(points_per_unit, 0) as points_per_unit,
    coalesce(teammate_bonus, 1) as teammate_bonus,
    min(activity_date) as first_date,
    max(activity_date) as last_date
  from public.submissions
  where activity_key <> 'daily_streak_bonus'
  group by activity_key, coalesce(points_per_unit, 0), coalesce(teammate_bonus, 1)
) snapshots
join public.activities a on a.key = snapshots.activity_key
where not exists (
  select 1
  from public.activity_rules ar
  where ar.activity_key = snapshots.activity_key
    and ar.points_per_unit = snapshots.points_per_unit
    and ar.teammate_bonus = snapshots.teammate_bonus
)
  and not exists (
    select 1
    from public.scoring_rule_versions rv
    where rv.activity_id = a.id
      and rv.season_id = '00000000-0000-4000-8000-000000000001'::uuid
      and rv.points_per_unit = snapshots.points_per_unit
      and rv.teammate_multiplier = snapshots.teammate_bonus
  );

alter table public.submissions
  add column season_id uuid,
  add column week_id uuid,
  add column activity_id uuid,
  add column scoring_rule_version_id uuid,
  add column submission_kind text,
  add column submitted_by_name text,
  add column updated_at timestamptz not null default now(),
  add column voided_at timestamptz;

with submission_mapping as (
  select
    s.id as submission_id,
    t.season_id,
    cw.id as week_id,
    a.id as activity_id,
    case
      when s.activity_key = 'daily_streak_bonus' or coalesce(s.streak_bonus, 0) > 0 then 'streak_bonus'
      else 'activity'
    end as submission_kind,
    coalesce(
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      case when t.member1_id = s.submitted_by then t.member1_name else t.member2_name end,
      'Former member'
    ) as submitted_by_name
  from public.submissions s
  join public.teams t on t.id = s.team_id
  join public.competition_weeks cw
    on cw.season_id = t.season_id
   and s.activity_date between cw.starts_on and cw.ends_on
  left join public.activities a on a.key = s.activity_key
  left join public.profiles p on p.id = s.submitted_by
)
update public.submissions s
set season_id = mapping.season_id,
    week_id = mapping.week_id,
    activity_id = mapping.activity_id,
    submission_kind = case
      when s.activity_key = 'daily_streak_bonus' or coalesce(s.streak_bonus, 0) > 0 then 'streak_bonus'
      else 'activity'
    end,
    submitted_by_name = mapping.submitted_by_name
from submission_mapping mapping
where mapping.submission_id = s.id;

update public.submissions s
set scoring_rule_version_id = rv.id
from public.scoring_rule_versions rv
where s.activity_id = rv.activity_id
  and s.season_id = rv.season_id
  and rv.points_per_unit = coalesce(s.points_per_unit, rv.points_per_unit)
  and rv.teammate_multiplier = coalesce(s.teammate_bonus, rv.teammate_multiplier)
  and (
    rv.effective_to is not null
    or not exists (
      select 1
      from public.scoring_rule_versions historical
      where historical.activity_id = s.activity_id
        and historical.season_id = s.season_id
        and historical.effective_to is not null
        and historical.points_per_unit = coalesce(s.points_per_unit, historical.points_per_unit)
        and historical.teammate_multiplier = coalesce(s.teammate_bonus, historical.teammate_multiplier)
    )
  );

alter table public.submissions
  alter column season_id set not null,
  alter column week_id set not null,
  alter column submission_kind set not null,
  alter column submitted_by drop not null,
  drop constraint if exists submissions_submitted_by_fkey,
  drop constraint if exists submissions_team_id_fkey,
  add constraint submissions_submitted_by_fkey foreign key (submitted_by) references auth.users(id) on delete set null,
  add constraint submissions_team_id_fkey foreign key (team_id) references public.teams(id) on delete restrict,
  add constraint submissions_season_id_fkey foreign key (season_id) references public.seasons(id) on delete restrict,
  add constraint submissions_week_id_fkey foreign key (week_id) references public.competition_weeks(id) on delete restrict,
  add constraint submissions_activity_id_fkey foreign key (activity_id) references public.activities(id) on delete restrict,
  add constraint submissions_rule_version_id_fkey foreign key (scoring_rule_version_id) references public.scoring_rule_versions(id) on delete restrict,
  add constraint submissions_kind_check check (submission_kind in ('activity', 'streak_bonus', 'admin_adjustment')),
  add constraint submissions_activity_reference_check check (
    submission_kind <> 'activity' or (activity_id is not null and scoring_rule_version_id is not null)
  );

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

create index submissions_team_activity_week_idx
on public.submissions (team_id, activity_id, week_id)
where voided_at is null;

create index submissions_submitter_created_idx
on public.submissions (submitted_by, created_at desc)
where voided_at is null;

create table public.score_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  week_id uuid not null references public.competition_weeks(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  activity_id uuid references public.activities(id) on delete restrict,
  event_type text not null,
  source_submission_id uuid references public.submissions(id) on delete cascade,
  points integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_events_type_check check (event_type in ('activity', 'streak_bonus', 'admin_adjustment')),
  constraint score_events_points_nonzero check (points <> 0),
  constraint score_events_source_check check (
    event_type = 'admin_adjustment' or source_submission_id is not null
  )
);

create unique index score_events_submission_type_unique_idx
on public.score_events (source_submission_id, event_type)
where source_submission_id is not null;

create index score_events_team_week_idx
on public.score_events (team_id, week_id, created_at);

create index score_events_season_activity_week_idx
on public.score_events (season_id, activity_id, week_id, team_id)
where activity_id is not null;

create trigger score_events_set_updated_at
before update on public.score_events
for each row execute function public.set_updated_at();

insert into public.score_events (
  season_id,
  week_id,
  team_id,
  actor_id,
  activity_id,
  event_type,
  source_submission_id,
  points,
  metadata,
  created_at
)
select
  s.season_id,
  s.week_id,
  s.team_id,
  s.submitted_by,
  s.activity_id,
  case when s.submission_kind = 'streak_bonus' then 'streak_bonus' else 'activity' end,
  s.id,
  s.points_awarded,
  jsonb_strip_nulls(jsonb_build_object(
    'legacy', true,
    'activity_key', s.activity_key,
    'base_points', s.base_points,
    'points_per_unit', s.points_per_unit,
    'teammate_multiplier', s.teammate_bonus,
    'did_with_teammate', s.did_with_teammate
  )),
  s.created_at
from public.submissions s
on conflict (source_submission_id, event_type) where source_submission_id is not null do nothing;

create table public.team_week_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  week_id uuid not null references public.competition_weeks(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  tier_key text not null references public.tiers(key) on delete restrict,
  points integer not null,
  goal_points integer not null,
  rank integer not null,
  won boolean not null default false,
  streak_count integer not null default 0,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, week_id),
  constraint team_week_results_values_nonnegative check (
    points >= 0 and goal_points >= 0 and rank > 0 and streak_count >= 0
  )
);

create index team_week_results_leaderboard_idx
on public.team_week_results (week_id, tier_key, rank, points desc);

create index team_week_results_team_history_idx
on public.team_week_results (team_id, finalized_at desc);

create trigger team_week_results_set_updated_at
before update on public.team_week_results
for each row execute function public.set_updated_at();

insert into public.team_week_results (
  season_id,
  week_id,
  team_id,
  tier_key,
  points,
  goal_points,
  rank,
  won,
  streak_count,
  finalized_at
)
select
  cw.season_id,
  cw.id,
  wh.team_id,
  coalesce(wh.tier, t.tier),
  wh.weekly_points,
  wh.weekly_goal,
  rank() over (
    partition by cw.id, coalesce(wh.tier, t.tier)
    order by wh.weekly_points desc, t.created_at, t.id
  )::integer,
  coalesce(cw.starts_on = any(t.weeks_won), false),
  coalesce(wh.streak_count, 0),
  coalesce(wh.created_at, cw.finalized_at, now())
from public.weekly_history wh
join public.teams t on t.id = wh.team_id
join public.competition_weeks cw
  on cw.season_id = t.season_id
 and cw.label = wh.week_identifier
on conflict (team_id, week_id) do update
set points = excluded.points,
    goal_points = excluded.goal_points,
    rank = excluded.rank,
    won = excluded.won,
    streak_count = excluded.streak_count,
    finalized_at = excluded.finalized_at;

alter table public.weekly_history
  add column week_id uuid;

update public.weekly_history wh
set week_id = cw.id
from public.teams t
join public.competition_weeks cw on cw.season_id = t.season_id
where t.id = wh.team_id
  and cw.label = wh.week_identifier
  and wh.week_id is null;

alter table public.weekly_history
  alter column week_id set not null,
  drop constraint if exists weekly_history_team_id_fkey,
  add constraint weekly_history_team_id_fkey foreign key (team_id) references public.teams(id) on delete restrict,
  add constraint weekly_history_week_id_fkey foreign key (week_id) references public.competition_weeks(id) on delete restrict;

create unique index weekly_history_team_week_id_unique_idx
on public.weekly_history (team_id, week_id);

drop index if exists public.idx_weekly_history_met_goal;
drop index if exists public.idx_weekly_history_team_id;

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  deduplication_key text not null,
  status text not null default 'running',
  attempt_count integer not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type, deduplication_key),
  constraint job_runs_status_check check (status in ('running', 'completed', 'failed')),
  constraint job_runs_attempt_positive check (attempt_count > 0)
);

create index job_runs_status_started_idx
on public.job_runs (status, started_at desc);

create trigger job_runs_set_updated_at
before update on public.job_runs
for each row execute function public.set_updated_at();

insert into public.job_runs (
  job_type,
  deduplication_key,
  status,
  started_at,
  completed_at,
  metadata
)
select
  'finalize_week',
  cw.id::text,
  'completed',
  coalesce(cw.finalized_at, cw.created_at),
  coalesce(cw.finalized_at, cw.created_at),
  jsonb_build_object('backfilled', true, 'week_label', cw.label)
from public.competition_weeks cw
where cw.status = 'finalized'
on conflict (job_type, deduplication_key) do nothing;

create table public.submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  bucket_id text not null default 'submission-proofs',
  object_path text not null unique,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  purged_at timestamptz,
  last_cleanup_error text,
  constraint submission_attachments_size_nonnegative check (size_bytes is null or size_bytes >= 0)
);

create index submission_attachments_cleanup_idx
on public.submission_attachments (deleted_at, created_at)
where purged_at is null and (submission_id is null or deleted_at is not null);

insert into public.submission_attachments (
  submission_id,
  uploaded_by,
  object_path,
  created_at
)
select id, submitted_by, proof_image_path, created_at
from public.submissions
where proof_image_path is not null
on conflict (object_path) do update
set submission_id = excluded.submission_id,
    uploaded_by = excluded.uploaded_by;

alter table public.submission_edit_requests
  add column request_type text not null default 'edit',
  add column resolved_by uuid references auth.users(id) on delete set null,
  add column resolved_at timestamptz,
  add column resolution_note text,
  add constraint submission_edit_requests_type_check check (request_type in ('edit', 'delete')),
  add constraint submission_edit_requests_resolution_check check (
    (status = 'pending' and resolved_at is null)
    or (status in ('approved', 'rejected') and resolved_at is not null)
  ) not valid;

update public.submission_edit_requests
set request_type = case
      when coalesce((suggested_changes->>'is_deletion')::boolean, false) then 'delete'
      else 'edit'
    end,
    resolved_at = case when status <> 'pending' then coalesce(updated_at, created_at, now()) else null end;

alter table public.submission_edit_requests
  validate constraint submission_edit_requests_resolution_check;

create unique index submission_edit_requests_one_pending_idx
on public.submission_edit_requests (submission_id, user_id)
where status = 'pending';

drop index if exists public.idx_submission_edit_requests_status;
create index submission_edit_requests_pending_created_idx
on public.submission_edit_requests (created_at desc)
where status = 'pending';

create or replace view public.current_activity_rules
with (security_invoker = true)
as
select
  a.key as activity_key,
  rv.points_per_unit,
  rv.teammate_multiplier as teammate_bonus,
  a.updated_at,
  a.unit_label as unit,
  a.label,
  a.measurement_type as input_type,
  a.unit_label,
  a.min_value,
  a.step_value,
  (a.archived_at is null) as active,
  rv.weekly_cap_points as weekly_cap,
  a.description,
  a.id as activity_id,
  rv.id as scoring_rule_version_id,
  rv.season_id
from public.activities a
join public.scoring_rule_versions rv on rv.activity_id = a.id
join public.seasons s on s.id = rv.season_id
where rv.effective_to is null
  and s.archived_at is null
  and s.status in ('registration', 'active');

create or replace view public.current_tier_settings
with (security_invoker = true)
as
select
  st.tier_key as tier,
  st.weekly_goal,
  st.created_at,
  st.updated_at,
  st.season_id
from public.season_tiers st
join public.seasons s on s.id = st.season_id
where s.archived_at is null
  and s.status in ('registration', 'active');

create or replace view public.team_standings
with (security_invoker = true)
as
select
  t.id,
  t.season_id,
  t.name,
  t.tier,
  coalesce(points.weekly_points, 0)::integer as weekly_points,
  coalesce(points.season_points, 0)::integer as season_points,
  coalesce(results.weeks_won_count, 0)::integer as weeks_won_count,
  coalesce(ts.streak_count, 0) as streak_count,
  ts.last_activity_date,
  t.created_at,
  t.archived_at
from public.teams t
join public.seasons s on s.id = t.season_id
left join lateral (
  select
    coalesce(sum(se.points) filter (
      where cw.starts_on = public.week_start((now() at time zone s.timezone)::date)
    ), 0) as weekly_points,
    coalesce(sum(se.points), 0) as season_points
  from public.score_events se
  join public.competition_weeks cw on cw.id = se.week_id
  where se.team_id = t.id
) points on true
left join lateral (
  select count(*) filter (where twr.won) as weeks_won_count
  from public.team_week_results twr
  where twr.team_id = t.id
) results on true
left join public.team_streaks ts on ts.team_id = t.id
;

comment on table public.seasons is 'Competition lifecycle and season-scoped operational settings.';
comment on table public.team_memberships is 'Canonical team roster; teams.member1/member2 columns are compatibility projections.';
comment on table public.score_events is 'Canonical immutable point ledger. Team point columns are rebuildable compatibility projections.';
comment on table public.team_week_results is 'Immutable finalized team results by real competition week.';
comment on column public.submissions.activity is 'Deprecated compatibility display value; derive from activity and typed value.';
comment on column public.submissions.activity_units is 'Deprecated compatibility value; activity_value_number is canonical for numeric input.';
comment on column public.teams.weeks_won is 'Deprecated compatibility projection; derive wins from team_week_results.';
comment on column public.submission_edit_requests.team_id is 'Deprecated compatibility field; derive through submission_id.';

commit;
