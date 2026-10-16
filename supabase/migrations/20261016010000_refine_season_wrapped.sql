begin;

-- Preserve the deployed v1 aggregate as the source of all existing fields. The
-- compatibility wrapper below only adds the explicitly scoped contribution
-- rankings, so the public RPC contracts and payload version remain unchanged.
alter function public.build_season_wrapped_v1(uuid, uuid, boolean)
rename to build_season_wrapped_base_v1;

create or replace function public.build_season_wrapped_v1(
  p_season_id uuid,
  p_user_id uuid,
  p_allow_incomplete boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_overall_rank integer;
  v_overall_count integer;
  v_tier_rank integer;
  v_tier_count integer;
  v_contribution_tier text;
begin
  v_result := public.build_season_wrapped_base_v1(
    p_season_id,
    p_user_id,
    p_allow_incomplete
  );

  if v_result->>'status' <> 'ready' then
    return v_result;
  end if;

  with
  latest_submission_team as (
    select distinct on (submission.submitted_by)
      submission.submitted_by as user_id,
      submission.team_id
    from public.submissions submission
    where submission.season_id = p_season_id
      and submission.submission_kind = 'activity'
      and submission.voided_at is null
      and submission.submitted_by is not null
    order by
      submission.submitted_by,
      submission.created_at desc,
      submission.id desc
  ),
  latest_membership_team as (
    select distinct on (membership.user_id)
      membership.user_id,
      membership.team_id
    from public.team_memberships membership
    where membership.season_id = p_season_id
      and membership.user_id is not null
      and membership.left_at is null
    order by
      membership.user_id,
      membership.joined_at desc,
      membership.id desc
  ),
  eligible_participants as (
    select submission.user_id, submission.team_id
    from latest_submission_team submission

    union all

    select membership.user_id, membership.team_id
    from latest_membership_team membership
    where not exists (
      select 1
      from latest_submission_team submission
      where submission.user_id = membership.user_id
    )
  ),
  participant_points as (
    select
      participant.user_id,
      team.tier,
      coalesce(sum(event.points), 0)::integer as points
    from eligible_participants participant
    join public.teams team
      on team.id = participant.team_id
     and team.season_id = p_season_id
    left join public.submissions submission
      on submission.season_id = p_season_id
     and submission.submitted_by = participant.user_id
     and submission.submission_kind = 'activity'
     and submission.voided_at is null
    left join public.score_events event
      on event.source_submission_id = submission.id
    group by participant.user_id, team.tier
  ),
  ranked_participants as (
    select
      participant.user_id,
      participant.tier,
      rank() over (order by participant.points desc)::integer as overall_rank,
      count(*) over ()::integer as overall_count,
      rank() over (
        partition by participant.tier
        order by participant.points desc
      )::integer as tier_rank,
      count(*) over (partition by participant.tier)::integer as tier_count
    from participant_points participant
  )
  select
    participant.overall_rank,
    participant.overall_count,
    participant.tier_rank,
    participant.tier_count,
    participant.tier
  into
    v_overall_rank,
    v_overall_count,
    v_tier_rank,
    v_tier_count,
    v_contribution_tier
  from ranked_participants participant
  where participant.user_id = p_user_id;

  v_result := jsonb_set(
    v_result,
    '{personal}',
    (v_result->'personal') || jsonb_build_object(
      -- Existing names remain aliases for the all-season-player ranking.
      'contribution_rank', v_overall_rank,
      'participant_count', coalesce(v_overall_count, 0),
      'overall_contribution_rank', v_overall_rank,
      'overall_participant_count', coalesce(v_overall_count, 0),
      'tier_contribution_rank', v_tier_rank,
      'tier_participant_count', coalesce(v_tier_count, 0),
      'contribution_tier', v_contribution_tier
    ),
    false
  );

  return v_result;
end;
$$;

-- Rebind both wrappers to the compatibility function created above. PostgreSQL
-- tracks function dependencies by object identity, so replacing these bodies is
-- necessary after renaming the deployed builder.
create or replace function public.get_my_season_wrapped_v1(p_season_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return public.build_season_wrapped_v1(p_season_id, v_uid, false);
end;
$$;

create or replace function public.get_season_wrapped_preview_v1(
  p_season_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return public.build_season_wrapped_v1(p_season_id, p_user_id, true);
end;
$$;

revoke all on function public.build_season_wrapped_base_v1(uuid, uuid, boolean)
from public, anon, authenticated;

revoke all on function public.build_season_wrapped_v1(uuid, uuid, boolean)
from public, anon, authenticated;

revoke all on function public.get_my_season_wrapped_v1(uuid)
from public, anon;
grant execute on function public.get_my_season_wrapped_v1(uuid)
to authenticated;

revoke all on function public.get_season_wrapped_preview_v1(uuid, uuid)
from public, anon;
grant execute on function public.get_season_wrapped_preview_v1(uuid, uuid)
to authenticated;

comment on function public.build_season_wrapped_base_v1(uuid, uuid, boolean) is
  'Internal deployed v1 season recap aggregate retained as the compatibility base.';

comment on function public.build_season_wrapped_v1(uuid, uuid, boolean) is
  'Internal read-only season recap aggregator with overall and tier contribution rankings. Direct client execution is revoked.';

comment on function public.get_my_season_wrapped_v1(uuid) is
  'Returns the authenticated player and team recap for a completed season.';

comment on function public.get_season_wrapped_preview_v1(uuid, uuid) is
  'Admin-only read preview of a player and team recap before or after season completion.';

commit;
