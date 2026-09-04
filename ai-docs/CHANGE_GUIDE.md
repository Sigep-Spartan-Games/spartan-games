# Feature and Fix Guide

> **Purpose:** Cross-layer workflow for developers and AI agents implementing features or bug fixes.
> **Last reviewed:** 2026-09-04

## Before Editing

1. Read [README.md](./README.md) and the task-specific documents it links.
2. Inspect the current page, client component, server action/route, shared helper, and every table query involved.
3. Check `git status` and preserve unrelated changes.
4. Separate verified repository behavior from assumptions about Supabase, Vercel, Slack, and SMTP dashboards.
5. Confirm that the configured database is safe before any manual mutation, email, Slack, reset, or finalization test.

## Change Map

| Change | Common Code | Also Review |
|--------|-------------|-------------|
| New activity/scoring behavior | `app/submit/`, `app/admin/scoring/`, `app/admin/submissions/` | `lib/activity-units.ts`, DB point triggers, exports, rules copy |
| Team behavior | `app/teams/`, `app/admin/teams/` | leaderboard/profile assumptions, RLS, two-member/single-team invariants |
| Streak behavior | `app/submit/actions.ts`, streak settings | synthetic streak submissions, admin edits, weekly history |
| Weekly finalization | `lib/finalize-week.ts`, cron route, admin settings | middleware, missing SQL function/trigger, history/export |
| Auth/authorization | `lib/supabase/proxy.ts`, `lib/admin.ts`, auth components | page guards, action guards, RLS, public-route prefix matching |
| New admin page/action | `app/admin/` | page-level `requireAdmin()`, action-level guard, admin tabs |
| File upload | submit client/action | Storage policies, size/content checks, reset cleanup, public URLs |
| Notification | announcement/settings actions, `lib/email.ts`, `lib/slack.ts` | test mode, recipient RPC, Slack user authorization, HTML escaping |
| Database column/table | new ordered migration plus all queries/types | RLS, indexes, backfill, rollback, exports, `DATA_MODEL.md` |
| New environment variable | consuming module | `.env` template, Vercel environments, security classification |

## Server-Side Checklist

For every mutation or route:

- Authenticate the caller using the appropriate mechanism.
- Authorize the role and the specific object relationship; do not trust IDs supplied by a client.
- Validate type, range, length, allowlisted values, and state gates on the server.
- Fail closed when security configuration is missing.
- Consider concurrency and atomicity. Submission creation currently spans activity insert, streak insert, and team update without an application transaction.
- Check every database/storage result that affects correctness.
- Revalidate affected pages or return/redirect consistently.
- Keep privileged service-role clients in server-only code.

## Database Changes

Never rely only on editing `DATA_MODEL.md` or live dashboard SQL.

1. Add a migration with deterministic ordering and idempotency where appropriate.
2. Include constraints, indexes, RLS enablement/policies, functions, and triggers required by the feature.
3. Provide a safe backfill for existing rows.
4. Test the migration on a disposable or dedicated development project.
5. Update manual TypeScript types and every explicit `.select(...)` list.
6. Update exports and documentation.

The repository currently lacks a baseline schema. Obtain and review a schema-only export before attempting to make the migrations independently reproducible.

## UI Changes

- Keep server components as the default; introduce a client boundary only for hooks, browser APIs, or event handlers.
- Use existing components and semantic CSS tokens before adding new patterns.
- Include loading, empty, error, success, responsive, keyboard, and screen-reader states.
- Treat client validation as convenience; duplicate security and business validation server-side.
- Update both desktop and mobile navigation deliberately. They currently expose different item sets.

## Definition of Done

- Relevant static checks and production build pass; see [TESTING.md](./TESTING.md).
- Happy path, validation failures, unauthenticated, unauthorized, and stale/concurrent cases were considered.
- No production notification or destructive operation was used as a test.
- Migrations and RLS are included for data changes.
- Relevant AI docs and their review dates are updated.
- Unverified external configuration is labeled rather than guessed.

## Useful AI Prompt Context

When asking an AI agent to change this system, include the desired behavior, affected role, state conditions, and acceptance criteria. Ask it to start with `ai-docs/README.md`, inspect implementation before editing, preserve unrelated changes, and report any dependency on unversioned database behavior.
