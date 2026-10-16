-- Wrapped aggregation and authorization checks. All fixture data is rolled back.

begin;

do $$
declare
  v_admin uuid;
  v_other_user uuid;
  v_season uuid := gen_random_uuid();
  v_active_season uuid := gen_random_uuid();
  v_team uuid := gen_random_uuid();
  v_other_team uuid := gen_random_uuid();
  v_active_team uuid := gen_random_uuid();
  v_week_one uuid := gen_random_uuid();
  v_week_two uuid := gen_random_uuid();
  v_activity uuid := gen_random_uuid();
  v_rule uuid := gen_random_uuid();
  v_submission_one uuid := gen_random_uuid();
  v_submission_two uuid := gen_random_uuid();
  v_submission_three uuid := gen_random_uuid();
  v_activity_key text := 'wrapped_' || substr(md5(gen_random_uuid()::text), 1, 20);
  v_result jsonb;
  v_rejected boolean := false;
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

  select profile.id into v_other_user
  from public.profiles profile
  where profile.id <> v_admin
    and not profile.is_admin
  order by profile.created_at
  limit 1;

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
    (v_active_season, 'gold', 25);

  insert into public.teams (id, season_id, name, tier)
  values
    (v_team, v_season, 'Wrapped Alpha ' || substr(v_team::text, 1, 8), 'gold'),
    (v_other_team, v_season, 'Wrapped Beta ' || substr(v_other_team::text, 1, 8), 'gold'),
    (v_active_team, v_active_season, 'Wrapped Live ' || substr(v_active_team::text, 1, 8), 'gold');

  insert into public.team_memberships (
    team_id, season_id, user_id, role, display_name_snapshot, joined_at
  ) values
    (v_team, v_season, v_admin, 'captain', 'Wrapped Tester', '2026-01-04 12:00:00+00'),
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
     or (v_result#>>'{team,longest_streak}')::integer <> 2
     or (v_result#>>'{team,weeks_won}')::integer <> 2
     or (v_result#>>'{team,is_champion}')::boolean is not true then
    raise exception 'Completed Wrapped aggregate is incorrect: %', v_result;
  end if;

  if v_result#>>'{personal,top_activity,label}' <> 'Wrapped Miles'
     or (v_result#>>'{personal,top_activity,numeric_total}')::numeric <> 40 then
    raise exception 'Wrapped activity aggregate is incorrect: %', v_result;
  end if;

  v_result := public.get_my_season_wrapped_v1(v_active_season);
  if v_result->>'status' <> 'locked' then
    raise exception 'Active season was not locked for a player: %', v_result;
  end if;

  v_result := public.get_season_wrapped_preview_v1(v_active_season, v_admin);
  if v_result->>'status' <> 'ready'
     or coalesce((v_result->>'preview')::boolean, false) is not true then
    raise exception 'Admin live preview failed: %', v_result;
  end if;

  if v_other_user is not null then
    perform set_config('request.jwt.claim.sub', v_other_user::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);

    v_result := public.get_my_season_wrapped_v1(v_season);
    if v_result->>'status' <> 'not_eligible' then
      raise exception 'Unrelated user received a Wrapped payload: %', v_result;
    end if;

    begin
      perform public.get_season_wrapped_preview_v1(v_season, v_admin);
    exception
      when others then
        if sqlstate = '42501' or sqlerrm like '%Administrator access required%' then
          v_rejected := true;
        else
          raise;
        end if;
    end;

    if not v_rejected then
      raise exception 'Non-admin was allowed to call Wrapped preview';
    end if;
  end if;
end;
$$;

rollback;
