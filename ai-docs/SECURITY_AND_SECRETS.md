# Security and Secrets

> **Purpose:** Document security posture, known risks, and secret management.
> **Audience:** Developers, security reviewers, future maintainers.
> **Source of truth:** Source code, `.gitignore`, `check_schema.js`.
> **Last reviewed:** 2026-09-04

> [!CAUTION]
> This document catalogs secrets and security issues found in the codebase. Do NOT copy actual secret values into this document or any tracked file.

## Committed Secrets

### `check_schema.js` — Hardcoded Public Project Configuration

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `check_schema.js` | 5 | Hardcoded Supabase URL and publishable key in plaintext | **Low** |

**Details:** The file contains a Supabase project URL and publishable key. These values are intentionally public client configuration, not service-role credentials, but hardcoding them creates configuration drift and discloses which project the script targets.

**Recommended remediation:**
1. Delete `check_schema.js` from the repository
2. If the script is needed, modify it to read from environment variables
3. Confirm no service-role key or private credential was ever committed; rotate only if provider policy or incident response requires it

### Development Artifacts

| File | Issue | Severity |
|------|-------|----------|
| `data.json` | Contains production weekly_history data with team_ids and UUIDs | **Low** |
| `dump.txt` | Development dump file — content unclear | **Low** |
| `out.txt` | Development output — content unclear | **Low** |
| `tsc_output.txt` | TypeScript compiler output | **Low** |
| `dev_log.txt` | Development log | **Low** |

**Recommended remediation:**
1. Delete these files from the repository
2. Add them to `.gitignore`
3. Use `git filter-branch` or BFG Repo Cleaner if they contained sensitive data

## Secret Management

### Where Secrets Live

| Secret | Location | How to Access |
|--------|----------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars, `.env.local` | Supabase Dashboard → Settings → API |
| `SMTP_PASS` | Vercel env vars, `.env.local` | Brevo Dashboard → SMTP & API |
| `CRON_SECRET` | Vercel env vars, `.env.local` | Generated manually |
| `SLACK_SIGNING_SECRET` | Vercel env vars, `.env.local` | Slack App Dashboard → Basic Information |
| `SLACK_WEBHOOK_URL` | Vercel env vars, `.env.local` | Slack App Dashboard → Incoming Webhooks |

### Git Ignore Protection

`.gitignore` correctly excludes:
- `.env*.local`
- `.env`

### No Secret Rotation Process

There is no documented process for rotating secrets. To rotate:
1. Generate new credentials in the respective service dashboard
2. Update in Vercel project settings
3. Update in local `.env.local`
4. Redeploy

## Security Controls

### Authentication

| Control | Status | Notes |
|---------|--------|-------|
| Password hashing | ✅ | Handled by Supabase Auth; algorithm/configuration is external |
| Email verification | ⚠️ | Callback flow exists, but the confirmation requirement is dashboard configuration |
| Password reset | ✅ | Via email link |
| Session management | ✅ | JWT via cookies, refreshed in middleware |
| CSRF protection | ✅ | Server Actions use POST with cookie verification |
| Rate limiting | ⚠️ | Depends on Supabase Auth rate limits; no app-level rate limiting |

### Authorization

| Control | Status | Notes |
|---------|--------|-------|
| Route protection | ✅ | Middleware checks auth on all non-public routes |
| Admin action guards | ✅ | `requireAdmin()` on all admin mutations |
| RLS (Row Level Security) | ⚠️ | Enabled on some tables; configuration partially undocumented |
| Admin UI visibility | ⚠️ | Most pages are guarded; announcements page and shared layout are not |

### Data

| Control | Status | Notes |
|---------|--------|-------|
| Input validation | ✅ | Server-side in all actions |
| SQL injection protection | ✅ | Supabase client uses parameterized queries |
| XSS protection | ✅ | React auto-escapes by default; dangerouslySetInnerHTML not used |
| File upload validation | ⚠️ | Server checks browser MIME prefix only; no size, signature, or extension validation |
| CORS | ⚠️ | No explicit policy; Slack/cron routes are intended for server-to-server requests |

### Infrastructure

| Control | Status | Notes |
|---------|--------|-------|
| HTTPS | ✅ | Enforced by Vercel |
| Environment separation | ⚠️ | No environment topology is versioned; local development uses whichever hosted project is in `.env.local` |
| Secrets in env vars | ✅ | Correctly gitignored |
| Cron endpoint auth | ⚠️ | Auth skipped if `CRON_SECRET` not set |
| Monitoring | ❌ | No error tracking or security monitoring |

## Known Vulnerabilities

