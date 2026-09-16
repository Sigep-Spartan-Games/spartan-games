# Environment Variables

> **Purpose:** Complete catalog of every environment variable used in the application.
> **Audience:** Developers setting up the project, deployment engineers, AI agents.
> **Source of truth:** All `process.env` references in source code, `.gitignore`, `README.md`.
> **Last reviewed:** 2026-09-15

> [!CAUTION]
> Never commit actual secret values to this file or any file tracked by Git. Store all secrets in a password manager or the Vercel/Supabase dashboard.

## Variable Catalog

### Supabase

| Variable | Required | Public | Purpose | Format | Where to Get | Used In |
|----------|----------|--------|---------|--------|--------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes (client) | Supabase project URL | `https://<project-ref>.supabase.co` | Supabase Dashboard → Settings → API | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `lib/supabase/admin.ts`, `app/profile/page.tsx`, `app/admin/submissions/page.tsx` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes (client) | Supabase anon/publishable key | `sb_publishable_...` or `eyJ...` JWT | Supabase Dashboard → Settings → API | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (production) | No | Service role key (bypasses RLS) | Secret key/JWT supplied by Supabase | Supabase Dashboard → Settings → API | `lib/supabase/admin.ts`, cron jobs, Slack routes, guarded admin exports |

### Email (SMTP)

| Variable | Required | Public | Purpose | Format | Where to Get | Used In |
|----------|----------|--------|---------|--------|--------------|---------|
| `SMTP_HOST` | Yes (for email) | No | SMTP server hostname | `smtp-relay.brevo.com` or `smtp.gmail.com` | Email provider dashboard | `lib/email.ts` |
| `SMTP_PORT` | No | No | SMTP port (default: 587) | `587` | Email provider dashboard | `lib/email.ts` |
| `SMTP_USER` | Yes (for email) | No | SMTP username | Email address or API login | Email provider dashboard | `lib/email.ts` |
| `SMTP_PASS` | Yes (for email) | No | SMTP password or API key | String | Email provider dashboard | `lib/email.ts` |
| `SMTP_FROM` | No | No | Sender email address | `sigep.spartangames@gmail.com` (default) | — | `lib/email.ts` |
| `EMAIL_TEST_MODE` | No | No | Divert all emails to test recipient | `"true"` or `"false"` | Manual | `lib/email.ts` |
| `EMAIL_TEST_RECIPIENT` | No | No | Recipient when test mode is on | Email address | Manual | `lib/email.ts` |

### Application

| Variable | Required | Public | Purpose | Format | Where to Get | Used In |
|----------|----------|--------|---------|--------|--------------|---------|
| `NEXT_PUBLIC_SITE_URL` | No | Yes (client) | Site URL for email links | `https://spartan-games.vercel.app` | Known | `app/admin/settings/actions.ts` |
| `VERCEL_URL` | No | No (auto) | Auto-set by Vercel deployment | `spartan-games-xxx.vercel.app` | Auto-injected by Vercel | `app/layout.tsx` |
| `NODE_ENV` | Framework-managed | No | Next.js runtime mode | `development`, `production`, or `test` | Set by Next.js/runtime | Next.js |

### Security

| Variable | Required | Public | Purpose | Format | Where to Get | Used In |
|----------|----------|--------|---------|--------|--------------|---------|
| `CRON_SECRET` | Yes (production) | No | Authenticates cron job requests | Random string | Generate manually | `app/api/cron/finalize-week/route.ts`, `app/api/cron/cleanup-proofs/route.ts` |

### Slack

| Variable | Required | Public | Purpose | Format | Where to Get | Used In |
|----------|----------|--------|---------|--------|--------------|---------|
| `SLACK_WEBHOOK_URL` | No | No | Slack incoming webhook URL | `https://hooks.slack.com/services/...` | Slack App → Incoming Webhooks | `lib/slack.ts` |
| `SLACK_SIGNING_SECRET` | Yes for Slack commands | No | Verifies requests came from Slack; commands fail closed without it | Opaque signing-secret string | Slack App → Basic Information → Signing Secret | `lib/slack.ts`, `lib/slack-command.ts` |
| `SLACK_ALLOWED_TEAM_ID` | Yes for Slack commands | No | Restricts commands to one Slack workspace | Slack team ID such as `T01234567` | Slack workspace settings | `lib/slack.ts` |
| `SLACK_ALLOWED_USER_IDS` | Yes for Slack commands | No | Comma-separated Slack users allowed to broadcast | `U01234567,U07654321` | Slack member profiles | `lib/slack.ts` |
| `SLACK_ALLOWED_CHANNEL_IDS` | No | No | Optional comma-separated channel restriction | `C01234567,C07654321` | Slack channel details | `lib/slack.ts` |

## Effect When Missing

| Variable | Effect When Missing |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Application shows "env var warning" banner; all DB operations fail |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-client features fail, including cron finalization and Slack-command broadcasts; normal user flows may still work |
| `SMTP_HOST` | Email sending silently fails or throws |
| `SMTP_USER` / `SMTP_PASS` | Email authentication fails |
| `CRON_SECRET` | Cron endpoints fail closed with HTTP 503; scheduled maintenance does not run |
| `SLACK_WEBHOOK_URL` | Requested Slack delivery fails and is reported separately from email delivery |
| `SLACK_SIGNING_SECRET` | Slack command endpoint fails closed with HTTP 503 |
| `SLACK_ALLOWED_TEAM_ID` / `SLACK_ALLOWED_USER_IDS` | Slack commands are rejected; no announcement is sent |
| `SLACK_ALLOWED_CHANNEL_IDS` | No channel restriction is applied |
| `NEXT_PUBLIC_SITE_URL` | Email links fall back to `https://spartan-games.vercel.app` |
| `EMAIL_TEST_MODE=true` without `EMAIL_TEST_RECIPIENT` | Email delivery fails closed; lifecycle actions remain committed and the admin UI reports the configuration failure |

## `.env.local` Template

```env
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# === Application ===
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# === Email (SMTP) ===
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=sigep.spartangames@gmail.com

# === Email Testing ===
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=your-test-email@example.com

# === Cron Security ===
CRON_SECRET=your-random-cron-secret

# === Slack (optional) ===
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_ALLOWED_TEAM_ID=T01234567
SLACK_ALLOWED_USER_IDS=U01234567,U07654321
# SLACK_ALLOWED_CHANNEL_IDS=C01234567
```

## Variables Not in `.env.local` But Referenced in Code

The repository does not include a `.env.example` file. The `.env.local` file exists but is gitignored. The variables above were discovered by searching all `process.env` references.

`NODE_ENV` is intentionally omitted from the template because Next.js manages it.

## Variables Defined in README But Not in Code

- None identified — all README variables are used in code.

## Change this document when…

- New environment variables are added to the code
- An external service integration changes
- The email provider changes
