-- Read-only post-deployment checks. Any violation aborts with a useful message.

begin;

do $$
begin
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
end;
$$;

rollback;
