# Local Development

> **Purpose:** Fresh-machine setup and common commands.
> **Last reviewed:** 2026-09-09

## Prerequisites

- Node.js 20.9 or newer and npm
- Git
- Docker Desktop or another Supabase-supported container runtime for the local database
- Access to an appropriate Supabase project for linked commands

## Setup

```powershell
git clone <repository-url>
cd spartan-games
npm.cmd ci
Copy-Item .env.example .env.local  # if an example file is present
npm.cmd run dev
```

On macOS/Linux, use `npm`/`npx` without `.cmd` and create `.env.local` with the documented variable names.

Never point local mutation testing at production. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `npx supabase projects list` before testing writes.

## Application Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run lint` | ESLint source checks |
| `npm run typecheck` | TypeScript without emit |
| `npm run build` | Production build |
| `npm run start` | Start built app |

The build needs internet access for configured Google fonts.

## Supabase Commands

The CLI is a project dev dependency and `supabase/config.toml` targets Postgres 17.

| Command | Purpose |
|---|---|
| `npm run db:migrations` | Compare local/linked migration histories |
| `npm run db:lint` | Lint linked Postgres objects |
| `npm run db:verify` | Run read-only post-deploy invariants |
| `npm run db:types` | Regenerate `lib/database.types.ts` from linked schema |
| `npx supabase start` | Start local stack (requires Docker) |
| `npx supabase db reset` | Recreate local DB from all migrations/seed |
| `npx supabase stop` | Stop local stack |

`supabase/seed.sql` intentionally contains no production data. Add only deterministic, non-secret development seed data.

The reconstructed initial schema plus fetched canonical migrations can build a fresh database. Existing production requires the one-time baseline repair described in [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md); do not run the baseline SQL there.

## Development Workflow

1. Inspect `git status` and relevant AI docs.
2. Create an ordered migration for every schema/policy/function change.
3. Reset a local/disposable Supabase database and test the migration from scratch.
4. Update TypeScript reads/actions to use views/RPCs.
5. Run lint, typecheck, build, database lint, and invariants as applicable.
6. Update affected `ai-docs` in the same change.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Supabase start reports Docker unavailable | Start/install a supported container runtime |
| CLI cannot write telemetry/auth state on Windows | Run from a normal user shell with access to the Supabase config directory |
| New view/RPC returns “not found” | Matching migrations have not been applied to that database |
| Cron redirects to login | Ensure `proxy.ts` allows `/api/cron` and the deployed commit is current |
| Cron returns 503 | `CRON_SECRET` is missing |
| Public proof URL fails | Expected: bucket is private; request a signed URL |
| Generated types fail after migration | Run `npm run db:types`, then fix query contracts and typecheck |
