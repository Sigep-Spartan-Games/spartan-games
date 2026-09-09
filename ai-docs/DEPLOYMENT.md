# Deployment

> **Purpose:** Release order and production infrastructure.
> **Source of truth:** `vercel.json`, `package.json`, and [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md).
> **Last reviewed:** 2026-09-09

## Current Production Status

The normalized database migrations and matching Vercel application commit
`567f9b8` were released successfully on 2026-09-09. Production database invariants,
database lint, the application build, the anonymous login redirect, and the browser
console check passed.

`CRON_SECRET` was not present in the production Vercel environment at verification
time. The two cron routes are safely returning HTTP 503, but scheduled finalization
and proof cleanup are paused until the secret is configured and Vercel redeploys.
Authenticated team, submission, proof, and admin workflow smoke tests still require
a maintainer test account.

## Targets

- Application: Vercel, Next.js App Router.
- Database/Auth/Storage: linked Supabase project.
- Scheduled jobs: Vercel cron routes.

## Required Production Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- mail/Slack variables for those enabled integrations
- `NEXT_PUBLIC_SITE_URL`

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md). Production secrets belong in Vercel/provider settings, never Git.

## Checks

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run db:migrations
```

The build fetches the configured Google fonts and therefore needs network access.

## Database/Application Order

The September 2026 normalization introduces new views/RPCs and then revokes legacy direct writes. The matching database and app changes must be released together in a short maintenance window:

1. Confirm backup/PITR and production variables.
2. Preview/apply migrations.
3. Immediately deploy the matching app commit.
4. Run database invariants and smoke tests.
5. Regenerate database TypeScript types.

Exact first-deployment, baseline-repair, verification, and rollback commands are in [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md). Do not run `db push` casually from a developer machine.

## Cron

`vercel.json` schedules:

| Route | UTC schedule | Behavior |
|---|---:|---|
| `/api/cron/finalize-week` | `0 6 * * 1` | Finalize previous week idempotently |
| `/api/cron/cleanup-proofs` | `30 6 * * *` | Purge queued private proof images |

Vercel sends `Authorization: Bearer <CRON_SECRET>`. Both routes return 503 if the secret is not configured and 401 if it does not match.

## Post-Deploy Smoke Test

- Login and session refresh.
- Current leaderboard/rosters, with no exposed email or other-team invite code.
- Team create, join, rename, tier change, leave.
- Numeric/text/boolean submission and teammate bonus.
- Weekly-cap rejection and same-day streak behavior.
- Private proof upload and signed view link.
- Admin rule version change, submission edit/void, tier/streak settings.
- Repeated finalization returns `already_finalized` and does not change totals.
- `npm.cmd run db:verify` and `npm.cmd run db:lint` pass.

## Rollback

Prefer a forward application fix because normalized schema changes retain legacy data. If integrity is at risk, close submissions first, record the failing release/migration, and use the pre-release Supabase recovery point plus the compatible Vercel deployment. Do not manually delete ledger/results rows.
