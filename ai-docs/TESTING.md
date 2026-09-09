# Testing and Verification

> **Purpose:** Required checks for application and database changes.
> **Last reviewed:** 2026-09-09

## Standard Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

The build needs network access for `next/font` Google font downloads. The ESLint configuration excludes generated `.next`, dependencies, generated database types, and legacy ad hoc diagnostic scripts.

## Database Checks

```powershell
npm.cmd run db:migrations
npm.cmd run db:lint
npm.cmd run db:verify
```

- `db:migrations` compares local and linked migration histories.
- `db:lint` runs Supabase/Postgres lint against the linked database.
- `db:verify` runs read-only normalized-model invariants and finishes with `ROLLBACK`.

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

### Scoring/submissions

- Numeric, text, and boolean inputs validate correctly.
- Exact rule version is stored.
- Teammate multiplier rounds down once as documented.
- Weekly cap includes the attempted submission under concurrent requests.
- First/consecutive/gap/same-day/backdated streak cases.
- Failed RPC after upload removes the orphan object when possible.
- Voiding removes ledger events but retains submission history.

### Finalization

- Incomplete week is rejected.
- One winner per tier only when points are positive.
- Tie breakers are deterministic.
- Repeated request returns `already_finalized`.
- Team caches, results, compatibility history, and `job_runs` agree.

### Security

- Non-admin cannot call admin RPCs despite execute grant.
- User cannot read another team’s invite code or profile email.
- User cannot edit/request edits for another user’s submission.
- Public storage URLs fail; authorized signed URLs work and expire.
- Cron missing/wrong secret returns 503/401.

## Current Limitations

There is no browser E2E or unit-test suite yet. The current automated floor is lint, TypeScript, production build, SQL replay, database lint, and invariant checks. Add Playwright coverage for the behavioral cases above before removing compatibility columns.
