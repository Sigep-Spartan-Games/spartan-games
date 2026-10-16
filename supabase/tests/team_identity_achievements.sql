-- Team identity and achievement contract checks. All fixture data is rolled back.

begin;

do $$
declare
  v_captain uuid;
  v_member uuid;
  v_season uuid := gen_random_uuid();
  v_team uuid := gen_random_uuid();
  v_progress jsonb;
  v_profile jsonb;
  v_level text;
  v_rejected boolean := false;
begin
  select id into v_captain from public.profiles order by is_admin desc, created_at limit 1;
  select id into v_member from public.profiles where id <> v_captain and not is_admin order by created_at limit 1;
  if v_captain is null or v_member is null then
    raise exception 'Achievement test requires two fixture profiles';
  end if;

  if has_function_privilege('authenticated', 'public.build_achievement_progress_internal(uuid,uuid,uuid)', 'EXECUTE') then
    raise exception 'Authenticated role can execute the internal achievement builder';
  end if;
  if has_function_privilege('anon', 'public.get_team_profile_v1(uuid)', 'EXECUTE') then
    raise exception 'Anonymous role can read team profiles';
  end if;

  insert into public.seasons (
    id, slug, name, status, starts_on, ends_on, registration_open,
    submissions_open, archived_at
  ) values (
    v_season, 'achievement-test-' || substr(md5(v_season::text), 1, 12),
    'Achievement Test', 'active', '2026-01-05', '2026-03-15', true, true, now()
  );

  if (select thresholds from public.season_achievement_rules where season_id = v_season and achievement_key = 'weekly_winners') <> array[1,2,3,5] then
    raise exception 'Weekly Winners thresholds are not 1/2/3/5';
  end if;
  if public.achievement_level_internal(array[1,2,3,5], 0, null) is not null
    or public.achievement_level_internal(array[1,2,3,5], 1, null) <> 'bronze'
    or public.achievement_level_internal(array[1,2,3,5], 2, null) <> 'silver'
    or public.achievement_level_internal(array[1,2,3,5], 3, null) <> 'gold'
    or public.achievement_level_internal(array[1,2,3,5], 4, null) <> 'gold'
    or public.achievement_level_internal(array[1,2,3,5], 5, null) <> 'platinum' then
    raise exception 'Weekly Winners exact threshold boundaries failed';
  end if;
  if public.achievement_level_internal(array[25,50,100,200], 24, null) is not null
    or public.achievement_level_internal(array[25,50,100,200], 25, null) <> 'bronze'
    or public.achievement_level_internal(array[25,50,100,200], 200, null) <> 'platinum' then
    raise exception 'Dedicated exact threshold boundaries failed';
  end if;
  if exists (select 1 from public.season_achievement_rules where season_id = v_season and achievement_key = 'wrapped_and_ready') then
    raise exception 'Retired Wrapped and Ready achievement was snapshotted';
  end if;
  if exists (select 1 from public.season_achievement_rules where season_id = v_season and achievement_key = 'personal_best') then
    raise exception 'Personal Best must remain a callout, not a permanent achievement';
  end if;

  insert into public.teams (id, season_id, name, tier)
  values (v_team, v_season, 'Achievement Test Team ' || substr(v_team::text, 1, 6), 'gold');
  insert into public.team_memberships (team_id, season_id, user_id, role, display_name_snapshot)
  values
    (v_team, v_season, v_captain, 'captain', 'Test Captain'),
    (v_team, v_season, v_member, 'member', 'Test Member');

  insert into public.competition_weeks (season_id, starts_on, ends_on, label, status, finalized_at)
  select v_season, ('2026-01-05'::date + (week_number::integer * 7)),
    ('2026-01-11'::date + (week_number::integer * 7)), 'Achievement week ' || (week_number + 1),
    'finalized', now()
  from generate_series(0, 4) week_number;

  insert into public.team_week_results (
    season_id, week_id, team_id, tier_key, points, goal_points, rank, won, streak_count
  )
  select v_season, week.id, v_team, 'gold', 120, 100, 1, true, 0
  from public.competition_weeks week where week.season_id = v_season;

  perform set_config('request.jwt.claim.sub', v_captain::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform public.update_team_style_v1(v_team, 'helmet', 'emerald', '  Strong together  ');

  if not exists (
    select 1 from public.teams where id = v_team and emblem_key = 'helmet'
      and color_key = 'emerald' and motto = 'Strong together'
  ) then raise exception 'Captain style update was not normalized and saved'; end if;

  v_progress := public.get_my_achievement_progress_v1(v_season);
  if jsonb_array_length(v_progress->'personal') <> 12
    or jsonb_array_length(v_progress->'team_achievements') <> 9 then
    raise exception 'Unexpected achievement family counts: %', v_progress;
  end if;
  select card->>'level' into v_level
  from jsonb_array_elements(v_progress->'team_achievements') card
  where card->>'key' = 'weekly_winners';
  if v_level <> 'platinum' then raise exception 'Five weekly wins did not earn Platinum: %', v_level; end if;

  update public.team_week_results
  set won = false
  where team_id = v_team and week_id = (
    select id from public.competition_weeks where season_id = v_season order by starts_on desc limit 1
  );
  v_progress := public.get_my_achievement_progress_v1(v_season);
  select card->>'level' into v_level
  from jsonb_array_elements(v_progress->'team_achievements') card
  where card->>'key' = 'weekly_winners';
  if v_level <> 'gold' then raise exception 'Corrected weekly win did not downgrade to Gold: %', v_level; end if;

  v_profile := public.get_team_profile_v1(v_team);
  if v_profile ? 'invite_code' or v_profile ? 'email' or v_profile ? 'submissions' then
    raise exception 'Public team profile exposed a private field';
  end if;
  if jsonb_array_length(v_profile->'roster') <> 2 then
    raise exception 'Public team profile did not return the two-person roster';
  end if;

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  begin
    perform public.update_team_style_v1(v_team, 'flame', 'gold', null);
  exception when insufficient_privilege then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Non-captain changed team identity'; end if;

  perform set_config('request.jwt.claim.sub', v_captain::text, true);
  update public.seasons set status = 'finalizing', registration_open = false, submissions_open = false where id = v_season;
  v_rejected := false;
  begin
    perform public.update_team_style_v1(v_team, 'flame', 'gold', null);
  exception when others then
    if sqlerrm like '%identity is locked%' then v_rejected := true; else raise; end if;
  end;
  if not v_rejected then raise exception 'Finalizing season accepted a style change'; end if;
end;
$$;

rollback;
