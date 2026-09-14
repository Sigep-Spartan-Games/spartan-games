begin;

alter table public.profiles
  add column is_owner boolean not null default false;

alter table public.profiles
  add constraint profiles_owner_requires_admin
  check (not is_owner or is_admin);

create unique index profiles_single_owner_idx
on public.profiles (is_owner)
where is_owner;

-- Preserve every existing administrator and deterministically bootstrap the
-- longest-standing one as the initial owner.
update public.profiles
set is_owner = true
where id = (
  select profile.id
  from public.profiles profile
  where profile.is_admin
  order by profile.created_at, profile.id
  limit 1
);

create table public.admin_access_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid not null,
  target_id uuid not null,
  actor_email text,
  target_email text,
  created_at timestamptz not null default now(),
  constraint admin_access_events_action_check
    check (action in ('grant_admin', 'revoke_admin', 'transfer_ownership'))
);

create index admin_access_events_created_at_idx
on public.admin_access_events (created_at desc);

alter table public.admin_access_events enable row level security;

create policy admin_access_events_read_owner
on public.admin_access_events for select to authenticated
using (
  (select auth.uid()) is not null
  and
  exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.is_owner
  )
);

revoke all on table public.admin_access_events
from public, anon, authenticated, service_role;
grant select on table public.admin_access_events to authenticated, service_role;

-- Audit rows are append-only. RLS and grants protect application callers, while
-- this trigger also prevents accidental changes from privileged application
-- roles and future server-side code.
create or replace function public.protect_admin_access_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Administrator access audit events cannot be changed or deleted';
end;
$$;

create trigger admin_access_events_prevent_mutation
before update or delete on public.admin_access_events
for each row execute function public.protect_admin_access_event();

create or replace function public.protect_owner_profile()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_owner then
    raise exception 'Transfer ownership before deleting the owner account';
  end if;

  if tg_op = 'UPDATE' and old.is_owner and not new.is_admin then
    raise exception 'Transfer ownership before removing owner access';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_owner
before update of is_admin, is_owner or delete on public.profiles
for each row execute function public.protect_owner_profile();

create or replace function public.ensure_admin_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where is_admin)
     and not exists (select 1 from public.profiles where is_owner) then
    raise exception 'At least one administrator must be designated as owner';
  end if;

  return null;
end;
$$;

create constraint trigger profiles_require_owner
after insert or update or delete on public.profiles
deferrable initially deferred
for each row execute function public.ensure_admin_owner();

create or replace function public.assert_owner()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_owner boolean;
begin
  select profile.is_owner
  into v_is_owner
  from public.profiles profile
  where profile.id = auth.uid()
  for update;

  if not found or not coalesce(v_is_owner, false) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.grant_admin_access_v2(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_target_email text;
begin
  perform public.assert_owner();

  if p_user_id is null then
    raise exception 'Select a user to promote';
  end if;

  select profile.is_admin, profile.email
  into v_is_admin, v_target_email
  from public.profiles profile
  where profile.id = p_user_id
  for update;

  if not found then
    raise exception 'User account not found';
  end if;

  if v_is_admin then
    raise exception 'User is already an administrator';
  end if;

  update public.profiles
  set is_admin = true
  where id = p_user_id;

  insert into public.admin_access_events (
    action, actor_id, target_id, actor_email, target_email
  )
  select
    'grant_admin', actor.id, p_user_id, actor.email, v_target_email
  from public.profiles actor
  where actor.id = auth.uid();
end;
$$;

create or replace function public.revoke_admin_access_v2(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_is_owner boolean;
  v_target_email text;
begin
  perform public.assert_owner();

  if p_user_id is null then
    raise exception 'Select an administrator to remove';
  end if;

  select profile.is_admin, profile.is_owner, profile.email
  into v_is_admin, v_is_owner, v_target_email
  from public.profiles profile
  where profile.id = p_user_id
  for update;

  if not found then
    raise exception 'User account not found';
  end if;

  if v_is_owner then
    raise exception 'Transfer ownership before removing the owner';
  end if;

  if not v_is_admin then
    raise exception 'User is not an administrator';
  end if;

  update public.profiles
  set is_admin = false
  where id = p_user_id;

  insert into public.admin_access_events (
    action, actor_id, target_id, actor_email, target_email
  )
  select
    'revoke_admin', actor.id, p_user_id, actor.email, v_target_email
  from public.profiles actor
  where actor.id = auth.uid();
end;
$$;

create or replace function public.transfer_admin_ownership_v2(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target_email text;
begin
  perform public.assert_owner();

  if p_user_id is null then
    raise exception 'Select a user to receive ownership';
  end if;

  if p_user_id = v_actor_id then
    raise exception 'Select another user to receive ownership';
  end if;

  select profile.email
  into v_target_email
  from public.profiles profile
  where profile.id = p_user_id
  for update;

  if not found then
    raise exception 'User account not found';
  end if;

  -- The two updates share this transaction. If promotion fails, the original
  -- owner change is rolled back and ownership never becomes externally absent.
  update public.profiles
  set is_owner = false
  where id = v_actor_id;

  update public.profiles
  set is_admin = true,
      is_owner = true
  where id = p_user_id;

  insert into public.admin_access_events (
    action, actor_id, target_id, actor_email, target_email
  )
  select
    'transfer_ownership', actor.id, p_user_id, actor.email, v_target_email
  from public.profiles actor
  where actor.id = v_actor_id;
end;
$$;

revoke all on function public.protect_owner_profile() from public, anon, authenticated;
revoke all on function public.protect_admin_access_event() from public, anon, authenticated;
revoke all on function public.ensure_admin_owner() from public, anon, authenticated;
revoke all on function public.assert_owner() from public, anon, authenticated;
revoke all on function public.grant_admin_access_v2(uuid) from public, anon, authenticated;
revoke all on function public.revoke_admin_access_v2(uuid) from public, anon, authenticated;
revoke all on function public.transfer_admin_ownership_v2(uuid) from public, anon, authenticated;

grant execute on function public.grant_admin_access_v2(uuid) to authenticated;
grant execute on function public.revoke_admin_access_v2(uuid) to authenticated;
grant execute on function public.transfer_admin_ownership_v2(uuid) to authenticated;

comment on column public.profiles.is_owner is
  'Marks the single administrator who may manage admin access and transfer ownership.';

comment on table public.admin_access_events is
  'Immutable audit trail for administrator grants, revocations, and ownership transfers.';

comment on column public.admin_access_events.actor_id is
  'Snapshot of the acting profile ID; intentionally has no foreign key so the audit record survives profile deletion.';

comment on column public.admin_access_events.target_id is
  'Snapshot of the affected profile ID; intentionally has no foreign key so the audit record survives profile deletion.';

commit;
