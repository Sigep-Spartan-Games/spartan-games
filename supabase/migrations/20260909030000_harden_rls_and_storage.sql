-- Least-privilege policies for the normalized model and private proof storage.

begin;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'activity_rules', 'game_settings', 'teams', 'submissions',
        'streak_settings', 'tier_settings', 'weekly_history',
        'submission_edit_requests', 'tiers', 'seasons', 'season_tiers',
        'team_memberships', 'team_streaks', 'competition_weeks', 'activities',
        'scoring_rule_versions', 'score_events', 'team_week_results',
        'job_runs', 'submission_attachments'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.activity_rules enable row level security;
alter table public.game_settings enable row level security;
alter table public.teams enable row level security;
alter table public.submissions enable row level security;
alter table public.streak_settings enable row level security;
alter table public.tier_settings enable row level security;
alter table public.weekly_history enable row level security;
alter table public.submission_edit_requests enable row level security;
alter table public.tiers enable row level security;
alter table public.seasons enable row level security;
alter table public.season_tiers enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_streaks enable row level security;
alter table public.competition_weeks enable row level security;
alter table public.activities enable row level security;
alter table public.scoring_rule_versions enable row level security;
alter table public.score_events enable row level security;
alter table public.team_week_results enable row level security;
alter table public.job_runs enable row level security;
alter table public.submission_attachments enable row level security;

create policy profiles_select_own_or_admin
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

create policy profiles_update_own_or_admin
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

revoke update on table public.profiles from authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

create policy activity_rules_read_authenticated
on public.activity_rules for select to authenticated using (true);

create policy game_settings_read_authenticated
on public.game_settings for select to authenticated using (true);

create policy streak_settings_read_authenticated
on public.streak_settings for select to authenticated using (true);

create policy tier_settings_read_authenticated
on public.tier_settings for select to authenticated using (true);

create policy tiers_read_authenticated
on public.tiers for select to authenticated using (true);

create policy seasons_read_authenticated
on public.seasons for select to authenticated using (true);

create policy season_tiers_read_authenticated
on public.season_tiers for select to authenticated using (true);

create policy teams_read_active_or_admin
on public.teams for select to authenticated
using (archived_at is null or public.is_admin(auth.uid()));

create policy memberships_read_authenticated
on public.team_memberships for select to authenticated using (true);

create policy streaks_read_authenticated
on public.team_streaks for select to authenticated using (true);

create policy weeks_read_authenticated
on public.competition_weeks for select to authenticated using (true);

create policy activities_read_authenticated
on public.activities for select to authenticated using (true);

create policy scoring_versions_read_authenticated
on public.scoring_rule_versions for select to authenticated using (true);

create policy score_events_read_authenticated
on public.score_events for select to authenticated using (true);

create policy results_read_authenticated
on public.team_week_results for select to authenticated using (true);

create policy weekly_history_read_authenticated
on public.weekly_history for select to authenticated using (true);

create policy submissions_read_team_or_admin
on public.submissions for select to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.team_memberships tm
    where tm.team_id = submissions.team_id
      and tm.user_id = auth.uid()
      and tm.left_at is null
  )
);

create policy edit_requests_read_own_or_admin
on public.submission_edit_requests for select to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy attachments_read_own_or_admin
on public.submission_attachments for select to authenticated
using (uploaded_by = auth.uid() or public.is_admin(auth.uid()));

create policy job_runs_read_admin
on public.job_runs for select to authenticated
using (public.is_admin(auth.uid()));

grant select on table
  public.profiles,
  public.activity_rules,
  public.game_settings,
  public.submissions,
  public.streak_settings,
  public.tier_settings,
  public.weekly_history,
  public.submission_edit_requests,
  public.tiers,
  public.seasons,
  public.season_tiers,
  public.team_memberships,
  public.team_streaks,
  public.competition_weeks,
  public.activities,
  public.scoring_rule_versions,
  public.score_events,
  public.team_week_results,
  public.job_runs,
  public.submission_attachments
to authenticated, service_role;

revoke select on table public.teams from anon, authenticated;
grant select (
  id, season_id, name, weekly_points, total_points, weeks_won, created_at,
  tier, streak_count, last_activity_date, archived_at
) on public.teams to authenticated;
grant all on table public.teams to service_role;

grant select on table
  public.current_activity_rules,
  public.current_tier_settings,
  public.current_season_settings,
  public.active_team_rosters,
  public.active_teams,
  public.team_standings
to authenticated, service_role;

grant all on table
  public.profiles,
  public.activity_rules,
  public.game_settings,
  public.submissions,
  public.streak_settings,
  public.tier_settings,
  public.weekly_history,
  public.submission_edit_requests,
  public.tiers,
  public.seasons,
  public.season_tiers,
  public.team_memberships,
  public.team_streaks,
  public.competition_weeks,
  public.activities,
  public.scoring_rule_versions,
  public.score_events,
  public.team_week_results,
  public.job_runs,
  public.submission_attachments
to service_role;

