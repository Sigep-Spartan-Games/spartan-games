# Architecture

> **Purpose:** System boundaries and durable engineering decisions.
> **Last reviewed:** 2026-09-09

## System Shape

Spartan Games is a server-first Next.js App Router application backed by Supabase Postgres, Auth, and Storage.

```text
Browser
  ├─ Server Components ── read views/RLS ─┐
  ├─ Server Actions ── transactional RPCs ├─ Supabase Postgres
  └─ Supabase Auth client ────────────────┘

Vercel Cron ── bearer-auth route ── service role ── RPC/Storage
Slack ── signature-auth route ── announcement services
```

## Boundaries

### UI

`app/` contains routes. Pages are primarily Server Components. Client Components exist for interactive forms/dialogs and receive serializable data/actions. Shared UI lives in `components/`.

### Request authentication

`proxy.ts` is the Next.js request entry point. `lib/supabase/proxy.ts` refreshes cookies, validates sessions, and redirects unauthenticated page requests. Cron and Slack routes are allowed through because they have their own authentication.

### Reads

Server Components use `lib/supabase/server.ts`. Domain-specific composition belongs in helpers such as `lib/team-data.ts`. Public team UI reads safe database views and roster name snapshots, not raw profiles or invite-code columns.

### Writes

Server Actions parse form/upload input and invoke security-definer RPCs. PostgreSQL owns authorization, locking, caps, points, streaks, and state transitions. Direct browser mutation grants are revoked for competition tables.

### Privileged work

`lib/supabase/admin.ts` creates a non-persistent service-role client for cron and guarded server-only admin/export reads. Importing it into a Client Component is a security defect.

## Database Architecture

The normalized model has four layers:

1. Configuration: seasons, tiers, activities, versioned scoring rules.
2. Participation: teams, memberships, streaks.
3. Events: submissions, attachments, edit requests, point ledger.
4. Results/operations: competition weeks, team results, job runs.

`score_events` is authoritative for points. `team_standings` derives display totals; point fields on `teams` are compatibility caches rebuilt by ledger triggers. Finalization creates result snapshots and does not destroy event data.

See [DATA_MODEL.md](./DATA_MODEL.md) and [BUSINESS_RULES.md](./BUSINESS_RULES.md).

## Compatibility Strategy

Legacy tables/columns remain synchronized so older exports and a short coordinated rollout continue to work. New features must use normalized tables/views/RPCs. Compatibility removal is a separate future migration requiring search results, production telemetry, exports, and E2E tests.

## Storage

Proof images use the private `submission-proofs` bucket. Upload happens before the submission RPC because Storage and Postgres cannot share a transaction; on RPC failure the action attempts object cleanup. Successful objects receive attachment metadata. UI access uses expiring signed URLs. Voids queue deletion for a retryable cron job.

## Operational Architecture

- Supabase CLI configuration and complete migration history are checked in.
- A reconstructed baseline supports fresh environments and is marked applied—not executed—on the existing production database.
- `job_runs` plus advisory locks provide cron idempotency/observability.
- `supabase/tests/normalized_model_invariants.sql` checks cross-table projections after deployment.
- Generated Supabase types are refreshed with `npm run db:types` after schema deployment.

## Important Decisions

- Archive/void historical entities instead of cascading deletion.
- Snapshot display names and scoring inputs so auth/profile/rule changes do not rewrite history.
- Keep week dates canonical and labels presentational.
- Use season timezone for all week/current-date logic.
- Fail closed for missing settings, secrets, authorization, and unsupported input.
- Prefer a forward migration/fix to down-migrating competition history.
