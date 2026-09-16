# Backend and APIs

> **Purpose:** Server boundaries, write APIs, route handlers, and failure behavior.
> **Last reviewed:** 2026-09-16

## Architecture

Next.js Server Components perform reads through the cookie-bound Supabase client. Server Actions authenticate callers and submit validated parameters to PostgreSQL RPCs. Route Handlers cover cron, Slack, and exports. The service-role client is server-only and is used for cron and admin-only queries that require private columns.

Business invariants belong in SQL RPCs because browser requests, admin actions, cron, and future integrations must share the same behavior.

## Supabase Clients

- `lib/supabase/client.ts`: browser session client.
- `lib/supabase/server.ts`: request/cookie server client.
- `lib/supabase/admin.ts`: service-role client; never import into a Client Component.
- `lib/supabase/proxy.ts`: refreshes/validates auth sessions and protects routes.
- `proxy.ts`: Next.js proxy entry point. `/api/cron/*` is exempt from session redirects because each cron route authenticates `CRON_SECRET`.

## Read Helpers and Views

`lib/team-data.ts` composes `team_standings` with `active_team_rosters`. It intentionally avoids joining public team pages to `profiles`, so other users’ email addresses are not exposed.

Prefer these database read contracts:

- `current_season_settings`
- `current_activity_rules`
- `current_tier_settings`
- `active_team_rosters`
- `active_teams`
- `team_standings`
- `get_my_team_v2()` for the caller’s private invite code and membership role

## Transactional RPCs

### Authenticated member workflows

- `create_team_v2(name, tier)`
- `join_team_by_code_v2(code)`
- `get_my_team_v2()`
- `leave_team_v2(team_id)`
- `rename_team_v2(team_id, name)`
- `change_team_tier_v2(team_id, tier)`
- `create_activity_submission_v2(...)`
- `request_submission_edit_v2(submission_id, changes, reason)`

### Admin workflows

- `archive_team_v2(team_id)`
- `save_activity_rule_v2(...)`
- `save_activity_rules_bulk_v2(rules)`
- `archive_activity_v2(activity_key)`
- `set_season_controls_v2(...)`
- `close_current_season_v2()`
- `prepare_season_completion_v2()`
- `complete_season_champions_v2(selections)`
- `get_pending_champion_ties_v2()`
- `update_streak_settings_v2(increment, max)`
- `update_tier_goals_v2(gold, purple, red)`
- `start_new_season_v2(name, starts_on)`
- `admin_update_submission_v2(...)`
- `void_submission_v2(submission_id)`
- `resolve_submission_edit_request_v2(...)`
- `get_all_user_emails()`
- `finalize_competition_week(week_id)`

Admin RPCs are callable by the authenticated role but assert `profiles.is_admin` inside the security-definer function. Granting execute is not equivalent to granting authority.

`set_season_controls_v2` enforces the one-way season lifecycle. Starting active play opens submissions, keeps late registration open, and atomically replaces the provisional registration date with the activation date in the season timezone; a completed season cannot be reopened. Submission writes reject activity dates before that start date, and default weekly finalization skips weeks that ended before it. `prepare_season_completion_v2()` closes both controls, finalizes all weeks, and either records automatic champions or pauses in `finalizing` for exact ties. `complete_season_champions_v2(...)` validates one selected finalist per tied tier and atomically completes the season. `start_new_season_v2(...)` cannot bypass unresolved ties. `resolve_submission_edit_request_v2(...)` invokes `void_submission_v2(...)` when approving a deletion request, keeping request resolution, point removal, and attachment cleanup state atomic.

`recalculate_week_results(week_id, preserve_snapshots)` is an internal, non-client
RPC shared by normal finalization, administrator edits, and voids. Editing a
submission that moves between weeks refreshes both the original and destination
week when finalized. Recalculation covers every team because one point change may
alter ranks and the weekly winner. `rebuild_team_streaks_internal(...)` also
replays affected teams' activity submissions in receipt order so administrator
edits and voids cannot leave stale streak bonuses.

Team creation, joining, and leaving all enforce the participant-level activity lock. Once the caller owns a non-voided activity in the season, that caller cannot switch teams. Joining still permits an unteamed late registrant to fill a one-person team, and a membership trigger guarantees that every write path respects the two-member maximum. Team tiers are locked for captains and administrators after registration.

## Server Actions

- `app/teams/actions.ts`: thin team RPC adapters and cache invalidation.
- `app/submit/actions.ts`: form validation, private image upload, submission RPC, and orphan-upload cleanup on RPC failure.
- `app/profile/actions.ts`: edit-request RPC.
- `app/admin/scoring/actions.ts`: versioned scoring RPCs.
- `app/admin/settings/*actions.ts`: season, tier, streak, and finalization RPCs.
- `app/admin/submissions/actions.ts`: normalized admin edit, void, and request resolution.
- `app/admin/teams/actions.ts`: archive/tier RPCs.
- `app/admin/announcements/actions.ts`: validated Slack/email delivery with immutable audit metadata.

Server Actions redirect with URL-encoded feedback. Database errors are treated as user-safe domain feedback only where the RPC raises controlled messages; do not expose arbitrary internal exceptions in new endpoints.

Season start/end email is deliberately non-transactional: the season change remains committed if SMTP fails. The settings UI reports whether the provider accepted all, some, or none of the intended recipients and calls out test-mode diversion. Provider acceptance is not proof of inbox delivery.

## Cron Routes

### `GET /api/cron/finalize-week`

Validates `Authorization: Bearer ${CRON_SECRET}`, checks for an active season, and invokes the idempotent finalization RPC with the service role. Missing `CRON_SECRET` returns 503; mismatch returns 401.

### `GET /api/cron/cleanup-proofs`

Uses the same auth. Claims a daily `job_runs` key, removes up to 250 queued private proof objects, marks attachments purged, and records errors for retry.

## Other Routes

- `/api/slack/command` and its `/api/slack/notify` compatibility alias: verify Slack signatures, enforce workspace/user/channel allow-lists, safely render email HTML, and audit delivery outcomes. Service-role recipient lookup pages through confirmed Auth users instead of calling an admin-session RPC.
- `/admin/settings/export/*.csv|xlsx`: require an admin session, page through complete datasets, neutralize spreadsheet formulas, and support `scope=current` or `scope=all` for a full archive. Team exports include champion results.
- `/auth/confirm`: exchanges Supabase email tokens and accepts only same-origin relative redirect paths.

## Failure and Retry Rules

- Team joins, caps, streaks, ledger writes, finalization, and finalized-history corrections use locks/constraints rather than check-then-write application logic.
- Finalization is safe to retry by week ID.
- Proof cleanup is safe to retry; storage objects remain private while queued.
- A failed RPC rolls back all database changes. If an upload preceded the RPC, the action attempts to remove it.
