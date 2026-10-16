-- Synthetic, identity-free fixtures for local databases and Supabase preview
-- branches. `supabase db push` does not run this file against production.
-- Testers can sign up normally, create their own team, and customize it while
-- these teams make the leaderboard and public profile states immediately useful.

do $$
declare
  v_season uuid;
  v_week uuid;
  v_team_ids uuid[] := array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    '10000000-0000-4000-8000-000000000004'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid,
    '10000000-0000-4000-8000-000000000006'::uuid
  ];
  v_points integer[] := array[620, 485, 410, 355, 290, 180];
  v_index integer;
begin
  select id into v_season
  from public.seasons
  where archived_at is null and status in ('registration', 'active', 'finalizing')
  order by created_at desc limit 1;
  if v_season is null then return; end if;

  insert into public.competition_weeks (season_id, starts_on, ends_on, label, status)
  values (
    v_season,
    public.week_start(current_date),
    public.week_start(current_date) + 6,
    public.week_identifier(public.week_start(current_date)),
    case when (select status from public.seasons where id = v_season) = 'active' then 'open' else 'scheduled' end
  )
  on conflict (season_id, starts_on) do nothing;

  select id into v_week from public.competition_weeks
  where season_id = v_season and starts_on = public.week_start(current_date);

  insert into public.teams (id, season_id, name, tier, emblem_key, color_key, motto)
  values
    (v_team_ids[1], v_season, 'Ares United', 'gold', 'helmet', 'crimson', 'Earn every point.'),
    (v_team_ids[2], v_season, 'Summit Duo', 'gold', 'mountain', 'gold', 'Higher together.'),
    (v_team_ids[3], v_season, 'Purple Reign', 'purple', 'trophy', 'purple', 'Small team. Big season.'),
    (v_team_ids[4], v_season, 'Volt Crew', 'purple', 'lightning', 'navy', 'Bring the energy.'),
    (v_team_ids[5], v_season, 'Emerald Wings', 'red', 'wings', 'emerald', 'Keep moving forward.'),
    (v_team_ids[6], v_season, 'North Star', 'red', 'compass', 'slate', 'Find the next win.')
  on conflict (id) do nothing;

  insert into public.team_memberships (
    team_id, season_id, user_id, role, display_name_snapshot, joined_at
  )
  select fixture.team_id, v_season, null, fixture.role, fixture.display_name, now() - interval '14 days'
  from (values
    (v_team_ids[1], 'captain', 'Alex Spartan'), (v_team_ids[1], 'member', 'Jordan Spartan'),
    (v_team_ids[2], 'captain', 'Morgan Peak'),
    (v_team_ids[3], 'captain', 'Riley Crown'), (v_team_ids[3], 'member', 'Casey Crown'),
    (v_team_ids[4], 'captain', 'Taylor Volt'), (v_team_ids[4], 'member', 'Jamie Volt'),
    (v_team_ids[5], 'captain', 'Skyler Wing'), (v_team_ids[5], 'member', 'Cameron Wing'),
    (v_team_ids[6], 'captain', 'Quinn North')
  ) fixture(team_id, role, display_name)
  where not exists (
    select 1 from public.team_memberships membership
    where membership.team_id = fixture.team_id and membership.role = fixture.role
      and membership.display_name_snapshot = fixture.display_name
  );

  for v_index in 1..cardinality(v_team_ids) loop
    insert into public.score_events (
      season_id, week_id, team_id, actor_id, activity_id,
      event_type, source_submission_id, points, metadata
    ) select
      v_season, v_week, v_team_ids[v_index], null, null,
      'admin_adjustment', null, v_points[v_index], '{"preview_fixture":true}'::jsonb
    where not exists (
      select 1 from public.score_events event
      where event.season_id = v_season and event.team_id = v_team_ids[v_index]
        and event.metadata->>'preview_fixture' = 'true'
    );

    insert into public.team_streaks (team_id, streak_count, last_activity_date)
    values (v_team_ids[v_index], 7 - v_index, current_date)
    on conflict (team_id) do update
      set streak_count = excluded.streak_count, last_activity_date = excluded.last_activity_date;
  end loop;
end;
$$;
