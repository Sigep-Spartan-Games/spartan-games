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
    from public.teams t
    join public.seasons season on season.id = t.season_id
    left join lateral (
      select coalesce(sum(se.points), 0)::integer as points
      from public.score_events se
      join public.competition_weeks cw on cw.id = se.week_id
      where se.team_id = t.id
        and cw.starts_on = public.week_start((now() at time zone season.timezone)::date)
    ) current_week on true
    where t.weekly_points <> current_week.points
  ) then
    raise exception 'Invariant failed: weekly point projection is stale';
  end if;
end;
$$;

rollback;
