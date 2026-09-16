# External Services

> **Purpose:** Inventory of all external services and integration details.
> **Audience:** New maintainer, handoff recipient.
> **Source of truth:** Source code, `vercel.json`, `package.json`.
> **Last reviewed:** 2026-09-16

## Service Inventory

### 1. GitHub

| Item | Detail |
|------|--------|
| **Purpose** | Source control, CI/CD trigger |
| **Repository** | Git remote is `Sigep-Spartan-Games/spartan-games` |
| **Integration** | A Vercel Git integration is expected but cannot be confirmed from repository files |
| **Required env vars** | None in application code |
| **Auth method** | Git SSH or HTTPS credentials |
| **Transfer** | Transfer repository ownership or add new owner as admin |
| **Billing** | `Needs maintainer confirmation` |

### 2. Vercel

| Item | Detail |
|------|--------|
| **Purpose** | Hosting, serverless functions, cron jobs, preview deployments |
| **Integration** | Connected to GitHub repository |
| **Configuration** | `vercel.json` — cron schedule; `vercel-ignore-build.sh` — only builds `main` branch |
| **Required env vars** | Supabase public variables are core; service-role, SMTP, cron, and Slack variables are feature-dependent. See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) |
| **Cron jobs** | Daily: `0 6 * * *` → finalization retry; `30 6 * * *` → proof cleanup. Both require `CRON_SECRET` |
| **Domains** | `Needs maintainer confirmation` — likely `spartan-games.vercel.app` and possibly custom domain |
| **Transfer** | Transfer Vercel project/team ownership |
| **Billing** | `Needs maintainer confirmation` — likely Hobby (free) or Pro tier |
| **Failure impact** | Application completely unavailable |

### 3. Supabase

| Item | Detail |
|------|--------|
| **Purpose** | PostgreSQL database, authentication, file storage |
| **Project ref** | Read from the deployment's `NEXT_PUBLIC_SUPABASE_URL`; no project identifier is committed |
| **Integration** | `@supabase/ssr` and `@supabase/supabase-js` packages |
| **Required env vars** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Features used** | PostgreSQL, Auth (email/password), Storage (`submission-proofs` bucket), RLS, Database Functions, Triggers, RPCs |
| **Auth config** | `Needs maintainer confirmation` — Email confirmations, password reset redirects |
| **Storage** | The `submission-proofs` bucket is private; authenticated uploads are folder-scoped and UI reads use expiring signed URLs |
| **Transfer** | Transfer Supabase organization ownership |
| **Billing** | `Needs maintainer confirmation` — likely Free tier |
| **Failure impact** | All data access, authentication, and file storage fail |

### 4. SMTP Provider (Brevo Assumed)

| Item | Detail |
|------|--------|
| **Purpose** | Likely SMTP relay for sending emails; actual provider is environment configuration |
| **Integration** | Generic SMTP via Nodemailer in `lib/email.ts` (not a provider API) |
| **Required env vars** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`; `SMTP_PORT` and `SMTP_FROM` have defaults |
| **Templates** | No provider templates are used — HTML is inline in source code |
| **Sender identity** | `sigep.spartangames@gmail.com` (default `SMTP_FROM`) |
| **Limits** | Code comments assume a Brevo free-tier limit; confirm the active provider/account plan |
| **Transfer** | Transfer the active SMTP provider account access |
| **Billing** | `Needs maintainer confirmation` |
| **Failure impact** | Season state changes remain committed; the admin UI reports full, partial, skipped, test-mode, or failed provider acceptance and server logs retain the technical error |

SMTP acceptance means the provider accepted a recipient for processing; it does not prove inbox delivery or detect later bounces. True delivery/bounce reporting would require a provider webhook and is not currently implemented.

### 5. Slack

| Item | Detail |
|------|--------|
| **Purpose** | Announcement notifications, slash commands |
| **Integration** | Incoming webhooks (`lib/slack.ts`) and slash commands (`/api/slack/command`, `/api/slack/notify`) |
| **Required env vars** | `SLACK_WEBHOOK_URL`, `SLACK_SIGNING_SECRET`, `SLACK_ALLOWED_TEAM_ID`, `SLACK_ALLOWED_USER_IDS`; `SLACK_ALLOWED_CHANNEL_IDS` is optional |
| **Slash commands** | Handler accepts `/spartangamesbot` and `/spartan-games-notify`; actual Slack configuration requires confirmation |
| **Auth method** | Request signature plus workspace/user allow-lists and an optional channel allow-list |
| **Configuration outside repo** | Slack App configuration: slash command URLs, webhook URL, signing secret |
| **Transfer** | Transfer Slack workspace admin access, update Slack App ownership |
| **Billing** | `Needs maintainer confirmation` |
| **Failure impact** | Slack failure is reported independently; email delivery is still attempted when selected |

### 6. Sender Mailbox / Gmail (Conditional)

| Item | Detail |
|------|--------|
| **Purpose** | `SMTP_FROM` default sender address; Gmail is not necessarily the SMTP relay |
| **Integration** | Referenced as `sigep.spartangames@gmail.com` in `lib/email.ts` |
| **Note** | The README suggests `smtp.gmail.com` as SMTP host option, but code comments mention Brevo. The actual SMTP host depends on environment configuration |
| **Transfer** | Transfer Gmail account credentials if using Gmail SMTP directly |

## Services NOT Found

The following common services are **not used** in this repository:

- No analytics (Google Analytics, Vercel Analytics, PostHog, etc.)
- No error monitoring (Sentry, LogRocket, etc.)
- No CAPTCHA (reCAPTCHA, Turnstile, etc.)
- No maps or geolocation APIs
- No payment processing
- No CDN (beyond Vercel's built-in)
- No feature flags
- No logging service (only `console.log`)

## Webhooks / Callbacks

| Source | Target | URL | Purpose |
|--------|--------|-----|---------|
| Vercel Cron | App | `GET /api/cron/finalize-week` | Weekly finalization |
| Vercel Cron | App | `GET /api/cron/cleanup-proofs` | Private proof cleanup |
| Slack | App | `POST /api/slack/command` | Slash command handler |
| Slack | App | `POST /api/slack/notify` | Backward-compatible alias to the canonical command handler |
| Supabase Auth | App | `GET /auth/confirm` | Email verification callback |

`proxy.ts` permits `/api/cron/*` through the session layer; each cron route requires the Vercel bearer secret and fails closed when it is absent.

## Ownership Transfer Checklist

For each service:

1. ☐ Verify current owner has documented credentials
2. ☐ Add new owner as admin/collaborator
3. ☐ Transfer billing if applicable
4. ☐ Update any webhook URLs if domain changes
5. ☐ Rotate secrets/keys after transfer
6. ☐ Remove old owner after confirming access
7. ☐ Document new contact information

See [OWNERSHIP_HANDOFF.md](./OWNERSHIP_HANDOFF.md) for the complete transfer procedure.

## Change this document when…

- New external services are integrated
- Service providers change (e.g., switching from Brevo to SendGrid)
- Webhook URLs change
- Account ownership transfers
