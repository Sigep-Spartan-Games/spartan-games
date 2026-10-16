begin;

-- Team identity is intentionally preset-based so every combination remains
-- legible on the compact leaderboard and no uploaded public assets are needed.
alter table public.teams
  add column emblem_key text not null default 'shield',
  add column color_key text not null default 'purple',
  add column motto text,
  add constraint teams_emblem_key_check check (
    emblem_key in ('helmet', 'flame', 'mountain', 'wings', 'lightning', 'shield', 'compass', 'trophy')
  ),
  add constraint teams_color_key_check check (
    color_key in ('purple', 'crimson', 'gold', 'navy', 'emerald', 'slate')
  ),
  add constraint teams_motto_length_check check (motto is null or char_length(motto) <= 40),
  add constraint teams_motto_controls_check check (motto is null or motto !~ '[[:cntrl:]]');

create table public.achievement_definitions (
  key text primary key,
  scope text not null check (scope in ('personal', 'team')),
  kind text not null check (kind in ('tiered', 'standalone')),
  name text not null,
  description text not null,
  icon_key text not null,
  unit text not null,
  thresholds integer[] not null default '{}',
  sort_order smallint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievement_definitions_key_check check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint achievement_definitions_thresholds_check check (
    (kind = 'tiered' and cardinality(thresholds) = 4 and thresholds[1] > 0)
    or (kind = 'standalone' and cardinality(thresholds) = 0)
  )
);

create trigger achievement_definitions_set_updated_at
before update on public.achievement_definitions
for each row execute function public.set_updated_at();

insert into public.achievement_definitions
  (key, scope, kind, name, description, icon_key, unit, thresholds, sort_order)
values
  ('dedicated', 'personal', 'tiered', 'Dedicated', 'Log valid activity submissions.', 'footprints', 'submissions', array[25,50,100,200], 10),
  ('season_contributor', 'personal', 'tiered', 'Season Contributor', 'Contribute personal points during the season.', 'medal', 'points', array[250,500,1000,1500], 20),
  ('power_week', 'personal', 'tiered', 'Power Week', 'Set a high personal point total in one week.', 'zap', 'points in one week', array[100,150,200,250], 30),
  ('activity_streak', 'personal', 'tiered', 'Activity Streak', 'Stay active on consecutive calendar days.', 'flame', 'days', array[7,14,21,30], 40),
  ('activity_explorer', 'personal', 'tiered', 'Activity Explorer', 'Try different season activities.', 'compass', 'activities', array[3,6,12,18], 50),
  ('consistency', 'personal', 'tiered', 'Consistency', 'Stay active across finalized competition weeks.', 'calendar-check', 'active weeks', array[3,5,8,0], 60),
  ('team_player', 'personal', 'tiered', 'Team Player', 'Log activities with your teammate.', 'users', 'teammate submissions', array[5,15,30,50], 70),
  ('first_step', 'personal', 'standalone', 'First Step', 'Log your first valid activity submission.', 'flag', 'achievement', '{}', 80),
  ('better_together', 'personal', 'standalone', 'Better Together', 'Log your first activity with a teammate.', 'handshake', 'achievement', '{}', 90),
  ('season_finisher', 'personal', 'standalone', 'Season Finisher', 'Finish an eligible season with at least one valid submission.', 'trophy', 'achievement', '{}', 100),
  ('tier_standout', 'personal', 'standalone', 'Tier Standout', 'Finish in the top ten contributors in your tier.', 'laurel', 'achievement', '{}', 110),
  ('spartan_standout', 'personal', 'standalone', 'Spartan Standout', 'Finish in the top ten contributors across Spartan Games.', 'helmet', 'achievement', '{}', 120),
  ('team_points', 'team', 'tiered', 'Team Points', 'Build a high team season score.', 'medal', 'points', array[500,1000,2000,3000], 10),
  ('goal_crusher', 'team', 'tiered', 'Goal Crusher', 'Meet the team goal in finalized weeks.', 'target', 'goals met', array[1,3,5,0], 20),
  ('weekly_winners', 'team', 'tiered', 'Weekly Winners', 'Win finalized competition weeks.', 'crown', 'weekly wins', array[1,2,3,5], 30),
  ('team_scoring_streak', 'team', 'tiered', 'Team Scoring Streak', 'Keep the team scoring on consecutive calendar days.', 'flame', 'days', array[7,14,21,30], 40),
  ('perfect_partners', 'team', 'tiered', 'Perfect Partners', 'Have both teammates active in the same finalized week.', 'users', 'shared weeks', array[2,4,6,0], 50),
  ('perfect_week', 'team', 'standalone', 'Perfect Week', 'Have both teammates participate and meet the finalized weekly goal.', 'calendar-check', 'achievement', '{}', 60),
  ('balanced_duo', 'team', 'standalone', 'Balanced Duo', 'Finish with both teammates contributing at least 35% of the team score.', 'scale', 'achievement', '{}', 70),
  ('comeback_crew', 'team', 'standalone', 'Comeback Crew', 'Move from the bottom half of the tier to first the following week.', 'trending-up', 'achievement', '{}', 80),
  ('tier_champion', 'team', 'standalone', 'Tier Champion', 'Win the team tier at season completion.', 'trophy', 'achievement', '{}', 90);

