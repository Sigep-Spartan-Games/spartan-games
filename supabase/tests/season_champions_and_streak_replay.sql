-- Focused behavior checks for champion ranking and streak replay.
-- This file creates isolated archived fixture seasons and always rolls back.

begin;

do $$
declare
  v_champion_season uuid := gen_random_uuid();
  v_streak_season uuid := gen_random_uuid();
  v_week_one uuid := gen_random_uuid();
  v_week_two uuid := gen_random_uuid();
  v_streak_week uuid := gen_random_uuid();
  v_gold_a uuid := gen_random_uuid();
  v_gold_b uuid := gen_random_uuid();
  v_purple_a uuid := gen_random_uuid();
  v_purple_b uuid := gen_random_uuid();
  v_red_a uuid := gen_random_uuid();
  v_red_b uuid := gen_random_uuid();
  v_streak_team uuid := gen_random_uuid();
  v_activity uuid := gen_random_uuid();
  v_rule uuid := gen_random_uuid();
  v_submission_one uuid := gen_random_uuid();
  v_submission_two uuid := gen_random_uuid();
  v_submission_backdated uuid := gen_random_uuid();
  v_activity_key text := 'test_' || substr(md5(gen_random_uuid()::text), 1, 20);
  v_count integer;
  v_mutation_rejected boolean := false;
