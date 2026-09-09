# Feature and Fix Guide

> **Purpose:** Cross-layer workflow for future changes.
> **Last reviewed:** 2026-09-09

## Before Editing

1. Read [README.md](./README.md) and the task-specific docs.
2. Inspect the page, component, action/route, helper, RPC, policies, and exports involved.
3. Check `git status`; preserve unrelated work.
4. Verify the target Supabase project before any linked command.
5. Separate code facts from provider-dashboard assumptions.

## Change Map

| Area | Start with | Also review |
|---|---|---|
| Scoring/activity | `current_activity_rules`, scoring RPCs | submission snapshots, caps, exports, rules UI |
| Teams | team RPCs, `lib/team-data.ts` | memberships, roster views, invite privacy, season archive |
| Streak | `create_activity_submission_v2` | team lock, bonus ledger event, season settings |
| Finalization | `finalize_competition_week` | results, projections, history export, cron/job runs |
| Auth/RLS | `proxy.ts`, RLS migration, `assert_admin` | object ownership, grants, service-role use |
| Upload | submit action, storage policies | attachment metadata, signed URLs, cleanup cron |
| Schema | ordered migration | backfill, locks, constraints, RLS, indexes, tests, types, docs |

## Mutation Rules

- Authenticate and authorize both in server code and the database workflow.
- Never trust user/team/admin/points values from the browser.
- Keep business invariants in transactional RPCs, not duplicated TypeScript.
- Lock the resource when a decision depends on current rows (join capacity, cap, streak, finalization).
- Use constraints as the final concurrency guard.
- Fail closed when settings or secrets cannot be read.
- Return controlled domain errors and check every database/storage result.
- Use archive/void/adjustment semantics for historical competition data.

## Database Workflow

1. Add a deterministic timestamped migration.
2. Include the backfill and validate existing rows before `NOT NULL`/FK enforcement.
3. Define indexes from known query paths; avoid duplicate low-value indexes.
4. Enable RLS, add explicit policies/grants, and secure definer search paths.
5. Update views/RPCs before application call sites.
6. Replay all migrations on a fresh local/disposable database.
7. Run database lint and invariants.
8. Regenerate `lib/database.types.ts` after deployment.
9. Update exports and AI docs.

See [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md) before linked production work.

## Compatibility Fields

New work must not add dependencies on legacy team roster slots, legacy settings tables, `weekly_history`, synthetic streak activities, or direct point-cache mutation. Compatibility removal requires a separate audited migration and E2E coverage.

## Definition of Done

- Lint, typecheck, build, migration replay, database lint, and relevant invariants pass.
- Happy, invalid, unauthenticated, unauthorized, repeated, and concurrent paths were considered.
- No production notification/destructive operation was used as a test.
- Data changes include migration, RLS/grants, backfill, indexes, rollback/forward-fix plan, and docs.
- No secret, production data, public proof URL, or service-role code reaches the client.
