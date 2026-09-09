# AI Documentation Guide

> **Purpose:** Entry point and trust model for developers and AI agents working on Spartan Games.
> **Last reviewed:** 2026-09-09

## Start Here

Read this file first, then choose the smallest relevant set below. The implementation remains the source of truth. If a document disagrees with code or a checked-in migration, update the document in the same change.

| Task | Read First | Then Inspect |
|------|------------|--------------|
| Understand the product | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md), [BUSINESS_RULES.md](./BUSINESS_RULES.md) | User-facing pages and actions |
| Add or fix a feature | [CHANGE_GUIDE.md](./CHANGE_GUIDE.md), [ARCHITECTURE.md](./ARCHITECTURE.md) | Feature page, client component, action, queries, migrations |
| Change scoring, streaks, teams, or finalization | [BUSINESS_RULES.md](./BUSINESS_RULES.md), [DATA_MODEL.md](./DATA_MODEL.md) | Submit/admin actions and database functions/triggers |
| Change authentication or permissions | [AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md), [SECURITY_AND_SECRETS.md](./SECURITY_AND_SECRETS.md) | Middleware, page guards, actions, and RLS |
| Change UI or navigation | [FRONTEND.md](./FRONTEND.md) | `app/layout.tsx`, route page, and components |
| Change an API or integration | [BACKEND_AND_APIS.md](./BACKEND_AND_APIS.md), [EXTERNAL_SERVICES.md](./EXTERNAL_SERVICES.md) | Route/action and service module |
| Set up locally | [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md), [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | `package.json` and local environment |
| Verify a change | [TESTING.md](./TESTING.md) | Changed code paths and a safe database target |
| Operate/migrate the database | [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md), [DATA_MODEL.md](./DATA_MODEL.md) | CLI config, migrations, tests, linked project |
| Deploy or transfer ownership | [DEPLOYMENT.md](./DEPLOYMENT.md), [OWNERSHIP_HANDOFF.md](./OWNERSHIP_HANDOFF.md) | Vercel and provider dashboards |

## Evidence and Confidence

Use this priority order when claims conflict:

1. Checked-in migrations for database objects they actually define.
2. Current application code for application behavior.
3. `package-lock.json` and installed package metadata for resolved versions and runtime requirements.
4. These documents and the root `README.md`.
5. Comments, committed diagnostic output, and assumptions about provider dashboards.

The repository now contains a reconstructed initial schema, the canonical remote migration history, normalized model/workflow/security migrations, Supabase CLI config, and database invariants. The linked production database remains the authority for deployment state; compare migration history before every push.

## Current Operational Caveats

- The September 2026 normalized migrations and matching app must be released together; follow the maintenance-window runbook.
- The reconstructed baseline must be marked applied, never executed, on the existing production database.
- A local full replay requires Docker; forced-rollback validation against production does not replace a disposable-environment replay.
- Browser E2E coverage is still a future requirement before compatibility columns are removed.

## Documentation Maintenance

Every feature change should update the relevant documents in the same commit:

- Routes/components: `FRONTEND.md`
- Actions/endpoints/services: `BACKEND_AND_APIS.md`
- Tables/RLS/functions/storage: `DATA_MODEL.md`
- Domain behavior: `BUSINESS_RULES.md`
- Auth/security: `AUTHENTICATION_AND_AUTHORIZATION.md`, `SECURITY_AND_SECRETS.md`
- Variables/providers/deployment: `ENVIRONMENT_VARIABLES.md`, `EXTERNAL_SERVICES.md`, `DEPLOYMENT.md`
- Setup or checks: `LOCAL_DEVELOPMENT.md`, `TESTING.md`

Set `Last reviewed` to the date the claims were checked against code. Do not copy secret values, production data, or undocumented dashboard assumptions into Markdown.
