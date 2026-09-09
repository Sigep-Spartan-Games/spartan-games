-- Reconstructed baseline for the schema that existed before migration tracking.
--
-- The hosted project already contains these objects. Before the first managed
-- push, mark this version applied remotely:
--   supabase migration repair --linked --status applied 20260122000000
--
-- This file exists so a clean local database can replay the complete project
-- history. Later fetched migrations evolve it to the hosted March 2026 state.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.activity_rules (
  activity_key text primary key,
  points_per_unit numeric not null default 10,
  teammate_bonus numeric not null default 15,
  updated_at timestamptz not null default now(),
  unit text,
  label text,
  input_type text check (input_type in ('number', 'text', 'boolean')),
  unit_label text,
  min_value numeric,
  step_value numeric default 1,
  active boolean not null default true
);

create table public.game_settings (
  id boolean primary key default true check (id),
  registration_open boolean not null default true,
  submissions_open boolean not null default false,
  games_started_at timestamptz,
  games_ended_at timestamptz,
  updated_at timestamptz not null default now(),
  last_week_finalized date,
  finalize_requested boolean not null default false
);

insert into public.game_settings (id)
values (true)
on conflict (id) do nothing;

create or replace function public.date_array_is_unique(arr date[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(arr) = (select count(distinct value) from unnest(arr) as value);
$$;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  member1_name text,
  member2_name text,
  total_points integer not null default 0,
  created_at timestamptz not null default now(),
  member1_id uuid references public.profiles(id) on delete set null,
  member2_id uuid references public.profiles(id) on delete set null,
  invite_code text,
  weeks_won date[],
  weekly_points smallint not null default 0,
  constraint teams_member_ids_distinct
    check (member1_id is null or member2_id is null or member1_id <> member2_id),
  constraint teams_weekly_points_smallint_range
    check (weekly_points between 0 and 32767),
  constraint teams_weeks_won_no_duplicates
    check (weeks_won is null or public.date_array_is_unique(weeks_won))
);

create unique index teams_invite_code_unique on public.teams(invite_code);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  activity text not null,
  base_points integer not null check (base_points > 0),
  did_with_teammate boolean not null default false,
  multiplier numeric not null default 1.0 check (multiplier > 0),
  points_awarded integer not null check (points_awarded > 0),
  created_at timestamptz not null default now(),
  activity_key text not null,
  activity_date date not null default ((now() at time zone 'utc')::date),
  activity_value_number numeric,
  activity_value_text text,
  activity_value_bool boolean,
  points_per_unit numeric,
  teammate_bonus numeric,
  activity_units numeric,
  proof_image_path text,
  constraint submissions_activity_date_not_future check (activity_date <= now()::date)
);

create index submissions_team_id_idx on public.submissions(team_id);
create index submissions_activity_date_idx on public.submissions(activity_date);
create index submissions_team_activity_date_idx on public.submissions(team_id, activity_date);
create index submissions_created_at_idx on public.submissions(created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_activity_rules_touch
before update on public.activity_rules
for each row execute function public.touch_updated_at();

create or replace function public.touch_game_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_game_settings_updated_at
before update on public.game_settings
for each row execute function public.touch_game_settings_updated_at();

create or replace function public.week_start(d date)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('week', d::timestamp)::date;
$$;

create or replace function public.current_week_start_date()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', now() at time zone 'America/New_York')::date;
$$;

create or replace function public.is_in_current_week(d date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select d >= public.current_week_start_date()
     and d < public.current_week_start_date() + 7;
$$;

create or replace function public.submission_points_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_in_current_week(new.activity_date) then
    update public.teams
    set weekly_points = weekly_points + new.points_awarded
    where id = new.team_id;
  end if;
  return new;
end;
$$;

create or replace function public.submission_points_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_in_current_week(old.activity_date) then
    update public.teams
    set weekly_points = greatest(0, weekly_points - old.points_awarded)
    where id = old.team_id;
  end if;
  return old;
end;
$$;

create or replace function public.submission_points_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_counts boolean := public.is_in_current_week(old.activity_date);
  new_counts boolean := public.is_in_current_week(new.activity_date);
begin
  if old_counts then
    update public.teams
    set weekly_points = greatest(0, weekly_points - old.points_awarded)
    where id = old.team_id;
  end if;
  if new_counts then
    update public.teams
    set weekly_points = weekly_points + new.points_awarded
    where id = new.team_id;
  end if;
  return new;
end;
$$;

create trigger trg_submission_points_insert
after insert on public.submissions
for each row execute function public.submission_points_insert();

create trigger trg_submission_points_update
after update of team_id, points_awarded, activity_date on public.submissions
for each row execute function public.submission_points_update();

create trigger trg_submission_points_delete
after delete on public.submissions
for each row execute function public.submission_points_delete();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.activity_rules enable row level security;
alter table public.game_settings enable row level security;
alter table public.teams enable row level security;
alter table public.teams force row level security;
alter table public.submissions enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

