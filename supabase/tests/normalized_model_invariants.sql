-- Read-only post-deployment checks. Any violation aborts with a useful message.

begin;

do $$
begin
  if exists (
    select 1 from public.profiles where is_owner and not is_admin
  ) then
    raise exception 'Invariant failed: owner is not an administrator';
  end if;

  if (select count(*) from public.profiles where is_owner) > 1 then
    raise exception 'Invariant failed: multiple application owners exist';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.profiles'::regclass
      and constraint_row.conname = 'profiles_owner_requires_admin'
      and constraint_row.contype = 'c'
  ) then
    raise exception 'Invariant failed: owner/admin constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_indexes index_row
    where index_row.schemaname = 'public'
      and index_row.tablename = 'profiles'
      and index_row.indexname = 'profiles_single_owner_idx'
      and index_row.indexdef like 'CREATE UNIQUE INDEX%WHERE is_owner'
  ) then
    raise exception 'Invariant failed: single-owner index is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger_row
    where trigger_row.tgrelid = 'public.profiles'::regclass
      and trigger_row.tgname in ('profiles_protect_owner', 'profiles_require_owner')
      and not trigger_row.tgisinternal
    group by trigger_row.tgrelid
    having count(*) = 2
  ) then
    raise exception 'Invariant failed: owner protection trigger is missing';
  end if;

  if exists (select 1 from public.profiles where is_admin)
     and not exists (select 1 from public.profiles where is_owner) then
    raise exception 'Invariant failed: administrators exist without an owner';
  end if;

  if to_regprocedure('public.grant_admin_access_v2(uuid)') is null
     or to_regprocedure('public.revoke_admin_access_v2(uuid)') is null
     or to_regprocedure('public.transfer_admin_ownership_v2(uuid)') is null then
    raise exception 'Invariant failed: admin access management RPC is missing';
  end if;

  if not has_function_privilege(
    'authenticated', 'public.grant_admin_access_v2(uuid)', 'EXECUTE'
  ) or not has_function_privilege(
    'authenticated', 'public.revoke_admin_access_v2(uuid)', 'EXECUTE'
  ) or not has_function_privilege(
    'authenticated', 'public.transfer_admin_ownership_v2(uuid)', 'EXECUTE'
  ) or has_function_privilege(
    'anon', 'public.grant_admin_access_v2(uuid)', 'EXECUTE'
  ) or has_function_privilege(
    'anon', 'public.revoke_admin_access_v2(uuid)', 'EXECUTE'
  ) or has_function_privilege(
    'anon', 'public.transfer_admin_ownership_v2(uuid)', 'EXECUTE'
  ) then
    raise exception 'Invariant failed: admin access RPC grants are incorrect';
  end if;

  if not exists (
    select 1
    from pg_class table_row
    join pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
    where namespace_row.nspname = 'public'
      and table_row.relname = 'admin_access_events'
      and table_row.relrowsecurity
  ) then
    raise exception 'Invariant failed: admin access audit trail or RLS is missing';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.admin_access_events', 'SELECT'
  ) or has_table_privilege(
    'authenticated', 'public.admin_access_events', 'INSERT'
  ) or has_table_privilege(
    'authenticated', 'public.admin_access_events', 'UPDATE'
  ) or has_table_privilege(
    'authenticated', 'public.admin_access_events', 'DELETE'
  ) then
    raise exception 'Invariant failed: admin access audit grants are incorrect';
  end if;

  if not has_table_privilege(
    'service_role', 'public.admin_access_events', 'SELECT'
  ) or has_table_privilege(
    'service_role', 'public.admin_access_events', 'INSERT'
  ) or has_table_privilege(
    'service_role', 'public.admin_access_events', 'UPDATE'
  ) or has_table_privilege(
    'service_role', 'public.admin_access_events', 'DELETE'
  ) then
    raise exception 'Invariant failed: service role has mutable audit-table grants';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger_row
    where trigger_row.tgrelid = 'public.admin_access_events'::regclass
      and trigger_row.tgname = 'admin_access_events_prevent_mutation'
      and not trigger_row.tgisinternal
  ) then
    raise exception 'Invariant failed: admin access audit trail is mutable';
  end if;

  if exists (
    select 1
    from information_schema.routine_privileges privilege
    where privilege.routine_schema = 'public'
      and privilege.routine_name in (
        'assert_owner',
        'protect_admin_access_event',
        'protect_owner_profile',
        'ensure_admin_owner'
      )
      and privilege.grantee in ('PUBLIC', 'anon', 'authenticated')
  ) then
    raise exception 'Invariant failed: internal owner function is directly executable';
  end if;

  if exists (select 1 from public.teams where season_id is null) then
    raise exception 'Invariant failed: team without a season';
  end if;

  if exists (
    select season_id, user_id
    from public.team_memberships
    where left_at is null and user_id is not null
    group by season_id, user_id
    having count(*) > 1
  ) then
    raise exception 'Invariant failed: user has multiple active teams in one season';
  end if;

  if exists (
    select team_id
    from public.team_memberships
    where left_at is null
    group by team_id
    having count(*) > 2
  ) then
    raise exception 'Invariant failed: a team has more than two active members';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger
    where trigger.tgrelid = 'public.team_memberships'::regclass
      and trigger.tgname = 'team_memberships_enforce_capacity'
      and not trigger.tgisinternal
  ) then
    raise exception 'Invariant failed: team capacity trigger is missing';
  end if;

  if exists (
    select 1
    from public.team_memberships tm
    join public.teams t on t.id = tm.team_id
    where tm.season_id <> t.season_id
  ) then
    raise exception 'Invariant failed: membership season differs from team season';
  end if;

  if exists (
    select 1
    from public.submissions s
    where s.season_id is null or s.week_id is null
      or (s.submission_kind = 'activity' and (
        s.activity_id is null or s.scoring_rule_version_id is null
      ))
  ) then
    raise exception 'Invariant failed: submission is missing canonical references';
  end if;

  if exists (
    select 1
    from public.submissions s
    left join public.score_events se
      on se.source_submission_id = s.id and se.event_type = 'activity'
    where s.submission_kind = 'activity'
      and s.voided_at is null
      and (se.id is null or se.points <> s.points_awarded)
  ) then
    raise exception 'Invariant failed: active submission and activity ledger disagree';
  end if;

  if exists (
    select 1
    from public.score_events se
    join public.submissions s on s.id = se.source_submission_id
    where s.voided_at is not null
  ) then
    raise exception 'Invariant failed: voided submission still has ledger events';
  end if;

  if exists (
    select 1
    from public.submission_attachments attachment
    join public.submissions submission on submission.id = attachment.submission_id
    where submission.voided_at is not null
      and attachment.deleted_at is null
  ) then
    raise exception 'Invariant failed: voided submission proof is not queued for cleanup';
  end if;

  if exists (
    select 1
    from public.submission_edit_requests request
    join public.submissions submission on submission.id = request.submission_id
    where request.request_type = 'delete'
      and request.status = 'approved'
      and submission.voided_at is null
  ) then
    raise exception 'Invariant failed: approved deletion request has an active submission';
  end if;

  if exists (
    select 1
    from public.score_events se
    join public.teams t on t.id = se.team_id
    join public.competition_weeks cw on cw.id = se.week_id
    where se.season_id <> t.season_id
       or cw.season_id <> se.season_id
  ) then
    raise exception 'Invariant failed: score event references disagree on season';
  end if;

  if exists (
    select 1
    from public.team_week_results twr
    join public.teams t on t.id = twr.team_id
    join public.competition_weeks cw on cw.id = twr.week_id
    where twr.season_id <> t.season_id
       or cw.season_id <> twr.season_id
  ) then
    raise exception 'Invariant failed: finalized result references disagree on season';
  end if;

  if exists (
    select 1
    from public.team_week_results result
    where result.points <> coalesce((
      select sum(event.points)
      from public.score_events event
      where event.team_id = result.team_id
        and event.week_id = result.week_id
    ), 0)
  ) then
    raise exception 'Invariant failed: finalized weekly points disagree with the score ledger';
  end if;

  if exists (
    select 1
    from (values
      ('activity_rules'),
      ('game_settings'),
      ('streak_settings'),
      ('tier_settings'),
      ('weekly_history')
    ) legacy(table_name)
    where to_regclass('public.' || legacy.table_name) is not null
  ) then
    raise exception 'Invariant failed: legacy compatibility table still exists';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosrc ~ 'public\.(activity_rules|game_settings|streak_settings|tier_settings|weekly_history)'
  ) then
    raise exception 'Invariant failed: a public routine still references a legacy table';
  end if;

  if to_regprocedure('public.sync_legacy_team_members(uuid)') is not null
     or to_regprocedure('public.rebuild_team_point_projection(uuid)') is not null
     or to_regprocedure('public.score_event_projection_trigger()') is not null then
    raise exception 'Invariant failed: a retired compatibility routine still exists';
  end if;

  if exists (
    select 1
    from information_schema.columns c
    join (values
      ('teams', 'member1_id'),
      ('teams', 'member1_name'),
      ('teams', 'member2_id'),
      ('teams', 'member2_name'),
      ('teams', 'weekly_points'),
      ('teams', 'total_points'),
      ('teams', 'weeks_won'),
      ('teams', 'streak_count'),
      ('teams', 'last_activity_date'),
      ('submissions', 'activity'),
      ('submissions', 'activity_units'),
      ('submission_edit_requests', 'team_id')
    ) legacy(table_name, column_name)
      on legacy.table_name = c.table_name
     and legacy.column_name = c.column_name
    where c.table_schema = 'public'
  ) then
    raise exception 'Invariant failed: deprecated compatibility column still exists';
  end if;

  if exists (
    select 1
    from public.submission_edit_requests
    where suggested_changes ? 'activity_units'
  ) then
    raise exception 'Invariant failed: edit request uses the retired numeric-value key';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_submission_edit_v2'
      and p.prosrc like '%activity_units%'
  ) then
    raise exception 'Invariant failed: edit request RPC still accepts the retired numeric-value key';
  end if;

  if to_regprocedure('public.close_current_season_v2()') is null then
    raise exception 'Invariant failed: coordinated season-close RPC is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'recalculate_week_results'
      and p.prosrc like '%team.archived_at is null%'
  ) then
    raise exception 'Invariant failed: week finalization does not exclude archived teams';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_season_controls_v2'
      and p.prosrc like '%close_current_season_v2%'
  ) then
    raise exception 'Invariant failed: season completion can bypass coordinated close';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_season_controls_v2'
      and p.prosrc like '%Completed seasons cannot be reopened%'
      and p.prosrc like '%Invalid season transition%'
  ) then
    raise exception 'Invariant failed: season lifecycle is not one-way';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'change_team_tier_v2'
      and p.prosrc like '%Only admins can change a team tier after the games start%'
  ) then
    raise exception 'Invariant failed: participant tier changes are not frozen after start';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'leave_team_v2'
      and p.prosrc like '%cannot leave or switch teams after submitting an activity%'
  ) then
    raise exception 'Invariant failed: submitted participants are not roster-locked';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'start_new_season_v2'
      and p.prosrc like '%close_current_season_v2%'
  ) then
    raise exception 'Invariant failed: season rollover can bypass coordinated close';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'resolve_submission_edit_request_v2'
      and p.prosrc like '%void_submission_v2%'
  ) then
    raise exception 'Invariant failed: deletion approval does not void its submission';
  end if;

  if to_regprocedure('public.recalculate_week_results(uuid,boolean)') is null then
    raise exception 'Invariant failed: canonical weekly-result recalculation routine is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'finalize_competition_week'
      and p.prosrc like '%recalculate_week_results%'
  ) then
    raise exception 'Invariant failed: normal finalization bypasses canonical result calculation';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_update_submission_v2'
      and p.prosrc like '%recalculate_week_results%'
  ) then
    raise exception 'Invariant failed: admin submission edits do not refresh finalized history';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'void_submission_v2'
      and p.prosrc like '%recalculate_week_results%'
  ) then
    raise exception 'Invariant failed: submission voids do not refresh finalized history';
  end if;
end;
$$;

rollback;