create table public.season_achievement_rules (
  season_id uuid not null references public.seasons(id) on delete cascade,
  achievement_key text not null references public.achievement_definitions(key) on delete restrict,
  scope text not null check (scope in ('personal', 'team')),
  kind text not null check (kind in ('tiered', 'standalone')),
  name text not null,
  description text not null,
  icon_key text not null,
  unit text not null,
  thresholds integer[] not null default '{}',
  sort_order smallint not null,
  snapshotted_at timestamptz not null default now(),
  primary key (season_id, achievement_key)
);

alter table public.achievement_definitions enable row level security;
alter table public.season_achievement_rules enable row level security;

create policy achievement_definitions_read_authenticated
on public.achievement_definitions for select to authenticated using (true);

create policy season_achievement_rules_read_authenticated
on public.season_achievement_rules for select to authenticated using (true);

revoke all on table public.achievement_definitions from public, anon, authenticated;
revoke all on table public.season_achievement_rules from public, anon, authenticated;
grant select on table public.achievement_definitions to authenticated;
grant select on table public.season_achievement_rules to authenticated;

create or replace function public.snapshot_season_achievement_rules_internal(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_count integer;
begin
  select count(distinct rule.activity_id)::integer
  into v_activity_count
  from public.scoring_rule_versions rule
  where rule.season_id = p_season_id;

  insert into public.season_achievement_rules (
    season_id, achievement_key, scope, kind, name, description,
    icon_key, unit, thresholds, sort_order
  )
  select
    p_season_id,
    definition.key,
    definition.scope,
    definition.kind,
    definition.name,
    definition.description,
    definition.icon_key,
    definition.unit,
    case
      when definition.key = 'activity_explorer' and coalesce(v_activity_count, 0) > 0
        then array[3, 6, least(12, v_activity_count), v_activity_count]
      else definition.thresholds
    end,
    definition.sort_order
  from public.achievement_definitions definition
  where definition.active
  on conflict (season_id, achievement_key) do nothing;
end;
$$;

revoke all on function public.snapshot_season_achievement_rules_internal(uuid)
from public, anon, authenticated;

create or replace function public.snapshot_season_achievements_on_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('active', 'finalizing')
    and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.snapshot_season_achievement_rules_internal(new.id);
  end if;
  return new;
end;
$$;

create trigger seasons_snapshot_achievements
after insert or update of status on public.seasons
for each row execute function public.snapshot_season_achievements_on_activation();

do $$
declare
  v_season_id uuid;
begin
  for v_season_id in
    select id from public.seasons where status in ('registration', 'active', 'finalizing') and archived_at is null
  loop
    perform public.snapshot_season_achievement_rules_internal(v_season_id);
  end loop;
end;
$$;

create or replace function public.longest_activity_date_streak_internal(
  p_season_id uuid,
  p_team_id uuid default null,
  p_user_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with dates as (
    select distinct submission.activity_date
    from public.submissions submission
    where submission.season_id = p_season_id
      and submission.submission_kind = 'activity'
      and submission.voided_at is null
      and (p_team_id is null or submission.team_id = p_team_id)
      and (p_user_id is null or submission.submitted_by = p_user_id)
  ), islands as (
    select activity_date,
      activity_date - (row_number() over (order by activity_date))::integer as island
    from dates
  )
  select coalesce(max(run_length), 0)::integer
  from (
    select count(*)::integer as run_length from islands group by island
  ) runs;
$$;

revoke all on function public.longest_activity_date_streak_internal(uuid, uuid, uuid)
from public, anon, authenticated;

create or replace function public.achievement_level_internal(
  p_thresholds integer[],
  p_value integer,
  p_eligible_weeks integer default null
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when cardinality(p_thresholds) <> 4 then null
    when p_thresholds[4] = 0 and coalesce(p_eligible_weeks, 0) >= 8 and p_value >= p_eligible_weeks then 'platinum'
    when p_thresholds[4] > 0 and p_value >= p_thresholds[4] then 'platinum'
    when p_value >= p_thresholds[3] then 'gold'
    when p_value >= p_thresholds[2] then 'silver'
    when p_value >= p_thresholds[1] then 'bronze'
    else null
  end;
$$;

create or replace function public.build_achievement_card_internal(
  p_rule public.season_achievement_rules,
  p_value integer,
  p_earned boolean default null,
  p_eligible_weeks integer default null,
  p_earned_at timestamptz default null,
  p_detail text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_level text;
  v_level_index integer := 0;
  v_next integer;
  v_thresholds integer[] := p_rule.thresholds;
begin
  if p_rule.kind = 'standalone' then
    return jsonb_build_object(
      'key', p_rule.achievement_key, 'scope', p_rule.scope, 'kind', p_rule.kind,
      'name', p_rule.name, 'description', p_rule.description,
      'icon_key', p_rule.icon_key, 'unit', p_rule.unit,
      'earned', coalesce(p_earned, false), 'earned_at', p_earned_at,
      'value', p_value, 'detail', p_detail, 'sort_order', p_rule.sort_order
    );
  end if;

  v_level := public.achievement_level_internal(v_thresholds, p_value, p_eligible_weeks);
  v_level_index := case v_level when 'bronze' then 1 when 'silver' then 2 when 'gold' then 3 when 'platinum' then 4 else 0 end;
  if v_level_index < 4 then
    v_next := v_thresholds[v_level_index + 1];
    if v_next = 0 then v_next := greatest(coalesce(p_eligible_weeks, 0), 8); end if;
  end if;

  return jsonb_build_object(
    'key', p_rule.achievement_key, 'scope', p_rule.scope, 'kind', p_rule.kind,
    'name', p_rule.name, 'description', p_rule.description,
    'icon_key', p_rule.icon_key, 'unit', p_rule.unit,
    'thresholds', v_thresholds, 'level', v_level,
    'tier_history', jsonb_build_array(
      jsonb_build_object('level', 'bronze', 'threshold', v_thresholds[1], 'earned', p_value >= v_thresholds[1], 'earned_at', case when p_value >= v_thresholds[1] then p_earned_at end),
      jsonb_build_object('level', 'silver', 'threshold', v_thresholds[2], 'earned', p_value >= v_thresholds[2], 'earned_at', case when p_value >= v_thresholds[2] then p_earned_at end),
      jsonb_build_object('level', 'gold', 'threshold', v_thresholds[3], 'earned', p_value >= v_thresholds[3], 'earned_at', case when p_value >= v_thresholds[3] then p_earned_at end),
      jsonb_build_object('level', 'platinum', 'threshold', coalesce(nullif(v_thresholds[4], 0), greatest(coalesce(p_eligible_weeks, 0), 8)), 'earned', v_level = 'platinum', 'earned_at', case when v_level = 'platinum' then p_earned_at end)
    ),
    'earned', v_level is not null, 'value', p_value,
    'current_threshold', case when v_level_index > 0 then coalesce(nullif(v_thresholds[v_level_index], 0), p_eligible_weeks) end,
    'next_threshold', v_next, 'eligible_weeks', p_eligible_weeks,
    'earned_at', p_earned_at, 'detail', p_detail, 'sort_order', p_rule.sort_order
  );
end;
$$;

revoke all on function public.build_achievement_card_internal(public.season_achievement_rules, integer, boolean, integer, timestamptz, text)
from public, anon, authenticated;

create or replace function public.build_achievement_progress_internal(
  p_season_id uuid,
  p_user_id uuid,
  p_team_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_team public.teams%rowtype;
  v_membership public.team_memberships%rowtype;
  v_rule public.season_achievement_rules%rowtype;
  v_personal jsonb := '[]'::jsonb;
  v_team_cards jsonb := '[]'::jsonb;
  v_submission_count integer := 0;
  v_personal_points integer := 0;
  v_power_week integer := 0;
  v_personal_streak integer := 0;
  v_activity_count integer := 0;
  v_active_weeks integer := 0;
  v_eligible_weeks integer := 0;
  v_teammate_submissions integer := 0;
  v_team_points integer := 0;
  v_goals_met integer := 0;
  v_weekly_wins integer := 0;
  v_team_streak integer := 0;
  v_partner_weeks integer := 0;
  v_perfect_week boolean := false;
  v_balanced boolean := false;
  v_comeback boolean := false;
  v_champion boolean := false;
  v_tier_rank integer;
  v_overall_rank integer;
  v_member_count integer := 0;
  v_min_share numeric := 0;
  v_value integer;
  v_earned boolean;
  v_detail text;
  v_earned_at timestamptz;
  v_first_submission_at timestamptz;
  v_teammate_submission_at timestamptz;
  v_perfect_week_at timestamptz;
  v_champion_at timestamptz;
begin
  select * into v_season from public.seasons where id = p_season_id;
  if v_season.id is null then raise exception 'Season not found'; end if;

  if p_team_id is null then
    select membership.* into v_membership
    from public.team_memberships membership
    where membership.season_id = p_season_id and membership.user_id = p_user_id
    order by (membership.left_at is null) desc, membership.joined_at desc limit 1;
    p_team_id := v_membership.team_id;
  elsif p_user_id is not null then
    select membership.* into v_membership
    from public.team_memberships membership
    where membership.season_id = p_season_id and membership.team_id = p_team_id
      and membership.user_id = p_user_id
    order by membership.joined_at desc limit 1;
  end if;

  if p_team_id is not null then select * into v_team from public.teams where id = p_team_id and season_id = p_season_id; end if;

  select count(distinct submission.id)::integer,
    coalesce(sum(event.points), 0)::integer,
    count(distinct submission.activity_id)::integer,
    count(distinct submission.id) filter (where submission.did_with_teammate)::integer,
    min(submission.created_at),
    min(submission.created_at) filter (where submission.did_with_teammate)
  into v_submission_count, v_personal_points, v_activity_count, v_teammate_submissions,
    v_first_submission_at, v_teammate_submission_at
  from public.submissions submission
  left join public.score_events event on event.source_submission_id = submission.id
  where submission.season_id = p_season_id and submission.submitted_by = p_user_id
    and submission.submission_kind = 'activity' and submission.voided_at is null;

  select coalesce(max(week_points), 0)::integer into v_power_week
  from (
    select submission.week_id, sum(event.points)::integer as week_points
    from public.submissions submission
    join public.score_events event on event.source_submission_id = submission.id
    where submission.season_id = p_season_id and submission.submitted_by = p_user_id
      and submission.submission_kind = 'activity' and submission.voided_at is null
    group by submission.week_id
  ) weekly;

  v_personal_streak := public.longest_activity_date_streak_internal(p_season_id, null, p_user_id);

  select count(*)::integer,
    count(*) filter (where exists (
      select 1 from public.submissions submission
      where submission.week_id = week.id and submission.submitted_by = p_user_id
        and submission.submission_kind = 'activity' and submission.voided_at is null
    ))::integer
  into v_eligible_weeks, v_active_weeks
  from public.competition_weeks week
  where week.season_id = p_season_id and week.status = 'finalized'
    and (v_membership.id is null or week.ends_on >= v_membership.joined_at::date)
    and (v_membership.left_at is null or week.starts_on <= v_membership.left_at::date);

  if v_personal_points > 0 then
    with participants as (
      select membership.user_id, team.tier,
        coalesce(sum(event.points), 0)::integer as points
      from public.team_memberships membership
      join public.teams team on team.id = membership.team_id
      left join public.submissions submission on submission.season_id = membership.season_id
        and submission.submitted_by = membership.user_id and submission.submission_kind = 'activity'
        and submission.voided_at is null
      left join public.score_events event on event.source_submission_id = submission.id
      where membership.season_id = p_season_id and membership.user_id is not null
      group by membership.user_id, team.tier
    ), ranked as (
      select user_id,
        rank() over (order by points desc)::integer overall_rank,
        rank() over (partition by tier order by points desc)::integer tier_rank
      from participants
    )
    select overall_rank, tier_rank into v_overall_rank, v_tier_rank
    from ranked where user_id = p_user_id;
  end if;

  if v_team.id is not null then
    select coalesce(sum(event.points), 0)::integer
    into v_team_points from public.score_events event
    where event.season_id = p_season_id and event.team_id = v_team.id;

    select count(*) filter (where result.points >= result.goal_points)::integer,
      count(*) filter (where result.won)::integer
    into v_goals_met, v_weekly_wins
    from public.team_week_results result
    where result.season_id = p_season_id and result.team_id = v_team.id;

    v_team_streak := public.longest_activity_date_streak_internal(p_season_id, v_team.id, null);

    with active_members as (
      select membership.user_id from public.team_memberships membership
      where membership.team_id = v_team.id and membership.user_id is not null
    ), shared as (
      select week.id,
        count(distinct submission.submitted_by)::integer active_count
      from public.competition_weeks week
      left join public.submissions submission on submission.week_id = week.id
        and submission.team_id = v_team.id and submission.submission_kind = 'activity'
        and submission.voided_at is null
      where week.season_id = p_season_id and week.status = 'finalized'
      group by week.id
    )
    select count(*) filter (where active_count >= 2)::integer
    into v_partner_weeks from shared;

    select exists (
      select 1 from public.team_week_results result
      where result.team_id = v_team.id and result.points >= result.goal_points
        and (select count(distinct submission.submitted_by) from public.submissions submission
          where submission.week_id = result.week_id and submission.team_id = v_team.id
            and submission.submission_kind = 'activity' and submission.voided_at is null) >= 2
    ) into v_perfect_week;
    select min(result.finalized_at) into v_perfect_week_at
    from public.team_week_results result
    where result.team_id = v_team.id and result.points >= result.goal_points
      and (select count(distinct submission.submitted_by) from public.submissions submission
        where submission.week_id = result.week_id and submission.team_id = v_team.id
          and submission.submission_kind = 'activity' and submission.voided_at is null) >= 2;

    with member_points as (
      select membership.user_id, coalesce(sum(event.points), 0)::numeric points
      from public.team_memberships membership
      left join public.submissions submission on submission.season_id = p_season_id
        and submission.team_id = v_team.id and submission.submitted_by = membership.user_id
        and submission.submission_kind = 'activity' and submission.voided_at is null
      left join public.score_events event on event.source_submission_id = submission.id
      where membership.team_id = v_team.id and membership.user_id is not null
      group by membership.user_id
    )
    select count(*)::integer, coalesce(min(points / nullif(v_team_points, 0)), 0)
    into v_member_count, v_min_share from member_points;
    v_balanced := v_season.status = 'completed' and v_member_count = 2 and v_min_share >= 0.35;

    with tiered as (
      select result.*,
        week.starts_on,
        count(*) over (partition by result.week_id, result.tier_key)::numeric tier_size
      from public.team_week_results result
      join public.competition_weeks week on week.id = result.week_id
      where result.season_id = p_season_id
    ), ordered as (
      select tiered.*,
        lag(tiered.rank) over (order by tiered.starts_on) previous_rank,
        lag(tiered.tier_size) over (order by tiered.starts_on) previous_size
      from tiered
      where tiered.team_id = v_team.id
    )
    select exists (select 1 from ordered where rank = 1 and previous_rank > ceil(previous_size::numeric / 2.0))
    into v_comeback;

    select count(*) > 0, min(champion.finalized_at)
    into v_champion, v_champion_at
    from public.season_champions champion where champion.season_id = p_season_id and champion.team_id = v_team.id;
  end if;

  for v_rule in select * from public.season_achievement_rules where season_id = p_season_id and scope = 'personal' order by sort_order loop
    v_detail := null; v_earned := null; v_earned_at := null;
    v_value := case v_rule.achievement_key
      when 'dedicated' then v_submission_count when 'season_contributor' then v_personal_points
      when 'power_week' then v_power_week when 'activity_streak' then v_personal_streak
      when 'activity_explorer' then v_activity_count when 'consistency' then v_active_weeks
      when 'team_player' then v_teammate_submissions else 0 end;
    if v_rule.kind = 'standalone' then
      v_earned := case v_rule.achievement_key
        when 'first_step' then v_submission_count > 0
        when 'better_together' then v_teammate_submissions > 0
        when 'season_finisher' then v_season.status = 'completed' and v_submission_count > 0
        when 'tier_standout' then v_personal_points > 0 and v_tier_rank between 1 and 10
        when 'spartan_standout' then v_personal_points > 0 and v_overall_rank between 1 and 10
        else false end;
      v_detail := case v_rule.achievement_key when 'tier_standout' then case when v_tier_rank is not null then '#' || v_tier_rank || ' in ' || initcap(v_team.tier) || ' tier' end when 'spartan_standout' then case when v_overall_rank is not null then '#' || v_overall_rank || ' overall' end end;
      v_earned_at := case v_rule.achievement_key
        when 'first_step' then v_first_submission_at
        when 'better_together' then v_teammate_submission_at
        when 'season_finisher' then case when v_earned then v_season.updated_at end
        when 'tier_standout' then case when v_earned then v_season.updated_at end
        when 'spartan_standout' then case when v_earned then v_season.updated_at end
      end;
    end if;
    v_personal := v_personal || jsonb_build_array(public.build_achievement_card_internal(v_rule, v_value, v_earned, case when v_rule.achievement_key = 'consistency' then v_eligible_weeks end, v_earned_at, v_detail));
  end loop;

  for v_rule in select * from public.season_achievement_rules where season_id = p_season_id and scope = 'team' order by sort_order loop
    v_detail := null; v_earned := null; v_earned_at := null;
    v_value := case v_rule.achievement_key when 'team_points' then v_team_points when 'goal_crusher' then v_goals_met when 'weekly_winners' then v_weekly_wins when 'team_scoring_streak' then v_team_streak when 'perfect_partners' then v_partner_weeks else 0 end;
    if v_rule.kind = 'standalone' then
      v_earned := case v_rule.achievement_key when 'perfect_week' then v_perfect_week when 'balanced_duo' then v_balanced when 'comeback_crew' then v_comeback when 'tier_champion' then v_champion else false end;
      v_earned_at := case v_rule.achievement_key
        when 'perfect_week' then v_perfect_week_at
        when 'balanced_duo' then case when v_earned then v_season.updated_at end
        when 'comeback_crew' then case when v_earned then v_season.updated_at end
        when 'tier_champion' then v_champion_at
      end;
    end if;
    v_team_cards := v_team_cards || jsonb_build_array(public.build_achievement_card_internal(v_rule, v_value, v_earned, case when v_rule.achievement_key in ('goal_crusher','perfect_partners') then v_eligible_weeks end, v_earned_at, v_detail));
  end loop;

  return jsonb_build_object(
    'season', jsonb_build_object('id', v_season.id, 'slug', v_season.slug, 'name', v_season.name, 'status', v_season.status),
    'team', case when v_team.id is null then null else jsonb_build_object('id', v_team.id, 'name', v_team.name, 'tier', v_team.tier, 'emblem_key', v_team.emblem_key, 'color_key', v_team.color_key, 'motto', v_team.motto) end,
    'membership', case when v_membership.id is null then null else jsonb_build_object('role', v_membership.role, 'joined_at', v_membership.joined_at, 'left_at', v_membership.left_at) end,
    'personal', v_personal, 'team_achievements', v_team_cards
  );
end;
$$;

revoke all on function public.build_achievement_progress_internal(uuid, uuid, uuid)
from public, anon, authenticated;

create or replace function public.get_my_achievement_progress_v1(p_season_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.team_memberships where season_id = p_season_id and user_id = v_uid) then
    raise exception 'You did not participate in this season' using errcode = '42501';
  end if;
  return public.build_achievement_progress_internal(p_season_id, v_uid, null);
end;
$$;

revoke all on function public.get_my_achievement_progress_v1(uuid) from public, anon;
grant execute on function public.get_my_achievement_progress_v1(uuid) to authenticated;

create or replace function public.update_team_style_v1(
  p_team_id uuid,
  p_emblem_key text,
  p_color_key text,
  p_motto text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_motto text := nullif(btrim(coalesce(p_motto, '')), '');
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select team.* into v_team from public.teams team where team.id = p_team_id for update;
  if v_team.id is null then raise exception 'Team not found'; end if;
  if not public.is_admin(v_uid) and not exists (
    select 1 from public.team_memberships membership
    where membership.team_id = p_team_id and membership.user_id = v_uid
      and membership.role = 'captain' and membership.left_at is null
  ) then raise exception 'Only the team captain can customize this team' using errcode = '42501'; end if;
  if (select status from public.seasons where id = v_team.season_id) not in ('registration', 'active') then
    raise exception 'Team identity is locked after the season ends';
  end if;
  if p_emblem_key not in ('helmet','flame','mountain','wings','lightning','shield','compass','trophy') then raise exception 'Unsupported emblem'; end if;
  if p_color_key not in ('purple','crimson','gold','navy','emerald','slate') then raise exception 'Unsupported color'; end if;
  if v_motto is not null and (char_length(v_motto) > 40 or v_motto ~ '[[:cntrl:]]') then raise exception 'Motto must be 40 characters or fewer without control characters'; end if;
  update public.teams set emblem_key = p_emblem_key, color_key = p_color_key, motto = v_motto where id = p_team_id;
  return jsonb_build_object('id', p_team_id, 'emblem_key', p_emblem_key, 'color_key', p_color_key, 'motto', v_motto);
end;
$$;

revoke all on function public.update_team_style_v1(uuid, text, text, text) from public, anon;
grant execute on function public.update_team_style_v1(uuid, text, text, text) to authenticated;

create or replace function public.get_team_profile_v1(p_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_standings record;
  v_roster jsonb;
  v_achievements jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v_team from public.teams where id = p_team_id and archived_at is null;
  if v_team.id is null then raise exception 'Team not found'; end if;
  select * into v_standings from public.team_standings where id = p_team_id;
  select coalesce(jsonb_agg(jsonb_build_object('display_name', membership.display_name_snapshot, 'role', membership.role) order by membership.role, membership.joined_at), '[]'::jsonb)
  into v_roster from public.team_memberships membership where membership.team_id = p_team_id and membership.left_at is null;
  v_achievements := public.build_achievement_progress_internal(v_team.season_id, null, v_team.id)->'team_achievements';
  return jsonb_build_object(
    'id', v_team.id, 'season_id', v_team.season_id, 'name', v_team.name, 'tier', v_team.tier,
    'emblem_key', v_team.emblem_key, 'color_key', v_team.color_key, 'motto', v_team.motto,
    'weekly_points', coalesce(v_standings.weekly_points, 0), 'season_points', coalesce(v_standings.season_points, 0),
    'weeks_won_count', coalesce(v_standings.weeks_won_count, 0), 'streak_count', coalesce(v_standings.streak_count, 0),
    'roster', v_roster, 'achievements', coalesce(v_achievements, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_team_profile_v1(uuid) from public, anon;
grant execute on function public.get_team_profile_v1(uuid) to authenticated;

create or replace view public.team_standings
with (security_invoker = true)
as
select
  t.id, t.season_id, t.name, t.tier,
  coalesce(points.weekly_points, 0)::integer as weekly_points,
  coalesce(points.season_points, 0)::integer as season_points,
  coalesce(results.weeks_won_count, 0)::integer as weeks_won_count,
  coalesce(ts.streak_count, 0) as streak_count,
  ts.last_activity_date, t.created_at, t.archived_at,
  t.emblem_key, t.color_key, t.motto
from public.teams t
join public.seasons s on s.id = t.season_id
left join lateral (
  select
    coalesce(sum(se.points) filter (where cw.starts_on = public.week_start((now() at time zone s.timezone)::date)), 0) as weekly_points,
    coalesce(sum(se.points), 0) as season_points
  from public.score_events se join public.competition_weeks cw on cw.id = se.week_id
  where se.team_id = t.id
) points on true
left join lateral (
  select count(*) filter (where twr.won) as weeks_won_count
  from public.team_week_results twr where twr.team_id = t.id
) results on true
left join public.team_streaks ts on ts.team_id = t.id;

create or replace view public.active_teams
with (security_invoker = true)
as
select
  standings.id, standings.season_id, standings.name, standings.tier, standings.created_at,
  standings.weekly_points, standings.season_points as total_points,
  standings.streak_count, standings.last_activity_date,
  standings.emblem_key, standings.color_key, standings.motto
from public.team_standings standings
where standings.archived_at is null and standings.season_id = public.current_season_id();

create or replace function public.get_my_team_v2()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'season_id', t.season_id, 'name', t.name, 'tier', t.tier,
    'invite_code', t.invite_code, 'role', tm.role,
    'weekly_points', coalesce(standings.weekly_points, 0),
    'total_points', coalesce(standings.season_points, 0),
    'streak_count', coalesce(standings.streak_count, 0),
    'last_activity_date', standings.last_activity_date,
    'emblem_key', t.emblem_key, 'color_key', t.color_key, 'motto', t.motto
  )
  from public.team_memberships tm
  join public.teams t on t.id = tm.team_id and t.archived_at is null
  left join public.team_standings standings on standings.id = t.id
  where tm.user_id = auth.uid() and tm.left_at is null
    and tm.season_id = public.current_season_id()
  limit 1;
$$;

revoke all on function public.get_my_team_v2() from public, anon;
grant execute on function public.get_my_team_v2() to authenticated;

comment on table public.season_achievement_rules is 'Immutable per-season snapshots of achievement names, icons, and thresholds.';
comment on function public.get_my_achievement_progress_v1(uuid) is 'Returns correction-safe personal and team achievement progress computed from canonical season data.';
comment on function public.get_team_profile_v1(uuid) is 'Returns an authenticated-safe public team profile without invite codes, proofs, emails, or private submissions.';

commit;
