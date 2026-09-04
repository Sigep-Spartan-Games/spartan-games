# Frontend

> **Purpose:** Document routes, components, styling, and UI patterns.
> **Audience:** Developers making UI changes, AI agents.
> **Source of truth:** `app/` directory, `components/` directory, `app/globals.css`, `tailwind.config.ts`.
> **Last reviewed:** 2026-09-04

## Route Table

| URL | Purpose | Auth | Admin | Primary File | Data Dependencies |
|-----|---------|:----:|:-----:|-------------|-------------------|
| `/` | Home — redirects to `/leaderboard` or `/auth/login` | Yes | No | `app/page.tsx` | `auth.getUser()` |
| `/leaderboard` | Current request-time team standings with tier filtering | Yes | No | `app/leaderboard/page.tsx` | `teams`, `profiles`, `tier_settings` |
| `/submit` | Activity submission form | Yes | No | `app/submit/page.tsx` | `game_settings`, `teams`, `activity_rules` |
| `/teams` | Team management (create/join/leave/rename) | Yes | No | `app/teams/page.tsx` | `teams`, `profiles`, `game_settings` |
| `/profile` | User's submissions and edit requests | Yes | No | `app/profile/page.tsx` | `submissions`, `submission_edit_requests`, `teams` |
| `/rules` | Static game-play explanation (not dynamic scoring values) | Yes | No | `app/rules/page.tsx` | None |
| `/protected` | Legacy authenticated account/session placeholder | Yes | No | `app/protected/page.tsx` | Supabase Auth claims |
| `/auth/login` | Email/password login | No | No | `app/auth/login/page.tsx` | — |
| `/auth/sign-up` | Account registration | No | No | `app/auth/sign-up/page.tsx` | — |
| `/auth/sign-up-success` | Registration success message | No | No | `app/auth/sign-up-success/page.tsx` | — |
| `/auth/forgot-password` | Password reset request | No | No | `app/auth/forgot-password/page.tsx` | — |
| `/auth/update-password` | Set new password | No | No | `app/auth/update-password/page.tsx` | — |
| `/auth/confirm` | Email verification callback | No | No | `app/auth/confirm/route.ts` | — |
| `/auth/error` | Auth error display | No | No | `app/auth/error/page.tsx` | — |
| `/admin` | Redirects to guarded `/admin/scoring` | Yes | Yes | `app/admin/page.tsx` | — |
| `/admin/scoring` | Activity rules editor | Yes | Yes | `app/admin/scoring/page.tsx` | `activity_rules` |
| `/admin/submissions` | Submission review/edit/delete | Yes | Yes | `app/admin/submissions/page.tsx` | `submissions`, `teams`, `activity_rules`, `submission_edit_requests` |
| `/admin/submissions/[id]` | Individual submission editor | Yes | Yes | `app/admin/submissions/[id]/page.tsx` | `submissions`, `teams`, `activity_rules` |
| `/admin/teams` | Team management and tier assignment | Yes | Yes | `app/admin/teams/page.tsx` | `teams`, `profiles` |
| `/admin/history` | Weekly finalization history | Yes | Yes | `app/admin/history/page.tsx` | `weekly_history`, `teams` |
| `/admin/announcements` | Send notices via Slack/Email | Yes | Page: No; action: Yes | `app/admin/announcements/page.tsx` | — |
| `/admin/settings` | Game controls, goals, export, reset | Yes | Yes | `app/admin/settings/page.tsx` | `game_settings`, `tier_settings`, `streak_settings` |
| `/admin/settings/export/spartan-games.xlsx` | Excel export download | Yes | Yes | Route handler | `submissions`, `teams` |
| `/admin/settings/export/submissions.csv` | CSV export download | Yes | Yes | Route handler | `submissions` |
| `/admin/settings/export/teams.csv` | CSV export download | Yes | Yes | Route handler | `teams` |

The shared admin layout is unguarded, but all current data-backed admin pages call `requireAdmin()`. The announcements client page is the exception; it renders for authenticated non-admins, while its action remains guarded.

## Layout Hierarchy

```
app/layout.tsx (Root)
├── ThemeProvider (next-themes)
├── AppShell
│   ├── DesktopHeader (hidden on mobile)
│   │   ├── Brand (logo + "Spartan Games")
│   │   ├── SpartanNavLinks (Leaderboard, Submit, Teams)
│   │   ├── AdminLink (conditional)
│   │   └── AuthButton (account menu or login)
│   ├── MobileHeader (hidden on desktop)
│   │   ├── Brand (compact)
│   │   ├── AdminLink (compact)
│   │   └── AuthButton
│   ├── {children} (page content with padding)
│   └── MobileNavigation (fixed bottom tab bar)
│       └── SpartanNavLinks (Leaderboard, Submit, Teams, Profile)
├── Toaster (sonner)

app/admin/layout.tsx (Admin sub-layout)
├── ShieldCheck icon + heading
├── AdminTabs (6 tab navigation)
└── {children}
```

## Navigation Structure

### Desktop (md+)
- Top header bar with logo, nav links, admin link, account menu
- Nav links: Leaderboard, Submit, Teams. Profile is available from the account menu

### Mobile (<md)
- Compact top header with logo, admin icon, account menu
- Fixed bottom tab bar: Leaderboard, Submit, Teams, Profile

### Admin
- Tabbed navigation within the admin layout: Activities, Submissions, Teams, History, Notices, Settings

## Component Organization

### Custom Components (`components/`)

