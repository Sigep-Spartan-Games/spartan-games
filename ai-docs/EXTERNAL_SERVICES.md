# External Services

> **Purpose:** Inventory of all external services and integration details.
> **Audience:** New maintainer, handoff recipient.
> **Source of truth:** Source code, `vercel.json`, `package.json`.
> **Last reviewed:** 2026-09-03

## Service Inventory

### 1. GitHub

| Item | Detail |
|------|--------|
| **Purpose** | Source control, CI/CD trigger |
| **Repository** | `Needs maintainer confirmation` — likely `Sigep-Spartan-Games/spartan-games` based on workspace config |
| **Integration** | Vercel GitHub integration auto-deploys on push |
| **Required env vars** | None in application code |
| **Auth method** | Git SSH or HTTPS credentials |
| **Transfer** | Transfer repository ownership or add new owner as admin |
| **Billing** | Free tier (GitHub) |

### 2. Vercel

| Item | Detail |
|------|--------|
| **Purpose** | Hosting, serverless functions, cron jobs, preview deployments |
| **Integration** | Connected to GitHub repository |
| **Configuration** | `vercel.json` — cron schedule; `vercel-ignore-build.sh` — only builds `main` branch |
| **Required env vars** | All from [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) must be set in Vercel project settings |
| **Cron jobs** | `0 6 * * 1` → `GET /api/cron/finalize-week` with `CRON_SECRET` |
| **Domains** | `Needs maintainer confirmation` — likely `spartan-games.vercel.app` and possibly custom domain |
| **Transfer** | Transfer Vercel project/team ownership |
| **Billing** | `Needs maintainer confirmation` — likely Hobby (free) or Pro tier |
| **Failure impact** | Application completely unavailable |

### 3. Supabase

| Item | Detail |
|------|--------|
| **Purpose** | PostgreSQL database, authentication, file storage |
| **Project ref** | `Needs maintainer confirmation` — `check_schema.js` references a URL suggesting a specific project |
| **Integration** | `@supabase/ssr` and `@supabase/supabase-js` packages |
| **Required env vars** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Features used** | PostgreSQL, Auth (email/password), Storage (`submission-proofs` bucket), RLS, Database Functions, Triggers, RPCs |
| **Auth config** | `Needs maintainer confirmation` — Email confirmations, password reset redirects |
| **Storage** | `submission-proofs` bucket with public read access |
| **Transfer** | Transfer Supabase organization ownership |
| **Billing** | `Needs maintainer confirmation` — likely Free tier |
| **Failure impact** | All data access, authentication, and file storage fail |

### 4. Brevo (Sendinblue)

| Item | Detail |
|------|--------|
| **Purpose** | SMTP relay for sending emails |
| **Integration** | SMTP via Nodemailer in `lib/email.ts` (NOT Brevo API) |
| **Required env vars** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| **Templates** | No Brevo templates used — HTML is inline in source code |
| **Sender identity** | `sigep.spartangames@gmail.com` (default `SMTP_FROM`) |
| **Limits** | ~300 emails/day on free tier (mentioned in code comment) |
| **Transfer** | Transfer Brevo account access |
| **Billing** | `Needs maintainer confirmation` — likely Free tier |
| **Failure impact** | No email notifications sent; non-blocking (errors are caught) |

### 5. Slack

| Item | Detail |
|------|--------|
| **Purpose** | Announcement notifications, slash commands |
| **Integration** | Incoming webhooks (`lib/slack.ts`) and slash commands (`/api/slack/command`, `/api/slack/notify`) |
| **Required env vars** | `SLACK_WEBHOOK_URL`, `SLACK_SIGNING_SECRET` |
| **Slash commands** | `/spartangamesbot` and `/spartan-games-notify` |
| **Auth method** | Webhook URL + request signature verification |
| **Configuration outside repo** | Slack App configuration: slash command URLs, webhook URL, signing secret |
| **Transfer** | Transfer Slack workspace admin access, update Slack App ownership |
| **Billing** | Free (Slack workspace) |
| **Failure impact** | No Slack notifications; non-blocking (errors are logged) |

### 6. Gmail

| Item | Detail |
|------|--------|
| **Purpose** | `SMTP_FROM` default sender address |
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
| Slack | App | `POST /api/slack/command` | Slash command handler |
| Slack | App | `POST /api/slack/notify` | Slash command handler (duplicate) |
| Supabase Auth | App | `GET /auth/confirm` | Email verification callback |

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
