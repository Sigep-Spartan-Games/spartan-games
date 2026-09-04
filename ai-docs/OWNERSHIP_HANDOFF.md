# Ownership Handoff

> **Purpose:** Transfer the repository and external services without copying credentials into source control.
> **Last reviewed:** 2026-09-04

## Handoff Package

The outgoing maintainer should provide, through approved secure channels:

- Current owners/admins and billing contacts for GitHub, Vercel, Supabase, the SMTP provider/mailbox, and Slack.
- Confirmed production domain, Vercel project/team, Git production branch, ignored-build setting, runtime version, plan, and cron status.
- Supabase organization/project, environment purpose, auth redirect URLs/email confirmation settings, storage bucket policies, and a schema-only export containing all tables, RLS, functions, and triggers.
- Names and scopes of every environment variable in `ENVIRONMENT_VARIABLES.md` (never values in Markdown).
- Slack app/workspace, command URLs, permitted users, webhook/channel, and signing-secret owner.
- SMTP provider, verified sender/domain, limits, suppression/bounce handling, and test-mode procedure.
- Known incidents, pending migrations, manual dashboard changes, and rollback contacts.

## Transfer Sequence

1. Add the incoming maintainer to each service with least-privilege access.
2. Have them independently verify repository, deployment logs, environment-variable names, database dashboard, storage, Slack app, and SMTP sender access.
3. Capture a database backup and schema-only export before ownership or credential changes.
4. Transfer billing and primary ownership where the provider supports it.
5. Rotate service-role, cron, Slack, SMTP, Git, and provider credentials after access is confirmed.
6. Redeploy and test login, a safe read-only page, exports, test-mode email, Slack signature handling, and cron authentication.
7. Remove outgoing access only after the incoming owner confirms recovery and rollback paths.

## Required Verification

- No secret values appear in issues, chat transcripts, docs, logs, or commits.
- Production and development Supabase projects are clearly labeled.
- Supabase Auth redirect URLs match the active domains.
- Vercel cron reaches its handler and receives 401 for missing/bad bearer tokens.
- `EMAIL_TEST_MODE=true` routes all bulk mail to one controlled address before live delivery is enabled.
- Slack commands are limited to intended users, not only signed by Slack.
- Backups can be restored and the previous deployment can be promoted.

## Repository Gaps to Resolve During Handoff

- Baseline schema and critical database functions/triggers are not versioned.
- Vercel dashboard configuration and active domains are not provable from the repository.
- Active SMTP provider/account and Slack workspace ownership are not provable from the repository.
- Committed diagnostic artifacts contain database identifiers/output and should be reviewed under the organization's retention policy.

Record confirmations in the team's private operations system, not in this public/source-controlled checklist.