-- Table mutation is deliberately unavailable to browser sessions. All writes
-- below go through security-definer RPCs that validate identity and state.
revoke insert, update, delete on table
  public.activity_rules,
  public.game_settings,
  public.teams,
  public.submissions,
  public.streak_settings,
  public.tier_settings,
  public.weekly_history,
  public.submission_edit_requests,
  public.tiers,
  public.seasons,
  public.season_tiers,
  public.team_memberships,
  public.team_streaks,
  public.competition_weeks,
  public.activities,
  public.scoring_rule_versions,
  public.score_events,
  public.team_week_results,
  public.job_runs,
  public.submission_attachments
from anon, authenticated;

revoke execute on function public.assert_admin() from public, anon, authenticated;
revoke execute on function public.sync_legacy_team_members(uuid) from public, anon, authenticated;
revoke execute on function public.rebuild_team_point_projection(uuid) from public, anon, authenticated;
revoke execute on function public.ensure_competition_week(uuid, date) from public, anon, authenticated;
revoke execute on function public.score_event_projection_trigger() from public, anon, authenticated;
revoke execute on function public.submission_points_insert() from public, anon, authenticated;
revoke execute on function public.submission_points_update() from public, anon, authenticated;
revoke execute on function public.submission_points_delete() from public, anon, authenticated;

revoke execute on function public.create_team_v2(text, text) from public, anon;
revoke execute on function public.join_team_by_code_v2(text) from public, anon;
revoke execute on function public.get_my_team_v2() from public, anon;
revoke execute on function public.leave_team_v2(uuid) from public, anon;
revoke execute on function public.rename_team_v2(uuid, text) from public, anon;
revoke execute on function public.change_team_tier_v2(uuid, text) from public, anon;
revoke execute on function public.create_activity_submission_v2(uuid, text, date, boolean, numeric, text, boolean, text, text, integer) from public, anon;
revoke execute on function public.request_submission_edit_v2(uuid, jsonb, text) from public, anon;

grant execute on function public.create_team_v2(text, text) to authenticated;
grant execute on function public.join_team_by_code_v2(text) to authenticated;
grant execute on function public.get_my_team_v2() to authenticated;
grant execute on function public.leave_team_v2(uuid) to authenticated;
grant execute on function public.rename_team_v2(uuid, text) to authenticated;
grant execute on function public.change_team_tier_v2(uuid, text) to authenticated;
grant execute on function public.create_activity_submission_v2(uuid, text, date, boolean, numeric, text, boolean, text, text, integer) to authenticated;
grant execute on function public.request_submission_edit_v2(uuid, jsonb, text) to authenticated;

revoke execute on function public.archive_team_v2(uuid) from public, anon;
revoke execute on function public.save_activity_rule_v2(text, text, text, text, text, numeric, numeric, numeric, numeric, integer) from public, anon;
revoke execute on function public.save_activity_rules_bulk_v2(jsonb) from public, anon;
revoke execute on function public.archive_activity_v2(text) from public, anon;
revoke execute on function public.set_season_controls_v2(boolean, boolean, text) from public, anon;
revoke execute on function public.update_streak_settings_v2(integer, integer) from public, anon;
revoke execute on function public.update_tier_goals_v2(integer, integer, integer) from public, anon;
revoke execute on function public.start_new_season_v2(text, date) from public, anon;
revoke execute on function public.admin_update_submission_v2(uuid, uuid, text, date, boolean, numeric, text, boolean) from public, anon;
revoke execute on function public.void_submission_v2(uuid) from public, anon;
revoke execute on function public.resolve_submission_edit_request_v2(uuid, text, text) from public, anon;
revoke execute on function public.get_all_user_emails() from public, anon;
revoke execute on function public.finalize_competition_week(uuid) from public, anon;
revoke execute on function public.finalize_week(date) from public, anon;

grant execute on function public.archive_team_v2(uuid) to authenticated;
grant execute on function public.save_activity_rule_v2(text, text, text, text, text, numeric, numeric, numeric, numeric, integer) to authenticated;
grant execute on function public.save_activity_rules_bulk_v2(jsonb) to authenticated;
grant execute on function public.archive_activity_v2(text) to authenticated;
grant execute on function public.set_season_controls_v2(boolean, boolean, text) to authenticated;
grant execute on function public.update_streak_settings_v2(integer, integer) to authenticated;
grant execute on function public.update_tier_goals_v2(integer, integer, integer) to authenticated;
grant execute on function public.start_new_season_v2(text, date) to authenticated;
grant execute on function public.admin_update_submission_v2(uuid, uuid, text, date, boolean, numeric, text, boolean) to authenticated;
grant execute on function public.void_submission_v2(uuid) to authenticated;
grant execute on function public.resolve_submission_edit_request_v2(uuid, text, text) to authenticated;
grant execute on function public.get_all_user_emails() to authenticated;
grant execute on function public.finalize_competition_week(uuid) to authenticated, service_role;
grant execute on function public.finalize_week(date) to authenticated, service_role;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where id = 'submission-proofs';

drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists submission_proofs_insert_own_folder on storage.objects;
drop policy if exists submission_proofs_select_authorized on storage.objects;
drop policy if exists submission_proofs_delete_own_or_admin on storage.objects;

create policy submission_proofs_insert_own_folder
on storage.objects for insert to authenticated
with check (
  bucket_id = 'submission-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy submission_proofs_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'submission-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin(auth.uid())
  )
);

create policy submission_proofs_delete_own_or_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'submission-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin(auth.uid())
  )
);

commit;
