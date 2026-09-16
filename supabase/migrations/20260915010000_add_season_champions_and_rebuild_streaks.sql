begin;

-- Season completion can pause after scoring is frozen when an exact champion
-- tie requires an administrator to select the winner.
alter table public.seasons
  drop constraint if exists seasons_status_check;

alter table public.seasons
  add constraint seasons_status_check
  check (status in ('draft', 'registration', 'active', 'finalizing', 'completed'));

drop index if exists public.seasons_one_unarchived_active_idx;

create unique index seasons_one_unarchived_active_idx
on public.seasons ((true))
where archived_at is null
  and status in ('registration', 'active', 'finalizing');

create table public.season_champions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  tier_key text not null references public.tiers(key) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  team_name_snapshot text not null,
  weekly_wins integer not null,
  season_points integer not null,
  goals_met integer not null,
  decision_method text not null,
  selected_by uuid references auth.users(id) on delete set null,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (season_id, tier_key),
  unique (season_id, team_id),
  constraint season_champions_values_nonnegative check (
    weekly_wins >= 0 and season_points > 0 and goals_met >= 0
  ),
  constraint season_champions_decision_method_check check (
    decision_method in ('automatic', 'admin_tiebreak')
  )
);

create index season_champions_team_idx
on public.season_champions (team_id);

alter table public.season_champions enable row level security;

create policy season_champions_read_authenticated
on public.season_champions
for select
to authenticated
using (true);

revoke all on table public.season_champions from public, anon, authenticated;
grant select on table public.season_champions to authenticated;

create or replace function public.validate_season_champion_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select season.status into v_status
  from public.seasons season
  where season.id = new.season_id;

  if v_status <> 'finalizing' then
    raise exception 'Champions can only be recorded while a season is finalizing';
  end if;

  if not exists (
    select 1
    from public.teams team
    where team.id = new.team_id
      and team.season_id = new.season_id
      and team.tier = new.tier_key
      and team.archived_at is null
  ) then
    raise exception 'Champion team must be active in the selected season and tier';
  end if;

  return new;
end;
$$;

create trigger season_champions_validate_insert
before insert on public.season_champions
for each row execute function public.validate_season_champion_insert();

create or replace function public.prevent_season_champion_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Season champions are immutable once recorded';
end;
$$;

create trigger season_champions_immutable
before update or delete on public.season_champions
for each row execute function public.prevent_season_champion_mutation();

create or replace function public.season_champion_candidates_internal(p_season_id uuid)
returns table (
  tier_key text,
  team_id uuid,
  team_name text,
  weekly_wins integer,
  season_points integer,
  goals_met integer,
  tied_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with team_metrics as (
    select
      team.tier as tier_key,
      team.id as team_id,
      team.name as team_name,
      count(*) filter (where result.won)::integer as weekly_wins,
      coalesce(sum(result.points), 0)::integer as season_points,
      count(*) filter (where result.points >= result.goal_points)::integer as goals_met
    from public.teams team
    join public.team_week_results result
      on result.team_id = team.id
     and result.season_id = team.season_id
    where team.season_id = p_season_id
      and team.archived_at is null
    group by team.id, team.tier, team.name
    having coalesce(sum(result.points), 0) > 0
  ), ranked as (
    select
      metric.*,
      dense_rank() over (
        partition by metric.tier_key
        order by metric.weekly_wins desc,
          metric.season_points desc,
          metric.goals_met desc
      ) as candidate_rank
    from team_metrics metric
  ), leaders as (
    select *
    from ranked
    where candidate_rank = 1
  )
  select
    leader.tier_key,
    leader.team_id,
    leader.team_name,
    leader.weekly_wins,
    leader.season_points,
    leader.goals_met,
    count(*) over (partition by leader.tier_key)::integer as tied_count
  from leaders leader
  order by leader.tier_key, leader.team_name, leader.team_id;
$$;

revoke all on function public.season_champion_candidates_internal(uuid)
from public, anon, authenticated;

create or replace function public.season_champions_json_internal(p_season_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'season_id', champion.season_id,
        'tier_key', champion.tier_key,
        'team_id', champion.team_id,
        'team_name', champion.team_name_snapshot,
        'weekly_wins', champion.weekly_wins,
        'season_points', champion.season_points,
        'goals_met', champion.goals_met,
        'decision_method', champion.decision_method,
        'finalized_at', champion.finalized_at
      ) order by champion.tier_key
    ),
    '[]'::jsonb
  )
  from public.season_champions champion
  where champion.season_id = p_season_id;
