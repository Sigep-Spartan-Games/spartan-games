# Testing and Verification

> **Purpose:** Required checks for application and database changes.
> **Last reviewed:** 2026-09-16

## Standard Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

The build needs network access for `next/font` Google font downloads. The ESLint configuration excludes generated `.next`, dependencies, and generated database types.

## Database Checks

```powershell
npm.cmd run db:migrations
npm.cmd run db:lint
npm.cmd run db:verify
```

- `db:migrations` compares local and linked migration histories.
- `db:lint` runs Supabase/Postgres lint against the linked database.
- `db:verify` runs read-only normalized-model invariants and finishes with `ROLLBACK`.

`supabase/tests/season_start_activation.sql` is a rollback-only behavior test. It
confirms that activation records the season-local date, pre-start submissions
are rejected, and pre-season finalization does not create an empty week.

`db:verify` requires the normalized migrations to be deployed. Do not expect it to pass against the legacy schema.

## Migration Validation

Before production, validate migrations on a fresh local Supabase database:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
npm.cmd run db:verify
```

Local Supabase requires Docker or another supported container runtime. If that is unavailable, validate SQL against a disposable Supabase branch. A forced-rollback query against production can validate syntax/backfills but does not replace a fresh replay test or user-level RLS test.

## Required Behavioral Cases

### Teams

- Concurrent joins cannot exceed two members.
- A user cannot join/create a second team in one season.
- Non-captains cannot rename/change tier.
- Captain departure promotes the remaining member; empty team archives.
- Captain and admin tier changes are both rejected after Start Games.

### Scoring/submissions

- Numeric, text, and boolean inputs validate correctly.
- Exact rule version is stored.
- Teammate multiplier rounds down once as documented.
- Weekly cap includes the attempted submission under concurrent requests.
- First/consecutive/gap/same-day/backdated streak cases.
- Admin edit/void replays affected streaks in receipt order and refreshes finalized weeks.
- Failed RPC after upload removes the orphan object when possible.
- Voiding removes ledger events but retains submission history.

### Finalization

- Incomplete week is rejected.
- One winner per tier only when points are positive.
- Tie breakers are deterministic.
- Repeated request returns `already_finalized`.
- Ledger-derived standings, `team_week_results`, and `job_runs` agree.

### Season completion

- Starting games replaces the provisional registration date with the season-local activation date.
- Pre-start activity dates are rejected and the cron skips weeks that ended before the season began.
- Weekly wins, then season points, then goals met determine each tier champion.
- All-zero tiers produce no champion; solo and two-person teams rank identically.
- Exact ties enter `finalizing`, reject invalid selections, and require one selected finalist per tied tier.
- Completed champions and scoring data reject updates/deletes, and new-season rollover cannot bypass a pending tie.

### Exports

- Current-season and all-seasons scopes return every row beyond the API's 1,000-row default.
- CSV and XLSX values beginning with spreadsheet formula markers are neutralized.
- Season identifiers and champion snapshots are present in archival exports.

### Security

- Non-admin cannot call admin RPCs despite execute grant.
- Ordinary admins cannot grant/revoke access or transfer ownership.
- Admin grants, revocations, and ownership transfers are atomic and audited.
- Exactly one owner remains after concurrent or repeated access-management requests.
- User cannot read another team’s invite code or profile email.
- User cannot edit/request edits for another user’s submission.
- Public storage URLs fail; authorized signed URLs work and expire.
- Cron missing/wrong secret returns 503/401.
- Auth confirmation rejects absolute and protocol-relative redirect destinations.
- Slack commands reject invalid signatures and non-allow-listed workspaces, users, and configured channels.
- Announcement HTML escapes user content and delivery audit rows cannot be updated or deleted.

## Current Limitations

There is no browser E2E or unit-test suite yet. The current automated floor is lint, TypeScript, production build, SQL replay, database lint, and invariant checks. Add Playwright coverage for the behavioral cases above, especially before future cross-layer schema changes.
