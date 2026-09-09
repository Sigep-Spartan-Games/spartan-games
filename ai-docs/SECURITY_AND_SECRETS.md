# Security and Secrets

> **Purpose:** Secret handling, security controls, PII, and remaining risks.
> **Last reviewed:** 2026-09-09

## Secret Rules

- Secrets belong in `.env.local`, Vercel, Supabase, SMTP, or Slack settings—not tracked files.
- Only Supabase URL and publishable key may use `NEXT_PUBLIC_`.
- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, SMTP credentials, and Slack secrets are server-only.
- Never print tokens, authorization headers, raw env files, or service clients.
- Rotate a secret immediately if it appears in Git history, logs, screenshots, or client output.

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the catalog.

## Implemented Controls

- `proxy.ts` validates Supabase sessions for application pages.
- Cron routes bypass session redirection only so they can enforce `CRON_SECRET`; missing secret fails 503 and mismatch fails 401.
- Slack routes verify request signatures.
- Admin pages/actions use `requireAdmin`; admin RPCs independently call `assert_admin`.
- Competition tables use RLS and remove direct browser mutation grants.
- Security-definer functions use an empty search path and schema-qualified names.
- Team/member/submission RPCs derive ownership from `auth.uid()` and database relationships.
- Profile email is not used by public roster/leaderboard reads.
- Other-team invite codes are omitted from safe views; the caller retrieves its code via `get_my_team_v2`.
- Proof storage is private, caller-folder scoped, MIME/size restricted, and accessed by expiring signed URL.
- Historical objects archive/void instead of cascading deletion.

## Service Role

The service role bypasses RLS. It is limited to server modules, scheduled jobs, and guarded admin/export queries. A module importing `lib/supabase/admin.ts` must never be a Client Component or be re-exported through client code.

## PII

| Location | Data | Control |
|---|---|---|
| `auth.users` | email, credential metadata | Supabase-managed, service/admin only |
| `profiles` | name, email, admin flag | own/admin RLS |
| `team_memberships` | user UUID, display-name snapshot | authenticated roster read; no email |
| `submissions` | user UUID/name snapshot/activity | active team/admin read |
| edit requests | user UUID, reason text | owner/admin read |
| proof storage | user images | private bucket and signed URLs |

Treat committed diagnostic exports such as `data.json`, `dump.txt`, and logs as data artifacts. Review and remove them separately if they contain unnecessary production identifiers; this database change does not delete user files.

## Remaining Risks

1. Slack signature verification authenticates Slack, not the individual Slack user. Add an allow-list or application-admin mapping.
2. Announcement text is interpolated into email HTML. Escape plain text or sanitize a strict allow-list.
3. No application-level rate limiter protects login, submissions, Slack, or cron beyond provider controls.
4. Admin layout itself is not the primary authorization boundary; keep page/action/RPC checks and consider guarding the layout for defense in depth.
5. There is no automated dependency/security scanning workflow.

## Review Checklist

- New table: RLS, explicit grants/policies, indexes, retention rule.
- New RPC: caller/object authorization, safe search path, input bounds, concurrency behavior.
- New route: authentication independent of middleware assumptions, fail-closed missing config, safe errors.
- New upload: folder ownership, MIME/content validation, size limit, private delivery, cleanup retry.
- New integration: signature/token verification plus individual actor authorization where needed.