$$;

revoke all on function public.season_champions_json_internal(uuid)
from public, anon, authenticated;

create or replace function public.pending_champion_ties_json_internal(p_season_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tier_key', tier.tier_key,
        'candidates', tier.candidates
      ) order by tier.tier_key
    ),
    '[]'::jsonb
  )
  from (
    select
      candidate.tier_key,
      jsonb_agg(
        jsonb_build_object(
          'team_id', candidate.team_id,
          'team_name', candidate.team_name,
          'weekly_wins', candidate.weekly_wins,
          'season_points', candidate.season_points,
          'goals_met', candidate.goals_met
        ) order by candidate.team_name, candidate.team_id
      ) as candidates
    from public.season_champion_candidates_internal(p_season_id) candidate
    where candidate.tied_count > 1
    group by candidate.tier_key
  ) tier;
$$;

revoke all on function public.pending_champion_ties_json_internal(uuid)
from public, anon, authenticated;

create or replace function public.get_pending_champion_ties_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
begin
  perform public.assert_admin();

  select season.* into v_season
  from public.seasons season
  where season.id = public.current_season_id();

  if v_season.id is null then
    raise exception 'No current season configured';
  end if;

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', v_season.status,
    'ties', case
      when v_season.status = 'finalizing'
        then public.pending_champion_ties_json_internal(v_season.id)
      else '[]'::jsonb
    end,
    'champions', public.season_champions_json_internal(v_season.id)
  );
end;
$$;

revoke all on function public.get_pending_champion_ties_v2()
from public, anon;
grant execute on function public.get_pending_champion_ties_v2()
to authenticated;

