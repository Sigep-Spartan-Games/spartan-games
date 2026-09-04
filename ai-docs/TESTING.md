# Testing and Verification

> **Purpose:** Define the checks available today and the minimum verification expected for changes.
> **Last reviewed:** 2026-09-04

## Current State

There is no `test` script, test framework, CI workflow, or repeatable automated application test suite. `test_history.js`, `test-email-connection.js`, and `check_schema.js` are ad hoc diagnostic scripts; their names do not make them automated tests.

## Static Checks

Run from the repository root:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

As of the review date, TypeScript and the production build pass. Lint is not a green gate:

- `npm run lint` scans `.next` because the flat ESLint config does not ignore generated output, producing thousands of generated-code errors.
- Linting only `app`, `components`, `lib`, and config source still reports 49 errors and one warning (mostly explicit `any`, unused values/imports, and a CommonJS Tailwind plugin import).

Treat these as existing project debt. Do not claim a clean lint result until both the ignore configuration and source findings are addressed.

On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd` and `npx.cmd`.

The build needs network access to download Geist and Cinzel through `next/font/google`. It may also need configured environment variables or networked services depending on what pages evaluate. Never solve a build failure by embedding secrets in source.

## Manual Regression Matrix

Use a dedicated development environment and representative accounts:

| Area | Minimum Cases |
|------|---------------|
| Authentication | Sign-up/configured confirmation flow, good/bad login, sign-out, reset link, password update |
| Middleware | Signed-out protected route, signed-in auth route, static assets, manifest, Slack route, cron route |
| Teams | Create, invalid name/tier, join invalid/full team, existing-member behavior, captain tier change, non-captain attempt, rename authorization, leave as one/two members |
| Submission | Closed gate, no team, invalid/backdated date, each input type/unit, teammate multiplier, cap reached and cap overshoot, proof valid/invalid/large, upload failure |
| Streaks | First day, same day, consecutive day, missed day, backdated entry, maximum bonus, concurrent submissions |
| Profile/edit requests | Own history, synthetic streak rows, create request, forged submission/team IDs, approve/reject, status visibility |
| Admin | Non-admin access to every page and action, scoring CRUD, submission edit/delete, team changes, filters, settings validation |
| Leaderboard | Default tier, all tiers, ordering/ties, season total, missing tier, empty state, weekly goals |
| Exports | 401/403, escaping, empty data, all workbook sheets, dates/booleans, proof paths |
| Notifications | Test-mode routing, missing config, partial batch failure, HTML content, Slack signature/replay/user authorization |
| Finalization/reset | Only in disposable data: not-started/ended/already-running guards, history/winners/roll-up, idempotency, nested proof cleanup |

## High-Risk Database Verification

Submission points and weekly finalization depend on database code that is not checked in. Before approving changes in those areas, capture the live schema/function definitions through an authorized schema-only export and test these invariants in a non-production project:

- Submission insert/update/delete adjusts exactly one team's weekly total.
- An edit that moves teams removes/adds the correct points.
- A failed streak insert cannot leave unintended partial state.
- Finalization is atomic, idempotent, records all teams once, chooses ties as intended, and resets its request flag.
- RLS denies cross-user and non-admin reads/writes even when a client bypasses the UI.

## Diagnostic Script Safety

- `test_history.js` reads the configured hosted database and overwrites tracked `data.json`.
- `test-email-connection.js` sends an actual SMTP message to `EMAIL_TEST_RECIPIENT`.
- `check_schema.js` calls a hardcoded Supabase project and key instead of `.env.local`.

Do not run these casually, in CI, or against an unconfirmed environment. They should eventually be replaced with a test framework, fixtures, and disposable infrastructure.

## Recommended Test Investment

1. Add unit tests for activity-unit conversion, points, caps, week boundaries, and streak transitions after extracting pure functions.
2. Add integration tests for server authorization and RLS against a disposable Supabase instance/project.
3. Add browser tests for member and admin critical paths.
4. Add CI that runs lint, TypeScript, tests, and build with documented safe configuration.
