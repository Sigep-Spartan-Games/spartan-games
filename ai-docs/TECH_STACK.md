# Tech Stack

> **Purpose:** Document all technologies used and explain how each is employed in the project.
> **Audience:** New developers, AI coding agents.
> **Source of truth:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `eslint.config.mjs`, `vercel.json`.
> **Last reviewed:** 2026-09-03

## Core Technologies

| Technology | Version | Role |
|-----------|---------|------|
| **TypeScript** | ^5 | Primary language for all application code |
| **Next.js** | latest (16.1.4 at time of review) | React framework with App Router, server components, server actions, middleware |
| **React** | ^19.0.0 | UI library; uses server components by default, client components where needed |
| **Node.js** | v18+ recommended | Runtime for server-side code and build |
| **npm** | Default package manager | Dependency management (`package-lock.json` present) |

## Framework Configuration

### Next.js (`next.config.ts`)
- Minimal configuration — nearly empty
- Uses App Router (directory-based routing under `app/`)
- `cacheComponents` is commented out
- Turbopack enabled for dev (Next.js 16 default)

### TypeScript (`tsconfig.json`)
- `strict: true`
- `module: "esnext"`, `moduleResolution: "bundler"`
- Path alias: `@/*` → `./*`
- Target: ES2017
- JSX: `react-jsx`

## Styling

| Technology | Version | Role |
|-----------|---------|------|
| **Tailwind CSS** | ^3.4.1 | Utility-first CSS framework |
| **tailwindcss-animate** | ^1.0.7 | Animation utilities plugin |
| **PostCSS** | ^8 | CSS processing |
| **Autoprefixer** | ^10.4.20 | CSS vendor prefixes |

### Design System
- Custom CSS variables defined in `app/globals.css` for light/dark themes
- HSL-based color system with semantic tokens: `primary`, `competition`, `achievement`, `success`, `warning`
- Custom `--radius` and `--control-radius` for consistent border radii
- Fonts: **Geist** (sans-serif body) and **Cinzel** (decorative headings) via `next/font/google`
- Dark mode: class-based (`darkMode: ["class"]`), managed by `next-themes` via `ThemeProvider`

## UI Components

| Technology | Version | Role |
|-----------|---------|------|
| **shadcn/ui** | N/A (generated) | Radix-based component library; components in `components/ui/` |
| **Radix UI** | Various ^1-^2 | Headless UI primitives (Checkbox, Dropdown Menu, Label, Slot) |
| **Lucide React** | ^0.511.0 | Icon library used throughout |
| **class-variance-authority** | ^0.7.1 | Component variant management (used by `Button`) |
| **clsx** | ^2.1.1 | Conditional class joining |
| **tailwind-merge** | ^3.3.0 | Intelligent Tailwind class merging |
| **next-themes** | ^0.4.6 | Theme switching (light/dark) |
| **sonner** | ^2.0.7 | Toast notifications |

The `components.json` file configures shadcn/ui generation paths and styles.

## Backend & Database

| Technology | Role |
|-----------|------|
| **Supabase** | PostgreSQL database, authentication, storage, Row Level Security |
| **@supabase/ssr** | latest — Server-side Supabase client for Next.js (cookies-based auth) |
| **@supabase/supabase-js** | latest — Core Supabase JavaScript client |

### Supabase Client Architecture
- **Browser client** (`lib/supabase/client.ts`): `createBrowserClient()` for client components
- **Server client** (`lib/supabase/server.ts`): `createServerClient()` with cookie handling for server components/actions
- **Admin client** (`lib/supabase/admin.ts`): `createClient()` with `SUPABASE_SERVICE_ROLE_KEY` for bypassing RLS
- **Proxy/Middleware client** (`lib/supabase/proxy.ts`): Session management in middleware

## Email

| Technology | Version | Role |
|-----------|---------|------|
| **Nodemailer** | ^8.0.1 | SMTP email sending |
| **@types/nodemailer** | ^7.0.9 | TypeScript types |

Email is NOT sent via Brevo's API — the README mentions Brevo but the code uses SMTP via Nodemailer. The comment in `lib/email.ts` mentions "Brevo free tier allows ~300 emails/day" suggesting Brevo is the SMTP relay provider.

## Image Processing

| Technology | Version | Role |
|-----------|---------|------|
| **browser-image-compression** | ^2.0.2 | Client-side image compression before upload (200KB max, 1280px max dimension) |

## Data Export

| Technology | Version | Role |
|-----------|---------|------|
| **exceljs** | ^4.4.0 | Server-side Excel (.xlsx) file generation |

## Deployment

| Technology | Role |
|-----------|------|
| **Vercel** | Hosting, serverless functions, cron jobs, preview deployments |
| **GitHub** | Source control, CI/CD trigger via Vercel integration |

### Vercel Configuration (`vercel.json`)
- Single cron job: `/api/cron/finalize-week` runs `0 6 * * 1` (every Monday at 6:00 AM UTC)

### Build Ignoring (`vercel-ignore-build.sh`)
- Only builds on the `main` branch; other branches skip deployment

## External Integrations

| Service | Integration |
|---------|------------|
| **Slack** | Incoming webhooks for announcements, slash commands (`/spartangamesbot`, `/spartan-games-notify`) |
| **Supabase Storage** | `submission-proofs` bucket for activity proof images |

## Code Quality

| Tool | Configuration |
|------|--------------|
| **ESLint** | `eslint.config.mjs` — extends `next/core-web-vitals` and `next/typescript` |
| **TypeScript** | `strict: true` in `tsconfig.json` |

### Notable Absences
- **No test framework** — No Jest, Vitest, Playwright, or Cypress configured
- **No CI pipeline** — No GitHub Actions workflows
- **No Prettier** — No explicit formatting configuration (may rely on editor settings)

## Additional Dependencies

| Package | Version | Role |
|---------|---------|------|
| **dotenv** | ^17.3.1 | Environment variable loading (used in standalone scripts like `test-email-connection.js`) |

## Change this document when…

- Dependencies are added or major versions are upgraded
- The email provider changes
- A test framework is introduced
- CI/CD configuration is added