### 1. Weak Server-Side File Validation
**Severity:** Medium  
**File:** `app/submit/actions.ts`  
**Issue:** The action checks only `File.type.startsWith("image/")`. A caller can bypass client compression; there is no server-side size limit, signature inspection, or extension allowlist.
**Recommendation:** Enforce size and supported MIME types server-side, inspect file signatures, generate the extension from validated content, and configure bucket policies.

### 2. Announcements UI Accessible to Non-Admins
**Severity:** Low  
**File:** `app/admin/layout.tsx`  
**Issue:** The shared layout and `/admin/announcements` page render for any authenticated user. Other current admin data pages call `requireAdmin()`, and the announcement action is guarded.
**Recommendation:** Guard the admin layout (or at minimum the announcements page) for defense in depth.

### 3. Team Rename Without Membership Check
**Severity:** Low  
**File:** `app/teams/actions.ts` (`renameTeamAction`)  
**Issue:** The rename action doesn't verify the user is a member of the team. RLS policies may provide protection, but this is not confirmed.  
**Recommendation:** Add explicit membership check or confirm RLS policy.

### 4. Cron Endpoint Open Without Secret
**Severity:** Medium  
**File:** `app/api/cron/finalize-week/route.ts`  
**Issue:** If `CRON_SECRET` is not set, the handler accepts any request that reaches it. Current middleware still requires a Supabase session, so this is fail-open to authenticated application users rather than reliably public; bearer-only Vercel cron calls have the opposite problem and appear blocked.
**Recommendation:** Always require `CRON_SECRET` and fail closed if not configured.

### 5. Hosted Development Database
**Severity:** Low  
**Issue:** No local Supabase configuration exists. The application connects to whichever hosted project a developer places in `.env.local`; the repository does not identify whether that target is development, staging, or production.
**Recommendation:** Verify the project ref before mutations and establish a dedicated development project or local Supabase setup.

### 6. No Rate Limiting
**Severity:** Medium  
**Issue:** No application-level rate limiting exists. Supabase has built-in rate limits, but submission forms, login attempts, and API endpoints are not rate-limited at the app level.  
**Recommendation:** Add rate limiting middleware for sensitive endpoints.

### 7. Edit-Request Object Ownership Is Not Verified
**Severity:** Medium
**File:** `app/profile/actions.ts`, `supabase/migrations/add_submission_edit_requests.sql`
**Issue:** The action accepts submission/team IDs from the client. The checked-in insert policy verifies only that `user_id` is the caller; it does not prove ownership of the referenced submission or team.
**Recommendation:** Fetch the submission server-side and verify `submitted_by`/team membership, and enforce the same relationship in RLS.

### 8. Slack Commands Do Not Authorize the Slack User
**Severity:** Medium
**File:** `app/api/slack/command/route.ts`, `app/api/slack/notify/route.ts`
**Issue:** Signature verification authenticates Slack as the sender, but any workspace user able to invoke the configured command can trigger Slack and bulk-email announcements.
**Recommendation:** Allowlist Slack user IDs or map them to application admins before broadcasting.

### 9. Cron Authentication Layers Conflict
**Severity:** High (availability)
**File:** `lib/supabase/proxy.ts`, `app/api/cron/finalize-week/route.ts`
**Issue:** Middleware requires a Supabase user session for the cron path, while Vercel cron authenticates with a bearer token. The handler also fails open if `CRON_SECRET` is absent.
**Recommendation:** Exempt only the exact cron path from session middleware and make the handler fail closed on a missing or invalid secret.

### 10. Announcement Email HTML Is Not Escaped
**Severity:** Medium
**File:** `app/admin/announcements/actions.ts`
**Issue:** Announcement text is interpolated directly into HTML after newline replacement. Combined with missing Slack-user authorization, a Slack command caller can inject arbitrary email markup.
**Recommendation:** Escape plain text before converting newlines, or sanitize against a strict HTML allowlist.

## PII Inventory

| Table | PII Fields | Notes |
|-------|-----------|-------|
| `auth.users` (Supabase-managed) | email, password hash | Managed by Supabase |
| `profiles` | first_name, last_name, email | User-entered |
| `teams` | member1_name, member2_name | Denormalized from profiles |
| `submissions` | submitted_by (UUID) | Links to auth user |
| `submission_edit_requests` | user_id (UUID), reason (free text) | May contain PII in reason |
| Storage proofs | User-uploaded images | Public URLs are constructed; images can contain sensitive personal/location information |

## Change this document when…

- New secrets are introduced
- Security vulnerabilities are discovered or fixed
- RLS policies are modified
- Authentication mechanisms change
- A security audit is performed