| Component | Type | Purpose |
|-----------|------|---------|
| `account-menu.tsx` | Client | User dropdown menu (profile link, logout) |
| `admin-link.tsx` | Server | Conditionally renders admin navigation link |
| `app-shell.tsx` | Client | Hides the application shell on auth routes and sizes admin/non-admin content |
| `auth-button.tsx` | Server | Shows account menu or login link |
| `auth-refresh.tsx` | Unused | Entire implementation is commented out |
| `auth-shell.tsx` | Server | Centered card layout for auth pages |
| `competition-badges.tsx` | Server | TierBadge and StreakBadge components |
| `confirm-delete-button.tsx` | Client | Button with confirmation dialog for destructive actions |
| `env-var-warning.tsx` | Server | Shows a setup warning when public Supabase variables are absent |
| `forgot-password-form.tsx` | Client | Password reset request form |
| `hero.tsx` | Server | Hero section (appears unused/legacy) |
| `login-form.tsx` | Client | Email/password login form with useActionState |
| `logout-button.tsx` | Client | Sign out button |
| `pull-to-refresh.tsx` | Client | Mobile pull-to-refresh functionality |
| `rules-modal.tsx` | Client | Modal showing static game-play copy (not database scoring values) |
| `sign-up-form.tsx` | Client | Registration form |
| `spartan-nav-links.tsx` | Client | Path-aware navigation links for desktop/mobile |
| `submit-button.tsx` | Client | Form submit button with pending state |
| `theme-provider.tsx` | Client | next-themes ThemeProvider wrapper |
| `theme-switcher.tsx` | Client | Light/dark mode toggle |
| `time-duration-input.tsx` | Client | Hours/minutes duration picker |
| `update-password-form.tsx` | Client | New password entry form |
| `weekly-progress-bar.tsx` | Server | Progress bar toward weekly tier goal |

Legacy/template components `deploy-button.tsx`, `hero.tsx`, `next-logo.tsx`, and `supabase-logo.tsx` are not part of the primary application flow. `hero.tsx` references the logo components; `deploy-button.tsx` is imported but not rendered in the legacy `/protected` layout.

### UI Components (`components/ui/`)

shadcn/ui-based components:

| Component | Source |
|-----------|--------|
| `badge.tsx` | shadcn/ui |
| `button.tsx` | shadcn/ui (with `competition` variant added) |
| `card.tsx` | shadcn/ui |
| `checkbox.tsx` | shadcn/ui (Radix) |
| `combobox.tsx` | Custom searchable select |
| `dialog.tsx` | shadcn/ui (Radix-based) |
| `dropdown-menu.tsx` | shadcn/ui (Radix) |
| `empty-state.tsx` | Custom empty state display |
| `input.tsx` | shadcn/ui |
| `label.tsx` | shadcn/ui (Radix) |
| `page-header.tsx` | Custom page title + description + actions |
| `status-banner.tsx` | Custom alert banner (error, success, warning, info) |
| `textarea.tsx` | shadcn/ui |

## Styling System

### Design Tokens (`app/globals.css`)

HSL-based CSS custom properties with light and dark theme:

- **Primary:** Purple tones (274° hue)
- **Competition:** Red tones (347° hue)
- **Achievement:** Gold/amber tones (39° hue)
- **Success:** Green tones (153° hue)
- **Warning:** Same as achievement

### Custom CSS Classes

| Class | Purpose |
|-------|---------|
| `.sg-nav` | Frosted glass navigation bar |
| `.sg-nav-link` | Navigation link with hover/active states |
| `.app-surface` | Rounded bordered card |
| `.app-surface-elevated` | Card with shadow elevation |
| `.app-page-heading` | Large page title |
| `.app-section-heading` | Section heading |
| `.app-label` | Form label |
| `.app-helper` | Help text |
| `.app-number` | Tabular numeric display |
| `.safe-bottom` | Safe area padding for mobile |

### Fonts
- **Geist** — Primary sans-serif body font
- **Cinzel** — Decorative serif font for "Spartan Games" branding

### Responsive Design
- Mobile-first approach
- `md:` breakpoint (768px) separates mobile and desktop layouts
- Bottom tab bar on mobile, top nav bar on desktop
- Grid layouts adapt: `grid-cols-3 sm:grid-cols-6` for admin tabs

## Forms and Validation

- HTML `required` attributes for basic validation
- Server-side validation in all server actions
- Error display via `?error=` query parameter → `StatusBanner` component
- `SubmitButton` component shows loading state during form submission
- `useActionState` pattern used in login form
- Image compression happens client-side before upload
- Auth sign-up, reset, password update, and sign-out call the browser Supabase client directly; their validation is not implemented as server actions

## How to Add a Page

1. Create `app/your-page/page.tsx` (server component by default)
2. Add data fetching with `createClient()` from `lib/supabase/server.ts`
3. Use `unstable_noStore()` if the page should not be cached
4. Wrap in `Suspense` with a skeleton fallback
5. Add navigation link in `components/spartan-nav-links.tsx` if needed
6. If admin-only, call `requireAdmin()` inside the page's async data-loading boundary as well as in every mutation

## How to Add a Component

1. For UI primitives: add to `components/ui/` following shadcn/ui patterns
2. For feature components: add to `components/` root
3. Mark with `"use client"` if it uses hooks, event handlers, or browser APIs
4. Use `cn()` utility for conditional class merging
5. Use design tokens (CSS variables) for colors

## Change this document when…

- Routes are added or removed
- The navigation structure changes
- New reusable components are created
- The styling system changes
