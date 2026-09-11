# Deployment

> **Purpose:** Release order and production infrastructure.
> **Source of truth:** `vercel.json`, `package.json`, and [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md).
> **Last reviewed:** 2026-09-11

## Current Production Status

The normalized database and compatibility retirement are live. Application commit
`ad84886` deployed successfully before cleanup migration `20260910010000` on
2026-09-10. Production invariants, database lint, migration history, retained row
counts, the anonymous login redirect, and idempotent finalization passed.

`CRON_SECRET` is now present in the production Vercel environment: unauthenticated
requests to both cron routes return HTTP 401 as intended. Confirm an authorized
scheduled invocation in Vercel logs to verify the complete service-role path.
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

For a destructive schema retirement, first deploy an application version that can
run against both the current and target schemas. Apply the migration only after
that deployment passes, then regenerate types and deploy the resulting docs/types
commit. For additive migrations, deploy the database additions before code that
requires them.

1. Confirm backup/PITR or explicitly record accepted recovery limitations and production variables.
2. Validate the migration under rollback and deploy compatibility-free application reads.
3. Wait for the application deployment to pass, then preview/apply the destructive migration.
4. Run database invariants, lint, row-count checks, and smoke tests.
5. Regenerate database TypeScript types and update documentation.

Exact first-deployment, baseline-repair, verification, and rollback commands are in [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md). Do not run `db push` casually from a developer machine.

## Cron

`vercel.json` schedules:

| Route | UTC schedule | Behavior |
|---|---:|---|
| `/api/cron/finalize-week` | `0 6 * * *` | Finalize the previous week idempotently; daily execution supplies retry opportunities |
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

Prefer a forward application fix. Do not roll back to an application older than
`ad84886`, because it reads columns removed by `20260910010000`. If integrity is at
risk, close submissions first, record the failing release/migration, and use an
available compatible recovery point. Do not manually delete ledger/results rows.