-- Rebuild a team's streak exactly as submissions were received. Backdated and
-- same-day submissions do not advance the state, matching the live workflow.
create or replace function public.rebuild_team_streaks_internal(p_team_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_team public.teams%rowtype;
  v_season public.seasons%rowtype;
  v_submission public.submissions%rowtype;
  v_last_date date;
  v_streak_count integer;
  v_bonus integer;
  v_week_id uuid;
begin
  for v_team_id in
    select distinct requested.team_id
    from unnest(coalesce(p_team_ids, '{}'::uuid[])) as requested(team_id)
    where requested.team_id is not null
    order by requested.team_id
  loop
    perform pg_advisory_xact_lock(hashtextextended('streak-rebuild:' || v_team_id::text, 0));

    select team.* into v_team
    from public.teams team
    where team.id = v_team_id;

    if v_team.id is null then
      continue;
    end if;

    select season.* into v_season
    from public.seasons season
    where season.id = v_team.season_id;

    if v_season.status <> 'active' then
      raise exception 'Streaks can only be rebuilt while the season is active';
    end if;

    delete from public.score_events event
    where event.team_id = v_team_id
      and event.event_type = 'streak_bonus';

    insert into public.team_streaks (team_id, streak_count, last_activity_date)
    values (v_team_id, 0, null)
    on conflict (team_id) do update
      set streak_count = 0,
          last_activity_date = null;

    v_last_date := null;
    v_streak_count := 0;

    for v_submission in
      select submission.*
      from public.submissions submission
      where submission.team_id = v_team_id
        and submission.season_id = v_team.season_id
        and submission.submission_kind = 'activity'
        and submission.voided_at is null
      order by submission.created_at, submission.id
    loop
      v_bonus := 0;

      if v_last_date is null then
        v_streak_count := 1;
        v_last_date := v_submission.activity_date;
        v_bonus := least(
          v_season.daily_bonus_increment,
          v_season.max_streak_bonus
        );
      elsif v_submission.activity_date = v_last_date + 1 then
        v_streak_count := v_streak_count + 1;
        v_last_date := v_submission.activity_date;
        v_bonus := least(
          v_streak_count * v_season.daily_bonus_increment,
          v_season.max_streak_bonus
        );
      elsif v_submission.activity_date > v_last_date + 1 then
        v_streak_count := 1;
        v_last_date := v_submission.activity_date;
        v_bonus := least(
          v_season.daily_bonus_increment,
          v_season.max_streak_bonus
        );
      end if;

      if v_bonus > 0 then
        insert into public.score_events (
          season_id, week_id, team_id, actor_id, event_type,
          source_submission_id, points, metadata, created_at
        ) values (
          v_submission.season_id,
          v_submission.week_id,
          v_submission.team_id,
          v_submission.submitted_by,
          'streak_bonus',
          v_submission.id,
          v_bonus,
          jsonb_build_object(
            'streak_count', v_streak_count,
            'daily_bonus_increment', v_season.daily_bonus_increment
          ),
          v_submission.created_at
        )
        on conflict (source_submission_id, event_type)
          where source_submission_id is not null
        do update set
          season_id = excluded.season_id,
          week_id = excluded.week_id,
          team_id = excluded.team_id,
          actor_id = excluded.actor_id,
          points = excluded.points,
          metadata = excluded.metadata,
          created_at = excluded.created_at;
      end if;
    end loop;

    update public.team_streaks
    set streak_count = v_streak_count,
        last_activity_date = v_last_date
    where team_id = v_team_id;
  end loop;

  for v_week_id in
    select distinct week.id
    from public.competition_weeks week
    join public.teams team on team.season_id = week.season_id
    where team.id = any(coalesce(p_team_ids, '{}'::uuid[]))
      and week.status = 'finalized'
    order by week.id
  loop
    perform public.recalculate_week_results(v_week_id, true);
  end loop;
end;
$$;

revoke all on function public.rebuild_team_streaks_internal(uuid[])
from public, anon, authenticated;

create or replace function public.change_team_tier_v2(
  p_team_id uuid,
  p_tier_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id uuid;
  v_season_status text;
  v_is_admin boolean := public.is_admin(auth.uid());
begin
  select team.season_id, season.status
  into v_season_id, v_season_status
  from public.teams team
  join public.seasons season on season.id = team.season_id
  where team.id = p_team_id
    and team.archived_at is null
  for update of team, season;

  if v_season_id is null then
    raise exception 'Team not found';
  end if;

  if not v_is_admin and not exists (
    select 1
    from public.team_memberships membership
    where membership.team_id = p_team_id
      and membership.user_id = auth.uid()
      and membership.role = 'captain'
      and membership.left_at is null
  ) then
    raise exception 'Only the team captain can change the tier' using errcode = '42501';
  end if;

  if v_season_status <> 'registration' then
    raise exception 'Team tiers are locked once the games start';
  end if;

  if not exists (
    select 1
    from public.season_tiers season_tier
    where season_tier.season_id = v_season_id
      and season_tier.tier_key = lower(trim(p_tier_key))
  ) then
    raise exception 'Invalid tier';
  end if;

  update public.teams
  set tier = lower(trim(p_tier_key))
  where id = p_team_id;
end;
$$;

create or replace function public.guard_team_tier_after_start()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  if new.tier is not distinct from old.tier then
    return new;
  end if;

  select season.status into v_status
  from public.seasons season
  where season.id = old.season_id;

  if v_status <> 'registration' then
    raise exception 'Team tiers are locked once the games start';
  end if;

  return new;
end;
$$;

drop trigger if exists teams_tier_locked_after_start on public.teams;

create trigger teams_tier_locked_after_start
before update of tier on public.teams
for each row execute function public.guard_team_tier_after_start();

create or replace function public.admin_update_submission_v2(
  p_submission_id uuid,
  p_team_id uuid,
  p_activity_key text,
  p_activity_date date,
  p_did_with_teammate boolean,
  p_value_number numeric default null,
  p_value_text text default null,
  p_value_bool boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_original public.submissions%rowtype;
  v_original_week_id uuid;
  v_team public.teams%rowtype;
  v_activity public.activities%rowtype;
  v_rule public.scoring_rule_versions%rowtype;
  v_season_status text;
  v_week_id uuid;
  v_units numeric;
  v_base_points integer;
  v_points integer;
begin
  perform public.assert_admin();

  select submission.* into v_original
  from public.submissions submission
  where submission.id = p_submission_id
    and submission.submission_kind = 'activity'
  for update;

  if v_original.id is null then
    raise exception 'Activity submission not found';
  end if;

  select season.status into v_season_status
  from public.seasons season
  where season.id = v_original.season_id
  for update;

  if v_season_status <> 'active' then
    raise exception 'Submission scoring is frozen after the games end';
  end if;

  select team.* into v_team
  from public.teams team
  where team.id = p_team_id
    and team.season_id = v_original.season_id
    and team.archived_at is null;

  if v_team.id is null then
    raise exception 'Target team must be active in the same season';
  end if;

  select activity.* into v_activity
  from public.activities activity
  where activity.key = p_activity_key
    and activity.archived_at is null;

  if v_activity.id is null then
    raise exception 'Invalid or archived activity';
  end if;

  select rule.* into v_rule
  from public.scoring_rule_versions rule
  where rule.activity_id = v_activity.id
    and rule.season_id = v_team.season_id
    and rule.effective_to is null;

  if v_rule.id is null then
    raise exception 'No active scoring rule for this activity';
  end if;

  if v_activity.measurement_type = 'number' then
    if p_value_number is null
       or p_value_number <= 0
       or (v_activity.min_value is not null and p_value_number < v_activity.min_value) then
      raise exception 'Invalid numeric activity value';
    end if;
    v_units := p_value_number;
  elsif v_activity.measurement_type = 'text' then
    if nullif(trim(p_value_text), '') is null then
      raise exception 'Activity details are required';
    end if;
    v_units := 1;
  else
    if p_value_bool is distinct from true then
      raise exception 'Activity confirmation is required';
    end if;
    v_units := 1;
  end if;

  v_original_week_id := v_original.week_id;
  v_week_id := public.ensure_competition_week(v_team.season_id, p_activity_date);
  v_base_points := greatest(1, floor(v_rule.points_per_unit * v_units)::integer);
  v_points := v_base_points;

  if coalesce(p_did_with_teammate, false) then
    v_points := greatest(1, floor(v_points * v_rule.teammate_multiplier)::integer);
  end if;

  update public.submissions
  set team_id = p_team_id,
      season_id = v_team.season_id,
      week_id = v_week_id,
      activity_id = v_activity.id,
      scoring_rule_version_id = v_rule.id,
      activity_key = p_activity_key,
      activity_date = p_activity_date,
      activity_value_number = case when v_activity.measurement_type = 'number' then p_value_number end,
      activity_value_text = case when v_activity.measurement_type = 'text' then trim(p_value_text) end,
      activity_value_bool = case when v_activity.measurement_type = 'boolean' then true end,
      points_per_unit = v_rule.points_per_unit,
      teammate_bonus = v_rule.teammate_multiplier,
      did_with_teammate = coalesce(p_did_with_teammate, false),
      base_points = v_base_points,
      points_awarded = v_points,
      voided_at = null
  where id = p_submission_id;

  perform public.rebuild_team_streaks_internal(
    array[v_original.team_id, p_team_id]::uuid[]
  );

  -- The streak rebuild recalculates all finalized weeks. These checks preserve
  -- correctness if a deployment temporarily replaces that implementation.
  if exists (
    select 1 from public.competition_weeks week
    where week.id = v_original_week_id and week.status = 'finalized'
  ) then
    perform public.recalculate_week_results(v_original_week_id, true);
  end if;

  if v_week_id is distinct from v_original_week_id and exists (
    select 1 from public.competition_weeks week
    where week.id = v_week_id and week.status = 'finalized'
  ) then
    perform public.recalculate_week_results(v_week_id, true);
  end if;
end;
$$;

create or replace function public.void_submission_v2(p_submission_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.submissions%rowtype;
  v_season_status text;
begin
  perform public.assert_admin();

  select submission.* into v_submission
  from public.submissions submission
  where submission.id = p_submission_id
  for update;

  if v_submission.id is null then
    raise exception 'Submission not found';
  end if;

  select season.status into v_season_status
  from public.seasons season
  where season.id = v_submission.season_id
  for update;

  if v_season_status <> 'active' then
    raise exception 'Submission scoring is frozen after the games end';
  end if;

  update public.submissions
  set voided_at = coalesce(voided_at, now())
  where id = p_submission_id;

  update public.submission_attachments
  set deleted_at = coalesce(deleted_at, now())
  where submission_id = p_submission_id;

  if v_submission.submission_kind = 'activity' then
    perform public.rebuild_team_streaks_internal(array[v_submission.team_id]::uuid[]);
  end if;

  return v_submission.proof_image_path;
end;
$$;

create or replace function public.reject_pending_season_requests_internal(p_season_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.submission_edit_requests request
  set status = 'rejected',
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution_note = 'Season ended before this request was resolved'
  from public.submissions submission
  where submission.id = request.submission_id
    and submission.season_id = p_season_id
    and request.status = 'pending';
$$;

revoke all on function public.reject_pending_season_requests_internal(uuid)
from public, anon, authenticated;

create or replace function public.prepare_season_completion_v2()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_today date;
  v_week_start date;
  v_week_id uuid;
  v_result jsonb;
  v_finalized_count integer := 0;
  v_already_finalized_count integer := 0;
  v_tie_count integer := 0;
  v_ties jsonb := '[]'::jsonb;
begin
  perform public.assert_admin();

  select season.* into v_season
  from public.seasons season
  where season.id = public.current_season_id()
  for update;

  if v_season.id is null then
    raise exception 'No current season configured';
  end if;

  if v_season.status = 'completed' then
    return jsonb_build_object(
      'season_id', v_season.id,
      'status', 'completed',
      'champions', public.season_champions_json_internal(v_season.id),
      'ties', '[]'::jsonb,
      'weeks_finalized', 0,
      'weeks_already_finalized', 0
    );
  end if;

  if v_season.status = 'finalizing' then
    return jsonb_build_object(
      'season_id', v_season.id,
      'status', 'needs_tiebreak',
      'champions', '[]'::jsonb,
      'ties', public.pending_champion_ties_json_internal(v_season.id),
      'weeks_finalized', 0,
      'weeks_already_finalized', 0
    );
  end if;

  if v_season.status <> 'active' then
    raise exception 'Games must be active before they can be ended';
  end if;

  v_today := (now() at time zone v_season.timezone)::date;

  update public.seasons
  set registration_open = false,
      submissions_open = false
  where id = v_season.id;

  for v_week_start in
    select generated.week_start::date
    from generate_series(
      public.week_start(v_season.starts_on)::timestamp,
      public.week_start(v_today)::timestamp,
      interval '7 days'
    ) as generated(week_start)
    order by generated.week_start
  loop
    v_week_id := public.ensure_competition_week(v_season.id, v_week_start);
    v_result := public.finalize_competition_week(v_week_id);

    if v_result->>'status' = 'completed' then
      v_finalized_count := v_finalized_count + 1;
    elsif v_result->>'status' = 'already_finalized' then
      v_already_finalized_count := v_already_finalized_count + 1;
    end if;
  end loop;

  perform public.reject_pending_season_requests_internal(v_season.id);

  update public.seasons
  set status = 'finalizing',
      registration_open = false,
      submissions_open = false,
      ends_on = coalesce(ends_on, v_today)
  where id = v_season.id;

  select count(*) into v_tie_count
  from (
    select distinct candidate.tier_key
    from public.season_champion_candidates_internal(v_season.id) candidate
    where candidate.tied_count > 1
  ) tied_tiers;

  if v_tie_count = 0 then
    insert into public.season_champions (
      season_id, tier_key, team_id, team_name_snapshot,
      weekly_wins, season_points, goals_met,
      decision_method, selected_by, finalized_at
    )
    select
      v_season.id,
      candidate.tier_key,
      candidate.team_id,
      candidate.team_name,
      candidate.weekly_wins,
      candidate.season_points,
      candidate.goals_met,
      'automatic',
      auth.uid(),
      now()
    from public.season_champion_candidates_internal(v_season.id) candidate
    where candidate.tied_count = 1;

    update public.seasons
    set status = 'completed'
    where id = v_season.id;

    return jsonb_build_object(
      'season_id', v_season.id,
      'status', 'completed',
      'champions', public.season_champions_json_internal(v_season.id),
      'ties', '[]'::jsonb,
      'weeks_finalized', v_finalized_count,
      'weeks_already_finalized', v_already_finalized_count
    );
  end if;

  v_ties := public.pending_champion_ties_json_internal(v_season.id);

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', 'needs_tiebreak',
    'champions', '[]'::jsonb,
    'ties', v_ties,
    'weeks_finalized', v_finalized_count,
    'weeks_already_finalized', v_already_finalized_count
  );
end;
$$;

revoke all on function public.prepare_season_completion_v2()
from public, anon;
grant execute on function public.prepare_season_completion_v2()
to authenticated;

create or replace function public.complete_season_champions_v2(p_selections jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_tied_tier_count integer;
  v_selection_count integer;
  v_valid_selection_count integer;
begin
  perform public.assert_admin();

  select season.* into v_season
  from public.seasons season
  where season.id = public.current_season_id()
  for update;

  if v_season.id is null then
    raise exception 'No current season configured';
  end if;

  if v_season.status = 'completed' then
    return jsonb_build_object(
      'season_id', v_season.id,
      'status', 'completed',
      'champions', public.season_champions_json_internal(v_season.id)
    );
  end if;

  if v_season.status <> 'finalizing' then
    raise exception 'The season is not awaiting champion selection';
  end if;

  if p_selections is null or jsonb_typeof(p_selections) <> 'array' then
    raise exception 'Champion selections must be a JSON array';
  end if;

  select count(*) into v_tied_tier_count
  from (
    select distinct candidate.tier_key
    from public.season_champion_candidates_internal(v_season.id) candidate
    where candidate.tied_count > 1
  ) tied_tiers;

  select count(*) into v_selection_count
  from jsonb_to_recordset(p_selections) as selection(tier_key text, team_id uuid);

  select count(*) into v_valid_selection_count
  from jsonb_to_recordset(p_selections) as selection(tier_key text, team_id uuid)
  join public.season_champion_candidates_internal(v_season.id) candidate
    on candidate.tier_key = selection.tier_key
   and candidate.team_id = selection.team_id
   and candidate.tied_count > 1;

  if v_selection_count <> v_tied_tier_count
     or v_valid_selection_count <> v_tied_tier_count
     or (
       select count(distinct selection.tier_key)
       from jsonb_to_recordset(p_selections) as selection(tier_key text, team_id uuid)
     ) <> v_tied_tier_count then
    raise exception 'Select exactly one eligible champion for every tied tier';
  end if;

  insert into public.season_champions (
    season_id, tier_key, team_id, team_name_snapshot,
    weekly_wins, season_points, goals_met,
    decision_method, selected_by, finalized_at
  )
  select
    v_season.id,
    candidate.tier_key,
    candidate.team_id,
    candidate.team_name,
    candidate.weekly_wins,
    candidate.season_points,
    candidate.goals_met,
    case when candidate.tied_count > 1 then 'admin_tiebreak' else 'automatic' end,
    auth.uid(),
    now()
  from public.season_champion_candidates_internal(v_season.id) candidate
  left join jsonb_to_recordset(p_selections) as selection(tier_key text, team_id uuid)
    on selection.tier_key = candidate.tier_key
   and selection.team_id = candidate.team_id
  where candidate.tied_count = 1
     or selection.team_id is not null;

  update public.seasons
  set status = 'completed',
      registration_open = false,
      submissions_open = false
  where id = v_season.id;

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', 'completed',
    'champions', public.season_champions_json_internal(v_season.id)
  );
end;
$$;

revoke all on function public.complete_season_champions_v2(jsonb)
from public, anon;
grant execute on function public.complete_season_champions_v2(jsonb)
to authenticated;

create or replace function public.close_current_season_v2()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.prepare_season_completion_v2();
$$;

revoke all on function public.close_current_season_v2() from public, anon;
grant execute on function public.close_current_season_v2() to authenticated;

-- Preserve the existing one-way control API while preventing a finalizing
-- season from being reopened through a direct RPC call.
create or replace function public.set_season_controls_v2(
  p_registration_open boolean default null,
  p_submissions_open boolean default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_next_status text;
begin
  perform public.assert_admin();

  if p_status is not null
     and p_status not in ('draft', 'registration', 'active', 'completed') then
    raise exception 'Invalid season status';
  end if;

  select season.* into v_season
  from public.seasons season
  where season.id = public.current_season_id()
  for update;

  if v_season.id is null then
    raise exception 'No current season configured';
  end if;

  if p_status = 'completed' then
    if p_registration_open is true or p_submissions_open is true then
      raise exception 'A completed season cannot have registration or submissions open';
    end if;
    return public.close_current_season_v2();
  end if;

  if v_season.status = 'finalizing' then
    raise exception 'Resolve champion ties before changing season controls';
  end if;

  if v_season.status = 'completed' then
    raise exception 'Completed seasons cannot be reopened; start a new season instead';
  end if;

  v_next_status := coalesce(p_status, v_season.status);
  if v_next_status <> v_season.status and not (
    (v_season.status = 'draft' and v_next_status = 'registration')
    or (v_season.status = 'registration' and v_next_status = 'active')
  ) then
    raise exception 'Invalid season transition from % to %',
      v_season.status, v_next_status;
  end if;

  if v_next_status = 'registration' and p_submissions_open is true then
    raise exception 'Start the games before opening submissions';
  end if;

  if p_status = 'active'
     and (p_registration_open is false or p_submissions_open is false) then
    raise exception 'Starting the games must keep registration and submissions open';
  end if;

  update public.seasons season
  set registration_open = case
        when p_status = 'active' then true
        else coalesce(p_registration_open, season.registration_open)
      end,
      submissions_open = case
        when p_status = 'active' then true
        else coalesce(p_submissions_open, season.submissions_open)
      end,
      status = v_next_status,
      ends_on = case when p_status = 'active' then null else season.ends_on end
  where season.id = v_season.id
  returning season.* into v_season;

  return jsonb_build_object(
    'season_id', v_season.id,
    'status', v_season.status,
    'registration_open', v_season.registration_open,
    'submissions_open', v_season.submissions_open
  );
end;
$$;

create or replace function public.start_new_season_v2(
  p_name text,
  p_starts_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_id uuid := public.current_season_id();
  v_previous_status text;
  v_close_result jsonb;
  v_new_id uuid;
  v_slug text;
  v_timezone text := 'America/New_York';
  v_increment integer := 1;
  v_max_bonus integer := 10;
begin
  perform public.assert_admin();

  if nullif(trim(p_name), '') is null then
    raise exception 'Season name is required';
  end if;

  if v_previous_id is not null then
    select
      season.timezone,
      season.daily_bonus_increment,
      season.max_streak_bonus,
      season.status
    into v_timezone, v_increment, v_max_bonus, v_previous_status
    from public.seasons season
    where season.id = v_previous_id
    for update;

    if v_previous_status = 'finalizing' then
      raise exception 'Resolve champion ties before starting a new season';
    end if;

    if v_previous_status = 'active' then
      v_close_result := public.prepare_season_completion_v2();
      if v_close_result->>'status' = 'needs_tiebreak' then
        raise exception 'Resolve champion ties before starting a new season';
      end if;
    end if;

    update public.seasons
    set status = 'completed',
        registration_open = false,
        submissions_open = false,
        ends_on = coalesce(ends_on, p_starts_on - 1),
        archived_at = coalesce(archived_at, now())
    where id = v_previous_id;

    update public.teams
    set archived_at = coalesce(archived_at, now())
    where season_id = v_previous_id;
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'))
    || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');

  insert into public.seasons (
    slug, name, status, timezone, starts_on, registration_open, submissions_open,
    daily_bonus_increment, max_streak_bonus
  ) values (
    v_slug, trim(p_name), 'registration', v_timezone, p_starts_on, true, false,
    v_increment, v_max_bonus
  ) returning id into v_new_id;

  if v_previous_id is not null then
    insert into public.season_tiers (season_id, tier_key, weekly_goal)
    select v_new_id, season_tier.tier_key, season_tier.weekly_goal
    from public.season_tiers season_tier
    where season_tier.season_id = v_previous_id;

    insert into public.scoring_rule_versions (
      activity_id, season_id, points_per_unit, teammate_multiplier,
      weekly_cap_points, effective_from, created_by
    )
    select
      rule.activity_id,
      v_new_id,
      rule.points_per_unit,
      rule.teammate_multiplier,
      rule.weekly_cap_points,
      now(),
      auth.uid()
    from public.scoring_rule_versions rule
    where rule.season_id = v_previous_id
      and rule.effective_to is null;
  end if;

  return v_new_id;
end;
$$;

-- Completed/finalizing seasons cannot receive new edit requests.
create or replace function public.guard_submission_edit_request_season()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select season.status into v_status
  from public.submissions submission
  join public.seasons season on season.id = submission.season_id
  where submission.id = new.submission_id;

  if v_status is distinct from 'active' then
    raise exception 'Submission changes are unavailable after the games end';
  end if;

  return new;
end;
$$;

drop trigger if exists submission_edit_requests_active_season
on public.submission_edit_requests;

create trigger submission_edit_requests_active_season
before insert on public.submission_edit_requests
for each row execute function public.guard_submission_edit_request_season();

-- Canonical scoring configuration and finalized results remain immutable once
-- champion calculation begins.
create or replace function public.guard_locked_season_scoring_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_season_id uuid;
  v_status text;
begin
  v_season_id := case when tg_op = 'DELETE' then old.season_id else new.season_id end;

  select season.status into v_status
  from public.seasons season
  where season.id = v_season_id;

  if v_status in ('finalizing', 'completed') then
    raise exception 'Season scoring is frozen after the games end';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger scoring_rule_versions_locked_season
before insert or update or delete on public.scoring_rule_versions
for each row execute function public.guard_locked_season_scoring_rows();

create trigger season_tiers_locked_season
before insert or update or delete on public.season_tiers
for each row execute function public.guard_locked_season_scoring_rows();

create trigger score_events_locked_season
before insert or update or delete on public.score_events
for each row execute function public.guard_locked_season_scoring_rows();

create trigger team_week_results_locked_season
before insert or update or delete on public.team_week_results
for each row execute function public.guard_locked_season_scoring_rows();

create or replace function public.guard_locked_season_streak_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('finalizing', 'completed')
     and (
       new.daily_bonus_increment is distinct from old.daily_bonus_increment
       or new.max_streak_bonus is distinct from old.max_streak_bonus
     ) then
    raise exception 'Season scoring is frozen after the games end';
  end if;

  return new;
end;
$$;

create trigger seasons_locked_streak_settings
before update on public.seasons
for each row execute function public.guard_locked_season_streak_settings();

-- Trigger functions and internal helpers are implementation details. They run
-- through trusted triggers/RPCs and should not be invoked directly by clients.
revoke all on function public.validate_season_champion_insert() from public, anon, authenticated;
revoke all on function public.prevent_season_champion_mutation() from public, anon, authenticated;
revoke all on function public.guard_team_tier_after_start() from public, anon, authenticated;
revoke all on function public.guard_submission_edit_request_season() from public, anon, authenticated;
revoke all on function public.guard_locked_season_scoring_rows() from public, anon, authenticated;
revoke all on function public.guard_locked_season_streak_settings() from public, anon, authenticated;

comment on table public.season_champions is
  'Immutable per-tier champion snapshots recorded when a season is completed.';

comment on function public.rebuild_team_streaks_internal(uuid[]) is
  'Replays active activity submissions in received order and rebuilds streak bonus ledger events for affected teams.';

commit;
