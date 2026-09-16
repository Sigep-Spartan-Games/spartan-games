begin;

do $$
declare
  v_owner_id uuid;
  v_season_id uuid;
  v_result jsonb;
  v_local_today date := (now() at time zone 'America/New_York')::date;
  v_week_count_before integer;
  v_week_count_after integer;
  v_guard_rejected boolean := false;
begin
  select profile.id into v_owner_id
  from public.profiles profile
  where profile.is_owner
  limit 1;

  if v_owner_id is null then
    raise exception 'Season activation test requires an owner profile';
  end if;

  update public.seasons
  set archived_at = coalesce(archived_at, now())
  where archived_at is null;

  insert into public.seasons (
    slug,
    name,
    status,
    timezone,
    starts_on,
    registration_open,
    submissions_open
  ) values (
    'season-activation-test-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
    'Season Activation Test',
    'registration',
    'America/New_York',
    v_local_today - 30,
    true,
    false
  ) returning id into v_season_id;

  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_result := public.set_season_controls_v2(true, true, 'active');

  if v_result->>'status' <> 'active'
     or (v_result->>'starts_on')::date <> v_local_today then
    raise exception 'Season activation did not record the local activation date: %', v_result;
  end if;

  begin
    insert into public.submissions (season_id, activity_date)
    values (v_season_id, v_local_today - 1);
  exception
    when others then
      if sqlerrm like '%Activity date cannot be before the season start date%' then
        v_guard_rejected := true;
      else
        raise;
      end if;
  end;

  if not v_guard_rejected then
    raise exception 'Pre-season submission guard accepted an invalid date';
  end if;

  update public.seasons
  set starts_on = v_local_today + 14
  where id = v_season_id;

  select count(*) into v_week_count_before
  from public.competition_weeks week
  where week.season_id = v_season_id;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_result := public.finalize_competition_week(null);

  select count(*) into v_week_count_after
  from public.competition_weeks week
  where week.season_id = v_season_id;

  if v_result->>'status' <> 'before_season' then
    raise exception 'Pre-season finalization did not skip: %', v_result;
  end if;

  if v_week_count_after <> v_week_count_before then
    raise exception 'Pre-season finalization created an empty competition week';
  end if;
end;
$$;

rollback;
