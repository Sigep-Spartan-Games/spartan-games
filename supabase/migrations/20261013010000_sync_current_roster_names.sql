begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'last_name'), ''),
    new.email
  )
  on conflict (id) do update
  set first_name = coalesce(excluded.first_name, public.profiles.first_name),
      last_name = coalesce(excluded.last_name, public.profiles.last_name),
      email = excluded.email;
  return new;
end;
$$;

create or replace function public.sync_current_roster_display_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(trim(concat_ws(
    ' ',
    nullif(trim(new.first_name), ''),
    nullif(trim(new.last_name), '')
  )), '');

  if v_display_name is null then
    return new;
  end if;

  update public.team_memberships membership
  set display_name_snapshot = v_display_name
  where membership.user_id = new.id
    and membership.left_at is null
    and membership.display_name_snapshot is distinct from v_display_name
    and exists (
      select 1
      from public.teams team
      join public.seasons season on season.id = team.season_id
      where team.id = membership.team_id
        and team.season_id = membership.season_id
        and team.archived_at is null
        and season.archived_at is null
        and season.status in ('registration', 'active', 'finalizing')
    );

  return new;
end;
$$;

revoke execute on function public.sync_current_roster_display_name()
from public, anon, authenticated;

drop trigger if exists profiles_sync_current_roster_display_name
on public.profiles;

create trigger profiles_sync_current_roster_display_name
after update of first_name, last_name on public.profiles
for each row
when (
  old.first_name is distinct from new.first_name
  or old.last_name is distinct from new.last_name
)
execute function public.sync_current_roster_display_name();

with current_roster_names as (
  select
    membership.id,
    nullif(trim(concat_ws(
      ' ',
      nullif(trim(profile.first_name), ''),
      nullif(trim(profile.last_name), '')
    )), '') as display_name
  from public.team_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  join public.teams team on team.id = membership.team_id
    and team.season_id = membership.season_id
  join public.seasons season on season.id = membership.season_id
  where membership.left_at is null
    and team.archived_at is null
    and season.archived_at is null
    and season.status in ('registration', 'active', 'finalizing')
)
update public.team_memberships membership
set display_name_snapshot = roster.display_name
from current_roster_names roster
where membership.id = roster.id
  and roster.display_name is not null
  and membership.display_name_snapshot is distinct from roster.display_name;

comment on function public.sync_current_roster_display_name() is
  'Keeps active, non-completed roster display-name snapshots aligned with profile name corrections.';

commit;