begin
  insert into public.seasons (
    id, slug, name, status, starts_on, archived_at,
    registration_open, submissions_open, daily_bonus_increment, max_streak_bonus
  ) values
    (
      v_champion_season,
      'test-champions-' || substr(md5(v_champion_season::text), 1, 12),
      'Champion behavior test',
      'active',
      '2026-01-05',
      now(),
      false,
      false,
      1,
      10
    ),
    (
      v_streak_season,
      'test-streak-' || substr(md5(v_streak_season::text), 1, 12),
      'Streak behavior test',
      'active',
      '2026-01-05',
      now(),
      false,
      false,
      1,
      10
    );

  insert into public.season_tiers (season_id, tier_key, weekly_goal)
  select fixture.season_id, tier.key, 100
  from (values (v_champion_season), (v_streak_season)) fixture(season_id)
  cross join public.tiers tier
  where tier.key in ('gold', 'purple', 'red');

  insert into public.teams (id, season_id, name, tier, invite_code)
  values
    (v_gold_a, v_champion_season, 'Test Gold A ' || substr(v_gold_a::text, 1, 8), 'gold', null),
    (v_gold_b, v_champion_season, 'Test Gold B ' || substr(v_gold_b::text, 1, 8), 'gold', null),
    (v_purple_a, v_champion_season, 'Test Purple A ' || substr(v_purple_a::text, 1, 8), 'purple', null),
    (v_purple_b, v_champion_season, 'Test Purple B ' || substr(v_purple_b::text, 1, 8), 'purple', null),
    (v_red_a, v_champion_season, 'Test Red A ' || substr(v_red_a::text, 1, 8), 'red', null),
    (v_red_b, v_champion_season, 'Test Red B ' || substr(v_red_b::text, 1, 8), 'red', null),
    (v_streak_team, v_streak_season, 'Test Streak ' || substr(v_streak_team::text, 1, 8), 'gold', null);

  insert into public.competition_weeks (
    id, season_id, starts_on, ends_on, label, status, finalized_at
  ) values
    (v_week_one, v_champion_season, '2026-01-05', '2026-01-11', 'Test week 1', 'finalized', now()),
    (v_week_two, v_champion_season, '2026-01-12', '2026-01-18', 'Test week 2', 'finalized', now()),
    (v_streak_week, v_streak_season, '2026-01-05', '2026-01-11', 'Test streak week', 'open', null);

  insert into public.team_week_results (
    season_id, week_id, team_id, tier_key, points, goal_points,
    rank, won, streak_count
  ) values
    (v_champion_season, v_week_one, v_gold_a, 'gold', 100, 100, 1, true, 1),
    (v_champion_season, v_week_two, v_gold_a, 'gold', 100, 100, 1, true, 1),
    (v_champion_season, v_week_one, v_gold_b, 'gold', 150, 100, 1, true, 1),
    (v_champion_season, v_week_two, v_gold_b, 'gold', 150, 100, 2, false, 1),
    (v_champion_season, v_week_one, v_purple_a, 'purple', 100, 100, 1, true, 1),
    (v_champion_season, v_week_two, v_purple_a, 'purple', 100, 100, 2, false, 1),
    (v_champion_season, v_week_one, v_purple_b, 'purple', 150, 100, 1, true, 1),
    (v_champion_season, v_week_two, v_purple_b, 'purple', 50, 100, 2, false, 1),
    (v_champion_season, v_week_one, v_red_a, 'red', 100, 100, 1, true, 1),
    (v_champion_season, v_week_one, v_red_b, 'red', 100, 100, 1, true, 1);

  select count(*) into v_count
  from public.season_champion_candidates_internal(v_champion_season) candidate
  where candidate.tier_key = 'gold'
    and candidate.team_id = v_gold_a
    and candidate.tied_count = 1;
  if v_count <> 1 then
    raise exception 'Champion test failed: weekly wins did not outrank season points';
  end if;

  select count(*) into v_count
  from public.season_champion_candidates_internal(v_champion_season) candidate
  where candidate.tier_key = 'purple'
    and candidate.team_id = v_purple_a
    and candidate.tied_count = 1;
  if v_count <> 1 then
    raise exception 'Champion test failed: goals met did not resolve equal wins and points';
  end if;

  select count(*) into v_count
  from public.season_champion_candidates_internal(v_champion_season) candidate
  where candidate.tier_key = 'red'
    and candidate.tied_count = 2;
  if v_count <> 2 then
    raise exception 'Champion test failed: exact tie was not preserved for admin selection';
  end if;

  update public.seasons set status = 'finalizing' where id = v_champion_season;

  insert into public.season_champions (
    season_id, tier_key, team_id, team_name_snapshot,
    weekly_wins, season_points, goals_met, decision_method
  )
  select
    v_champion_season, candidate.tier_key, candidate.team_id,
    candidate.team_name, candidate.weekly_wins, candidate.season_points,
    candidate.goals_met, 'automatic'
  from public.season_champion_candidates_internal(v_champion_season) candidate
  where candidate.tier_key = 'gold';

  begin
    update public.season_champions
    set team_name_snapshot = 'Mutation should fail'
    where season_id = v_champion_season and tier_key = 'gold';
  exception when others then
    v_mutation_rejected := true;
  end;

  if not v_mutation_rejected then
    raise exception 'Champion test failed: finalized champion was mutable';
  end if;

  insert into public.activities (
    id, key, label, measurement_type, min_value, step_value
  ) values (
    v_activity, v_activity_key, 'Streak test activity', 'number', 1, 1
  );

  insert into public.scoring_rule_versions (
    id, activity_id, season_id, points_per_unit, teammate_multiplier, effective_from
  ) values (
    v_rule, v_activity, v_streak_season, 1, 1, '2026-01-01 00:00:00+00'
  );

  insert into public.submissions (
    id, team_id, submitted_by_name, base_points, points_awarded,
    activity_key, activity_date, activity_value_number, points_per_unit,
    teammate_bonus, season_id, week_id, activity_id,
    scoring_rule_version_id, submission_kind, created_at
  ) values
    (
      v_submission_one, v_streak_team, 'Test member', 1, 1,
      v_activity_key, '2026-01-05', 1, 1, 1,
      v_streak_season, v_streak_week, v_activity, v_rule, 'activity',
      '2026-01-05 12:00:00+00'
    ),
    (
      v_submission_two, v_streak_team, 'Test member', 1, 1,
      v_activity_key, '2026-01-06', 1, 1, 1,
      v_streak_season, v_streak_week, v_activity, v_rule, 'activity',
      '2026-01-06 12:00:00+00'
    ),
    (
      v_submission_backdated, v_streak_team, 'Test member', 1, 1,
      v_activity_key, '2026-01-05', 1, 1, 1,
      v_streak_season, v_streak_week, v_activity, v_rule, 'activity',
      '2026-01-07 12:00:00+00'
    );

  perform public.rebuild_team_streaks_internal(array[v_streak_team]::uuid[]);

  select count(*) into v_count
  from public.score_events event
  where event.team_id = v_streak_team
    and event.event_type = 'streak_bonus'
    and event.points in (1, 2);
  if v_count <> 2 then
    raise exception 'Streak test failed: received-order replay produced incorrect bonuses';
  end if;

  if not exists (
    select 1 from public.team_streaks streak
    where streak.team_id = v_streak_team
      and streak.streak_count = 2
      and streak.last_activity_date = '2026-01-06'
  ) then
    raise exception 'Streak test failed: rebuilt streak state is incorrect';
  end if;

  update public.submissions set voided_at = now() where id = v_submission_two;
  perform public.rebuild_team_streaks_internal(array[v_streak_team]::uuid[]);

  select coalesce(sum(event.points), 0)::integer into v_count
  from public.score_events event
  where event.team_id = v_streak_team
    and event.event_type = 'streak_bonus';
  if v_count <> 1 then
    raise exception 'Streak test failed: void replay did not remove downstream bonuses';
  end if;

  if not exists (
    select 1 from public.team_streaks streak
    where streak.team_id = v_streak_team
      and streak.streak_count = 1
      and streak.last_activity_date = '2026-01-05'
  ) then
    raise exception 'Streak test failed: void replay left stale streak state';
  end if;
end;
$$;

rollback;
