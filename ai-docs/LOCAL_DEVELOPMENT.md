# Local Development

> **Purpose:** Fresh-machine setup guide.
> **Audience:** New developers.
> **Source of truth:** `package.json`, `README.md`, `.gitignore`, `tsconfig.json`.
> **Last reviewed:** 2026-09-03

## Prerequisites

- **Node.js** v18 or higher
- **npm** (included with Node.js)
- **Git**
- Access to the Supabase project dashboard
- A code editor (VS Code recommended)

## Installation

```bash
# Clone the repository
git clone https://github.com/Sigep-Spartan-Games/spartan-games.git
cd spartan-games

# Install dependencies
npm install
```

## Environment Configuration

Create a `.env.local` file in the project root. See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the complete catalog.

Minimum required for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For email testing:

```env
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=your-email@example.com
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## Starting the Application

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

Uses Next.js Turbopack for fast dev compilation.

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint |

## No Local Supabase

There is no local Supabase setup (`supabase/config.toml` does not exist). Development connects directly to the hosted Supabase project. All developers share the same database.

## Database Setup

The database schema is managed directly in the Supabase dashboard. SQL migrations in `supabase/migrations/` were created for reference but are run manually via the Supabase SQL Editor, not via the Supabase CLI.

For a fresh Supabase project, you would need to:
1. Create all tables (profiles, teams, submissions, activity_rules, game_settings, streak_settings) — `Needs maintainer confirmation` for exact DDL
2. Run all migration files in order
3. Create database functions (`finalize_week()`, `is_admin()`, `get_all_user_emails()`, triggers)
4. Configure RLS policies
5. Create the `submission-proofs` storage bucket with public read access

## Seed Data

No seed files exist. The `data.json` file appears to be a data dump for debugging, not a seed file.

To seed activity rules, run the migration `20260223203604_add_streak_bonus_activity.sql` for the streak bonus rule. Other activity rules are created via the admin UI.

## How to Confirm the Environment Works

1. Run `npm run dev`
2. Navigate to `http://localhost:3000` → should redirect to `/auth/login`
3. Log in with an existing account or create one
4. Navigate to `/leaderboard` → should show team standings
5. If you have admin access, navigate to `/admin/scoring` → should show activity rules

## Common Setup Failures

| Problem | Cause | Fix |
|---------|-------|-----|
| "Missing Supabase environment variables" banner | `.env.local` not configured | Create `.env.local` with Supabase credentials |
| "Invalid API key" errors | Wrong Supabase key | Verify key from Supabase Dashboard → Settings → API |
| Redirect loop on login | Session cookie issues | Clear cookies, restart dev server |
| Email not sending | SMTP credentials wrong or missing | Check SMTP_HOST, SMTP_USER, SMTP_PASS; enable `EMAIL_TEST_MODE` |
| `Module not found` errors | Dependencies not installed | Run `npm install` |
| TypeScript errors | Strict mode violations | Run `npx tsc --noEmit` to see all errors |

## Platform Notes

- Development has been done on Windows; the `vercel-ignore-build.sh` uses bash (runs on Vercel's Linux, not locally)
- No platform-specific issues identified for macOS or Linux

## Change this document when…

- Node.js version requirements change
- New required environment variables are added
- Local Supabase setup is introduced
- Build tooling changes
