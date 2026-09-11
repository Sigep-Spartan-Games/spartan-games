# Database Operations

> **Purpose:** Safe migration, verification, rollback, and routine-maintenance runbook.
> **Source of truth:** `supabase/config.toml`, `supabase/migrations/`, `supabase/tests/`, and `package.json`.
> **Last reviewed:** 2026-09-11

## Season-Close and Deletion Hardening — 2026-09-11

Migration `20260911010000_harden_season_close_and_deletion_requests.sql` was
applied to Supabase project `fkudsbomcwahlwmyqndb` after a rollback-only
production-schema rehearsal. The rehearsal covered an approved deletion with a
proof, an archived team, all missing/completed season weeks, and the current
partial week.

The migration excludes archived teams from newly finalized results and introduces
`close_current_season_v2()`. Season completion closes submissions under the season
row lock, ensures and finalizes every week from the season start through the
current partial week, and only then records the completed status. Both the older
season-control API and new-season rollover delegate to this workflow.

Deletion-request approval now invokes submission voiding in the request-resolution
transaction. The migration repaired one previously approved deletion request:
production now has 2,082 active submissions, one auditable voided submission, no
ledger event attached to that voided row, and no approved deletion linked to an
active submission. That request had no proof attachment, so it queued no Storage
object. Post-migration invariants, database lint, and migration-history comparison
all passed, and live TypeScript database types were regenerated.

## Production Compatibility Retirement — 2026-09-10

The compatibility-free application commit `ad84886` was deployed successfully
before migration `20260910010000_retire_legacy_compatibility.sql` was applied to
Supabase project `fkudsbomcwahlwmyqndb`. This ordering allowed the new application
to run against both schemas, then removed the old objects only after Vercel passed.

The migration removed five duplicate tables (`activity_rules`, `game_settings`,
`streak_settings`, `tier_settings`, and `weekly_history`), nine projection columns
from `teams`, two deprecated submission columns, one derived edit-request column,
and the associated synchronization routines/trigger. Transactional RPC signatures
remain stable and now write only canonical tables.

Migrations `20260910020000` and `20260910030000` then normalized the structured
edit-request numeric key from `activity_units` to `activity_value_number` using a
zero-downtime bridge. Thirty-five resolved request payloads were rewritten; no
pending request required conversion. The final RPC accepts only the canonical key.

Post-release verification confirmed 39 teams, 73 memberships, 2,083 submissions,
2,083 score events, and 1,124 team-week results remained. Retired table/column
counts were zero, local/remote migration histories matched, invariants passed,
database lint returned no findings, and a repeated finalization returned
`already_finalized`. Live TypeScript database types were regenerated.

The protected `release_backup_20260909_pre_normalization` schema remains available
as a same-database logical snapshot. The maintainer explicitly accepted proceeding
without Supabase physical backups/PITR. `CRON_SECRET` is still absent from Vercel,
so both scheduled routes intentionally return HTTP 503 until it is configured and
the application is redeployed.

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
2. `20260909020000_transactional_workflows.sql` — explicit RPC workflows, temporary point projections, idempotent finalization, and compatibility synchronization later retired by step 4.
3. `20260909030000_harden_rls_and_storage.sql` — least-privilege RLS, grants, private proof storage, MIME and size limits.
4. `20260910010000_retire_legacy_compatibility.sql` — canonical-only RPCs/reads and removal of duplicate tables, columns, and sync routines.
5. `20260910020000_normalize_edit_request_payload.sql` — lossless JSON-key backfill plus dual-key deployment bridge.
6. `20260910030000_remove_edit_request_payload_bridge.sql` — canonical-only edit-request payload validation.
7. `20260911010000_harden_season_close_and_deletion_requests.sql` — archived-team exclusion, coordinated season completion/rollover, atomic deletion-request approval, and repair of previously approved deletions.

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

Prefer a forward fix. The compatibility layer has been removed, so rolling the
application back before `ad84886` would be schema-incompatible. Keep the current
canonical contract and repair defects with a reviewed application change or
forward migration.

If access policies cause an incident, do not delete normalized data. Restore the prior grants/policies in a new reviewed migration, then redeploy. If data integrity is affected, stop submissions and restore from the pre-release backup/PITR point with Supabase support procedures. A database restore and Vercel rollback must use compatible release versions.

Never hand-delete rows from `score_events`, `team_week_results`, `team_memberships`, or `competition_weeks` to repair a release. Record a reviewed adjustment or forward migration.

## Scheduled Jobs

Vercel invokes:

- `/api/cron/finalize-week` daily at 06:00 UTC.
- `/api/cron/cleanup-proofs` daily at 06:30 UTC.

Both require `Authorization: Bearer <CRON_SECRET>` and fail closed when the secret is absent. `proxy.ts` permits the request to reach the route; the route performs bearer authentication.

`finalize_competition_week` uses an advisory transaction lock plus a `job_runs` deduplication key. Repeated requests return `already_finalized`, and archived teams are excluded from newly finalized results. `close_current_season_v2` closes submissions and finalizes every season week, including the current partial week, in the completion transaction. Proof cleanup processes at most 250 queued attachments per run and records success/failure in `job_runs`.

## Invariants

`supabase/tests/normalized_model_invariants.sql` verifies:

- every team has a season;
- one active team per user per season and no roster over two members;
- memberships, score events, and finalized results agree with their team/week seasons;
- canonical submission references are populated;
- active submission points match the ledger;
- voided submissions have no ledger events;
- voided-submission proofs are queued for cleanup and approved deletion requests have no active submission;
- season completion and rollover route through the coordinated close workflow;
- retired compatibility tables, columns, and synchronization routines remain absent.

The test is read-only and ends with `ROLLBACK`.
