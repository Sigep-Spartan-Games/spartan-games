-- Wrapped aggregation and authorization checks. All fixture data is rolled back.

begin;

do $$
declare
  v_admin uuid;
  v_gold_user uuid;
  v_purple_user uuid;
  v_zero_user uuid;
  v_unrelated_user uuid;
  v_fixture_users uuid[];
  v_season uuid := gen_random_uuid();
  v_active_season uuid := gen_random_uuid();
  v_team uuid := gen_random_uuid();
  v_other_team uuid := gen_random_uuid();
  v_purple_team uuid := gen_random_uuid();
  v_active_team uuid := gen_random_uuid();
  v_week_one uuid := gen_random_uuid();
  v_week_two uuid := gen_random_uuid();
  v_activity uuid := gen_random_uuid();
  v_rule uuid := gen_random_uuid();
  v_submission_one uuid := gen_random_uuid();
  v_submission_two uuid := gen_random_uuid();
  v_submission_three uuid := gen_random_uuid();
  v_gold_submission uuid := gen_random_uuid();
  v_purple_submission uuid := gen_random_uuid();
  v_activity_key text := 'wrapped_' || substr(md5(gen_random_uuid()::text), 1, 20);
  v_result jsonb;
begin
  select profile.id into v_admin
  from public.profiles profile
  where profile.is_admin
  order by profile.is_owner desc, profile.created_at
  limit 1;

  if v_admin is null then
    raise exception 'Wrapped test requires an administrator profile';
  end if;

  if has_function_privilege(
       'authenticated',
       'public.build_season_wrapped_v1(uuid, uuid, boolean)',
       'EXECUTE'
     ) then
    raise exception 'Authenticated role can execute the internal Wrapped builder';
  end if;

  if has_function_privilege(
       'anon',
       'public.get_my_season_wrapped_v1(uuid)',
       'EXECUTE'
     ) then
    raise exception 'Anonymous role can execute the player Wrapped wrapper';
  end if;

  if to_regprocedure('public.get_season_wrapped_preview_v1(uuid, uuid)') is not null then
    raise exception 'Retired administrator Wrapped preview RPC still exists';
  end if;

  select array_agg(profile.id order by profile.created_at, profile.id)
  into v_fixture_users
  from public.profiles profile
  where profile.id <> v_admin
    and not profile.is_admin;

  if coalesce(cardinality(v_fixture_users), 0) < 4 then
    raise exception 'Wrapped test requires four non-admin fixture profiles';
  end if;

  v_gold_user := v_fixture_users[1];
  v_purple_user := v_fixture_users[2];
  v_zero_user := v_fixture_users[3];
  v_unrelated_user := v_fixture_users[4];

  insert into public.seasons (
    id, slug, name, status, starts_on, ends_on, archived_at,
    registration_open, submissions_open, daily_bonus_increment, max_streak_bonus
  ) values
    (
      v_season,
      'wrapped-complete-' || substr(md5(v_season::text), 1, 12),
      'Wrapped completed fixture',
      'active',
      '2026-01-05',
      '2026-01-18',
      now(),
      true,
      true,
      1,
      10
    ),
    (
      v_active_season,
      'wrapped-active-' || substr(md5(v_active_season::text), 1, 12),
      'Wrapped active fixture',
      'active',
      '2026-02-02',
      null,
      now(),
      true,
      true,
      1,
      10
    );

  insert into public.season_tiers (season_id, tier_key, weekly_goal)
  values
    (v_season, 'gold', 25),
    (v_season, 'purple', 25),
    (v_active_season, 'gold', 25);

  insert into public.teams (id, season_id, name, tier)
  values
    (v_team, v_season, 'Wrapped Alpha ' || substr(v_team::text, 1, 8), 'gold'),
    (v_other_team, v_season, 'Wrapped Beta ' || substr(v_other_team::text, 1, 8), 'gold'),
    (v_purple_team, v_season, 'Wrapped Purple ' || substr(v_purple_team::text, 1, 8), 'purple'),
    (v_active_team, v_active_season, 'Wrapped Live ' || substr(v_active_team::text, 1, 8), 'gold');

  insert into public.team_memberships (
    team_id, season_id, user_id, role, display_name_snapshot, joined_at
  ) values
    (v_team, v_season, v_admin, 'captain', 'Wrapped Tester', '2026-01-04 12:00:00+00'),
    (v_team, v_season, v_zero_user, 'member', 'Wrapped Zero', '2026-01-04 12:01:00+00'),
    (v_other_team, v_season, v_gold_user, 'captain', 'Wrapped Gold Peer', '2026-01-04 12:02:00+00'),
    (v_purple_team, v_season, v_purple_user, 'captain', 'Wrapped Purple Leader', '2026-01-04 12:03:00+00'),
    (v_active_team, v_active_season, v_admin, 'captain', 'Wrapped Tester', '2026-02-01 12:00:00+00');

  insert into public.competition_weeks (
    id, season_id, starts_on, ends_on, label, status, finalized_at
  ) values
    (v_week_one, v_season, '2026-01-05', '2026-01-11', 'Jan 5 - 11, 2026', 'finalized', now()),
    (v_week_two, v_season, '2026-01-12', '2026-01-18', 'Jan 12 - 18, 2026', 'finalized', now());

  insert into public.activities (
    id, key, label, measurement_type, unit_label, min_value, step_value
  ) values (
    v_activity, v_activity_key, 'Wrapped Miles', 'number', 'miles', 1, 1
  );

  insert into public.scoring_rule_versions (
    id, activity_id, season_id, points_per_unit, teammate_multiplier, effective_from
  ) values (
    v_rule, v_activity, v_season, 1, 1.5, '2026-01-01 00:00:00+00'
  );

  insert into public.submissions (
    id, team_id, submitted_by, submitted_by_name, base_points, points_awarded,
    activity_key, activity_date, activity_value_number, points_per_unit,
    teammate_bonus, did_with_teammate, season_id, week_id, activity_id,
    scoring_rule_version_id, submission_kind, created_at
  ) values
    (
      v_submission_one, v_team, v_admin, 'Wrapped Tester', 10, 10,
      v_activity_key, '2026-01-05', 10, 1, 1.5, false,
      v_season, v_week_one, v_activity, v_rule, 'activity', '2026-01-05 12:00:00+00'
    ),
    (
      v_submission_two, v_team, v_admin, 'Wrapped Tester', 10, 15,
      v_activity_key, '2026-01-06', 10, 1, 1.5, true,
      v_season, v_week_one, v_activity, v_rule, 'activity', '2026-01-06 12:00:00+00'
    ),
    (
      v_submission_three, v_team, v_admin, 'Wrapped Tester', 20, 20,
      v_activity_key, '2026-01-13', 20, 1, 1.5, false,
      v_season, v_week_two, v_activity, v_rule, 'activity', '2026-01-13 12:00:00+00'
    ),
    (
      v_gold_submission, v_other_team, v_gold_user, 'Wrapped Gold Peer', 49, 49,
      v_activity_key, '2026-01-07', 49, 1, 1.5, false,
      v_season, v_week_one, v_activity, v_rule, 'activity', '2026-01-07 13:00:00+00'
    ),
    (
      v_purple_submission, v_purple_team, v_purple_user, 'Wrapped Purple Leader', 100, 100,
      v_activity_key, '2026-01-08', 100, 1, 1.5, false,
      v_season, v_week_one, v_activity, v_rule, 'activity', '2026-01-08 13:00:00+00'
    );

  insert into public.score_events (
    season_id, week_id, team_id, actor_id, activity_id,
    event_type, source_submission_id, points, metadata, created_at
  ) values
    (v_season, v_week_one, v_team, v_admin, null, 'streak_bonus', v_submission_one, 1, '{"streak_count": 1}'::jsonb, '2026-01-05 12:00:01+00'),
    (v_season, v_week_one, v_team, v_admin, null, 'streak_bonus', v_submission_two, 2, '{"streak_count": 2}'::jsonb, '2026-01-06 12:00:01+00'),
    (v_season, v_week_two, v_team, v_admin, null, 'streak_bonus', v_submission_three, 1, '{"streak_count": 1}'::jsonb, '2026-01-13 12:00:01+00'),
    (v_season, v_week_one, v_other_team, null, null, 'admin_adjustment', null, 20, '{}'::jsonb, '2026-01-07 12:00:00+00'),
    (v_season, v_week_two, v_other_team, null, null, 'admin_adjustment', null, 10, '{}'::jsonb, '2026-01-14 12:00:00+00');

  insert into public.team_streaks (team_id, streak_count, last_activity_date)
  values (v_team, 1, '2026-01-13');

  insert into public.team_week_results (
    season_id, week_id, team_id, tier_key, points, goal_points, rank, won, streak_count
  ) values
    (v_season, v_week_one, v_team, 'gold', 28, 25, 1, true, 2),
    (v_season, v_week_one, v_other_team, 'gold', 20, 25, 2, false, 0),
    (v_season, v_week_one, v_purple_team, 'purple', 100, 25, 1, true, 1),
    (v_season, v_week_two, v_team, 'gold', 21, 25, 1, true, 1),
    (v_season, v_week_two, v_other_team, 'gold', 10, 25, 2, false, 0);

  update public.seasons
  set
    status = 'finalizing',
    registration_open = false,
    submissions_open = false,
    archived_at = now()
  where id = v_season;

  insert into public.season_champions (
    season_id, tier_key, team_id, team_name_snapshot,
    weekly_wins, season_points, goals_met, decision_method
  ) values (
    v_season, 'gold', v_team, 'Wrapped Alpha', 2, 49, 1, 'automatic'
  ), (
    v_season, 'purple', v_purple_team, 'Wrapped Purple', 1, 100, 1, 'automatic'
  );

  update public.seasons
  set status = 'completed'
  where id = v_season;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_result := public.get_my_season_wrapped_v1(v_season);

  if v_result->>'status' <> 'ready'
     or (v_result#>>'{personal,points}')::integer <> 49
     or (v_result#>>'{personal,activity_count}')::integer <> 3
     or (v_result#>>'{personal,active_days}')::integer <> 3
     or (v_result#>>'{personal,longest_active_day_run}')::integer <> 2
     or (v_result#>>'{personal,teammate_bonus_points}')::integer <> 5
     or (v_result#>>'{personal,contribution_rank}')::integer <> 2
     or (v_result#>>'{personal,participant_count}')::integer <> 4
     or (v_result#>>'{personal,overall_contribution_rank}')::integer <> 2
     or (v_result#>>'{personal,overall_participant_count}')::integer <> 4
     or (v_result#>>'{personal,tier_contribution_rank}')::integer <> 1
     or (v_result#>>'{personal,tier_participant_count}')::integer <> 3
     or v_result#>>'{personal,contribution_tier}' <> 'gold'
     or (v_result#>>'{team,longest_streak}')::integer <> 2
     or (v_result#>>'{team,weeks_won}')::integer <> 2
     or (v_result#>>'{team,is_champion}')::boolean is not true then
    raise exception 'Completed Wrapped aggregate is incorrect: %', v_result;
  end if;

  if v_result#>>'{personal,top_activity,label}' <> 'Wrapped Miles'
     or (v_result#>>'{personal,top_activity,numeric_total}')::numeric <> 40 then
    raise exception 'Wrapped activity aggregate is incorrect: %', v_result;
  end if;

  v_result := public.build_season_wrapped_v1(v_season, v_gold_user, false);
  if (v_result#>>'{personal,overall_contribution_rank}')::integer <> 2
     or (v_result#>>'{personal,tier_contribution_rank}')::integer <> 1 then
    raise exception 'Tied contributor ranks are incorrect: %', v_result;
  end if;

  v_result := public.build_season_wrapped_v1(v_season, v_purple_user, false);
  if (v_result#>>'{personal,overall_contribution_rank}')::integer <> 1
     or (v_result#>>'{personal,overall_participant_count}')::integer <> 4
     or (v_result#>>'{personal,tier_contribution_rank}')::integer <> 1
     or (v_result#>>'{personal,tier_participant_count}')::integer <> 1
     or v_result#>>'{personal,contribution_tier}' <> 'purple' then
    raise exception 'Cross-tier contributor ranks are incorrect: %', v_result;
  end if;

  v_result := public.build_season_wrapped_v1(v_season, v_zero_user, false);
  if (v_result#>>'{personal,points}')::integer <> 0
     or (v_result#>>'{personal,overall_contribution_rank}')::integer <> 4
     or (v_result#>>'{personal,overall_participant_count}')::integer <> 4
     or (v_result#>>'{personal,tier_contribution_rank}')::integer <> 3
     or (v_result#>>'{personal,tier_participant_count}')::integer <> 3 then
    raise exception 'Zero-point eligible participant was not ranked and counted correctly: %', v_result;
  end if;

  v_result := public.get_my_season_wrapped_v1(v_active_season);
  if v_result->>'status' <> 'locked' then
    raise exception 'Active season was not locked for a player: %', v_result;
  end if;

  if v_unrelated_user is not null then
    perform set_config('request.jwt.claim.sub', v_unrelated_user::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);

    v_result := public.get_my_season_wrapped_v1(v_season);
    if v_result->>'status' <> 'not_eligible' then
      raise exception 'Unrelated user received a Wrapped payload: %', v_result;
    end if;
  end if;
end;
$$;

rollback;
