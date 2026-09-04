# Security and Secrets

> **Purpose:** Document security posture, known risks, and secret management.
> **Audience:** Developers, security reviewers, future maintainers.
> **Source of truth:** Source code, `.gitignore`, `check_schema.js`.
> **Last reviewed:** 2026-09-03

> [!CAUTION]
> This document catalogs secrets and security issues found in the codebase. Do NOT copy actual secret values into this document or any tracked file.

## Committed Secrets

### `check_schema.js` — Hardcoded Credentials

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `check_schema.js` | 5 | Hardcoded Supabase URL and publishable key in plaintext | **Medium** |

**Details:** The file `check_schema.js` contains a hardcoded Supabase project URL and publishable API key. While publishable keys are designed to be public (they're embedded in client-side code), having them hardcoded in a utility script is poor practice and confirms the project's Supabase URL.

**Recommended remediation:**
1. Delete `check_schema.js` from the repository
2. If the script is needed, modify it to read from environment variables
3. Consider rotating the publishable key if the repository is public

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
| Password hashing | ✅ | Handled by Supabase Auth (bcrypt) |
| Email verification | ✅ | Required on sign-up |
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
| Admin UI visibility | ⚠️ | Admin pages render for any auth user; only actions are protected |

### Data

| Control | Status | Notes |
|---------|--------|-------|
| Input validation | ✅ | Server-side in all actions |
| SQL injection protection | ✅ | Supabase client uses parameterized queries |
| XSS protection | ✅ | React auto-escapes by default; dangerouslySetInnerHTML not used |
| File upload validation | ⚠️ | Client-side compression only; no server-side type checking |
| CORS | ✅ | Handled by Next.js and Vercel defaults |

### Infrastructure

| Control | Status | Notes |
|---------|--------|-------|
| HTTPS | ✅ | Enforced by Vercel |
| Environment separation | ⚠️ | No staging environment; dev uses production database |
| Secrets in env vars | ✅ | Correctly gitignored |
| Cron endpoint auth | ⚠️ | Auth skipped if `CRON_SECRET` not set |
| Monitoring | ❌ | No error tracking or security monitoring |

## Known Vulnerabilities

### 1. No Server-Side File Validation
**Severity:** Medium  
**File:** `app/submit/actions.ts`  
**Issue:** Uploaded proof images are compressed client-side but not validated server-side. A malicious user could bypass client compression and upload arbitrary files to the `submission-proofs` bucket.  
**Recommendation:** Add server-side MIME type checking before uploading to storage.

### 2. Admin UI Accessible to Non-Admins
**Severity:** Low  
**File:** `app/admin/layout.tsx`  
**Issue:** The admin layout renders for any authenticated user. While mutations are protected by `requireAdmin()`, the admin pages (including team data, submission details) are visible.  
**Recommendation:** Add `requireAdmin()` check in the admin layout.

### 3. Team Rename Without Membership Check
**Severity:** Low  
**File:** `app/teams/actions.ts` (`renameTeamAction`)  
**Issue:** The rename action doesn't verify the user is a member of the team. RLS policies may provide protection, but this is not confirmed.  
**Recommendation:** Add explicit membership check or confirm RLS policy.

### 4. Cron Endpoint Open Without Secret
**Severity:** Medium  
**File:** `app/api/cron/finalize-week/route.ts`  
**Issue:** If `CRON_SECRET` is not set, the cron endpoint is accessible without authentication. Anyone could trigger weekly finalization.  
**Recommendation:** Always require `CRON_SECRET` and fail closed if not configured.

### 5. Shared Development Database
**Severity:** Low  
**Issue:** No local Supabase setup exists. All developers share the production database. Development actions affect production data.  
**Recommendation:** Set up a local Supabase instance or create a separate development project.

### 6. No Rate Limiting
**Severity:** Medium  
**Issue:** No application-level rate limiting exists. Supabase has built-in rate limits, but submission forms, login attempts, and API endpoints are not rate-limited at the app level.  
**Recommendation:** Add rate limiting middleware for sensitive endpoints.

## PII Inventory

| Table | PII Fields | Notes |
|-------|-----------|-------|
| `auth.users` (Supabase-managed) | email, password hash | Managed by Supabase |
| `profiles` | first_name, last_name, email | User-entered |
| `teams` | member1_name, member2_name | Denormalized from profiles |
| `submissions` | submitted_by (UUID) | Links to auth user |
| `submission_edit_requests` | user_id (UUID), reason (free text) | May contain PII in reason |

## Change this document when…

- New secrets are introduced
- Security vulnerabilities are discovered or fixed
- RLS policies are modified
- Authentication mechanisms change
- A security audit is performed
