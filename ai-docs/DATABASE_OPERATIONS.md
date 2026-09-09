# Database Operations

> **Purpose:** Safe migration, verification, rollback, and routine-maintenance runbook.
> **Source of truth:** `supabase/config.toml`, `supabase/migrations/`, `supabase/tests/`, and `package.json`.
> **Last reviewed:** 2026-09-09

## Production Release Record — 2026-09-09

The first managed production rollout completed against Supabase project
`fkudsbomcwahlwmyqndb` and application release commit `567f9b8`:

- the reconstructed `20260122000000` baseline was marked applied, not executed;
- migrations `20260909010000`, `20260909020000`, and `20260909030000` applied successfully;
- local and remote migration ledgers match;
- production invariants passed and database lint returned no findings;
- GitHub/Vercel reported the matching application deployment successful;
- anonymous browser checks confirmed the login redirect and no browser-console errors;
- live database types were regenerated into `lib/database.types.ts`.

Supabase reported no downloadable physical backups and PITR disabled before this
release. A protected logical snapshot was therefore created in the non-API schema
`release_backup_20260909_pre_normalization` using
`supabase/scripts/create_pre_normalization_snapshot.sql`. It contains all pre-release
`public` rows, the submission-proof bucket/object metadata, migration history, and
relevant catalog definitions. Keep it until the release has been stable and an
independent backup policy is enabled. This same-database snapshot protects against
logical migration mistakes; it is not a substitute for an independent physical
backup or PITR during an infrastructure failure.

One operational item remains: the 2026-09-09 production smoke test found that
`CRON_SECRET` is absent from Vercel. Both cron endpoints correctly return HTTP 503
and will not perform work until the variable is configured and the app is redeployed.
After configuration, an unauthenticated request must return HTTP 401 and a Vercel
cron request with the bearer secret must succeed.

## Ownership Model

PostgreSQL is the authority for identities, season state, team membership, scoring, point totals, and weekly finalization. Next.js actions validate form shape and uploads, then call transactional RPCs. Do not recreate scoring, cap, streak, or membership logic in TypeScript.

All schema changes must be represented by an ordered migration. Do not make untracked SQL Editor changes. After an emergency dashboard change, immediately capture the exact change in a migration and reconcile migration history.

## CLI

The project uses the repository-local Supabase CLI:

```powershell
npx.cmd supabase --version
npm.cmd run db:migrations
```

On macOS/Linux, use `npx supabase` and `npm run` without `.cmd`.

Local Supabase requires Docker or another supported container runtime. The linked-project commands do not require local Docker.

## First Managed Deployment

`20260122000000_initial_schema.sql` is a reconstructed baseline for fresh environments. Its objects already exist in production, so mark only that baseline as applied before the first managed push:

```powershell
npx.cmd supabase migration repair --linked --status applied 20260122000000
```

Never run the baseline SQL against the existing production database. Never mark the three `20260909...` migrations applied unless they actually completed.

The normalized rollout migrations are:

1. `20260909010000_normalize_core_model.sql` — additive tables, keys, backfills, views, constraints, and indexes.
2. `20260909020000_transactional_workflows.sql` — explicit RPC workflows, point projections, idempotent finalization, and compatibility synchronization.
3. `20260909030000_harden_rls_and_storage.sql` — least-privilege RLS, grants, private proof storage, MIME and size limits.

## Production Rollout

This rollout changes application contracts and RLS together. Use a short maintenance window and have the matching Vercel deployment ready before starting.

1. Confirm a current Supabase backup/PITR recovery point and record the release commit.
2. Confirm `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in the production Vercel environment.
3. Run local checks:

   ```powershell
   npm.cmd run lint
   npm.cmd run typecheck
   npm.cmd run build
   npm.cmd run db:migrations
   ```

4. Mark the reconstructed baseline applied once, as described above.
5. Preview the push:

   ```powershell
   npx.cmd supabase db push --linked --dry-run
   ```

6. Apply migrations:

   ```powershell
   npx.cmd supabase db push --linked
   ```

7. Immediately deploy the matching application commit.
8. Run invariants and database lint:

   ```powershell
   npm.cmd run db:verify
   npm.cmd run db:lint
   ```

9. Regenerate and commit database types after the schema is live:

   ```powershell
   npm.cmd run db:types
   npm.cmd run typecheck
   ```

10. Smoke-test login, team create/join/leave, one submission, proof signed URL, admin scoring edit, edit request, and a non-current finalization call that returns `already_finalized` without changing totals.

## Rollback

Prefer a forward fix. The normalized migrations preserve legacy columns and tables as compatibility projections, so the new schema can remain while application defects are corrected.

If access policies cause an incident, do not delete normalized data. Restore the prior grants/policies in a new reviewed migration, then redeploy. If data integrity is affected, stop submissions and restore from the pre-release backup/PITR point with Supabase support procedures. A database restore and Vercel rollback must use compatible release versions.

Never hand-delete rows from `score_events`, `team_week_results`, `team_memberships`, or `competition_weeks` to repair a release. Record a reviewed adjustment or forward migration.

## Scheduled Jobs

Vercel invokes:

- `/api/cron/finalize-week` at 06:00 UTC Monday.
- `/api/cron/cleanup-proofs` daily at 06:30 UTC.

Both require `Authorization: Bearer <CRON_SECRET>` and fail closed when the secret is absent. `proxy.ts` permits the request to reach the route; the route performs bearer authentication.

`finalize_competition_week` uses an advisory transaction lock plus a `job_runs` deduplication key. Repeated requests return `already_finalized`. Proof cleanup processes at most 250 queued attachments per run and records success/failure in `job_runs`.

## Invariants

`supabase/tests/normalized_model_invariants.sql` verifies:

- every team has a season;
- one active team per user per season and no roster over two members;
- canonical submission references are populated;
- active submission points match the ledger;
- voided submissions have no ledger events;
- cached weekly totals match the current-week ledger.

The test is read-only and ends with `ROLLBACK`.
