begin;

create or replace function public.assert_current_scoring_rules_mutable()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
begin
  select season.*
  into v_season
  from public.seasons season
  where season.id = public.current_season_id();

  if v_season.id is null then
    raise exception 'No current season configured';
  end if;

  if v_season.status not in ('registration', 'active') then
    raise exception 'Scoring rules can only be changed during registration or active games';
  end if;

  return v_season.id;
end;
$$;

create or replace function public.save_activity_rule_v2(
  p_activity_key text,
  p_label text,
  p_measurement_type text,
  p_unit_label text,
  p_description text,
  p_min_value numeric,
  p_step_value numeric,
  p_points_per_unit numeric,
  p_teammate_multiplier numeric,
  p_weekly_cap_points integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid;
  v_season_id uuid;
  v_version_id uuid;
begin
  perform public.assert_admin();
  v_season_id := public.assert_current_scoring_rules_mutable();

  if p_activity_key is null or lower(trim(p_activity_key)) !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'Invalid activity key';
  end if;
  if p_measurement_type not in ('number', 'text', 'boolean') then
    raise exception 'Invalid measurement type';
  end if;
  if p_points_per_unit <= 0 then
    raise exception 'Points per unit must be positive';
  end if;
  if p_teammate_multiplier <= 0 then
    raise exception 'Teammate multiplier must be positive';
  end if;
  if p_weekly_cap_points is not null and p_weekly_cap_points <= 0 then
    raise exception 'Weekly cap must be positive';
  end if;

  insert into public.activities (
    key,
    label,
    measurement_type,
    unit_label,
    description,
    min_value,
    step_value,
    archived_at
  ) values (
    lower(trim(p_activity_key)),
    coalesce(nullif(trim(p_label), ''), lower(trim(p_activity_key))),
    p_measurement_type,
    nullif(trim(p_unit_label), ''),
    nullif(trim(p_description), ''),
    p_min_value,
    p_step_value,
    null
  )
  on conflict (key) do update
  set label = excluded.label,
      measurement_type = excluded.measurement_type,
      unit_label = excluded.unit_label,
      description = excluded.description,
      min_value = excluded.min_value,
      step_value = excluded.step_value,
      archived_at = null
  returning id into v_activity_id;

  update public.scoring_rule_versions
  set effective_to = clock_timestamp()
  where activity_id = v_activity_id
    and season_id = v_season_id
    and effective_to is null;

  insert into public.scoring_rule_versions (
    activity_id,
    season_id,
    points_per_unit,
    teammate_multiplier,
    weekly_cap_points,
    effective_from,
    created_by
  ) values (
    v_activity_id,
    v_season_id,
    p_points_per_unit,
    p_teammate_multiplier,
    p_weekly_cap_points,
    clock_timestamp(),
    auth.uid()
  )
  returning id into v_version_id;

  return v_version_id;
end;
$$;

create or replace function public.archive_activity_v2(p_activity_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id uuid;
  v_activity_id uuid;
begin
  perform public.assert_admin();
  v_season_id := public.assert_current_scoring_rules_mutable();

  select activity.id
  into v_activity_id
  from public.activities activity
  join public.scoring_rule_versions rule
    on rule.activity_id = activity.id
   and rule.season_id = v_season_id
   and rule.effective_to is null
  where activity.key = p_activity_key;

  if v_activity_id is null then
    raise exception 'Activity not found in the current season';
  end if;

  update public.scoring_rule_versions
  set effective_to = now()
  where activity_id = v_activity_id
    and season_id = v_season_id
    and effective_to is null;

  update public.activities activity
  set archived_at = case
    when exists (
      select 1
      from public.scoring_rule_versions rule
      where rule.activity_id = v_activity_id
        and rule.effective_to is null
    ) then activity.archived_at
    else coalesce(activity.archived_at, now())
  end
  where activity.id = v_activity_id;
end;
$$;

revoke execute on function public.assert_current_scoring_rules_mutable()
from public, anon, authenticated;

comment on function public.assert_current_scoring_rules_mutable() is
  'Internal guard that permits scoring-rule changes only for registration and active seasons.';

commit;
