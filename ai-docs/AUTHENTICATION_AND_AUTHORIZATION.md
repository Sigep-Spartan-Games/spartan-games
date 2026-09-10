# Authentication and Authorization

> **Purpose:** Authentication, route protection, database authorization, and private-file access.
> **Last reviewed:** 2026-09-10

## Authentication

Supabase Auth provides email/password sessions. `proxy.ts` calls `lib/supabase/proxy.ts`, which validates the user with `auth.getUser()` and refreshes cookies.

Public route prefixes are auth pages, Slack handlers, and `/api/cron`. Slack routes authenticate signatures; cron routes authenticate a bearer secret. All other application routes require a valid Supabase user.

Client components may use the browser Supabase client for session-aware UI. Authorization must not depend on client state.

## Admin Identity

`profiles.is_admin` is the application admin flag.

- Pages/actions use `requireAdmin()` before admin work.
- Database admin RPCs independently call `assert_admin()`.
- `get_all_user_emails()` performs its own admin assertion.
- Cron finalization permits `service_role` in addition to an admin.

Never trust an `is_admin`, user ID, team ID, role, or points value sent by a browser.

## RLS Summary

RLS is enabled on every public table.

- Profiles: caller’s own row or admin; users may update only their own profile.
- Seasons, tiers, activity definitions/rules, weeks, results, and ledger: authenticated read.
- Teams: active rows or admin; browser mutation is unavailable.
- Membership/streak rows: authenticated read for roster/standings composition; mutation is RPC-only.
- Submissions: active team members can read their team records; admins can read all; mutation is RPC-only.
- Edit requests and attachment metadata: owner or admin read; mutation is RPC-only.
- Job runs: admin read; service role writes cron status.

Application browser roles have no direct insert/update/delete grants for competition tables. Security-definer functions use `set search_path = ''`, schema-qualify objects, validate `auth.uid()`, and enforce membership/admin checks.

## Private Team Data

Public team views omit invite codes and member email. `active_team_rosters` exposes display-name snapshots only. `get_my_team_v2()` returns the invite code only for the caller’s current team. Admin pages that need private columns run server-side after `requireAdmin()`.

## Proof Images

The `submission-proofs` bucket is private with a 10 MiB maximum and an allow-list of JPEG, PNG, WebP, and GIF.

- Upload path must start with the caller’s auth UUID.
- Authenticated users can upload/select/delete only their own folder; admins can select/delete all.
- UI links use 15-minute signed URLs, never `/object/public/` URLs.
- Attachment metadata records the owning submission and cleanup status.

## Service Role

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must remain server-only. It is used for cron and restricted admin/export reads. Never expose it through a `NEXT_PUBLIC_` variable, response, log, client bundle, or browser-side import.

## Account Deletion

The auth soft-delete trigger closes active memberships, promotes a remaining member, archives an empty team, and removes the profile row. Historical submissions/memberships retain name snapshots while user foreign keys can become null.

## Security Review Checklist

- Does every new table enable RLS and receive explicit grants/policies?
- Does every security-definer function use a safe search path and internal authorization?
- Is a state-changing browser action routed through an RPC?
- Can user-provided IDs access another user’s object or team?
- Do file links use signed URLs and validate owner, type, and size?
- Do cron/integration routes fail closed when secrets are absent?
