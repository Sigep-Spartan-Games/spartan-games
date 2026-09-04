# Authentication and Authorization

> **Purpose:** Document all authentication and authorization mechanisms in the application.
> **Audience:** Developers, AI agents, security reviewers.
> **Source of truth:** `middleware.ts`, `lib/supabase/proxy.ts`, `lib/admin.ts`, `lib/is-admin.ts`, all `actions.ts` files.
> **Last reviewed:** 2026-09-03

## Authentication Provider

**Supabase Auth** with email/password strategy. No OAuth providers are configured.

## Session Lifecycle

1. **Sign-up:** Client-side `supabase.auth.signUp()` in `components/sign-up-form.tsx` → Supabase sends verification email → User confirms via `/auth/confirm` route → OTP verified → Session created
2. **Login:** Server action `loginAction()` in `app/auth/login/actions.ts` → `supabase.auth.signInWithPassword()` → Session cookie set → Redirect to `/leaderboard`
3. **Session refresh:** Middleware (`lib/supabase/proxy.ts`) calls `supabase.auth.getUser()` on every request, which validates and refreshes the JWT
4. **Sign-out:** `LogoutButton` component calls `supabase.auth.signOut()` → Cookie cleared → Redirect to `/auth/login`
5. **Password reset:** Client-side `supabase.auth.resetPasswordForEmail()` → Email with link to `/auth/update-password` → `supabase.auth.updateUser({ password })`

## Middleware Behavior (`middleware.ts` → `lib/supabase/proxy.ts`)

Every request (except static files and images) passes through the middleware:

1. Creates a Supabase server client with cookie handling
2. Calls `supabase.auth.getUser()` to validate the session
3. Checks if the route is public or requires authentication
4. Redirects unauthenticated users to `/auth/login`
5. Redirects authenticated users away from login/signup to `/leaderboard`

### Public Routes (no auth required)

| Route | Purpose |
|-------|---------|
| `/auth/login` | Login page |
| `/auth/sign-up` | Registration page |
| `/auth/sign-up-success` | Post-registration confirmation |
| `/auth/forgot-password` | Password reset request |
| `/auth/update-password` | Password update form |
| `/auth/confirm` | Email verification callback |
| `/auth/error` | Auth error display |
| `/api/slack/command` | Slack slash command endpoint |
| `/api/slack/notify` | Slack notification endpoint |

### Excluded from Middleware (via matcher pattern)

- `/_next/static/*` — Static files
- `/_next/image/*` — Image optimization
- `/favicon.ico`
- All image files (`.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`)

## Admin Authorization

### How Admin Status is Determined

Admin status is a `is_admin` boolean column in the `profiles` table. There is no admin creation UI — it must be set directly in the Supabase database.

### `requireAdmin()` — `lib/admin.ts`

Server-side function used in most admin server actions:

```typescript
export async function requireAdmin(redirectTo = "/admin") {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!user) redirect(`${redirectTo}?error=not_authenticated`);
  
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  
  if (!profile?.is_admin) redirect(`${redirectTo}?error=not_admin`);
  return { supabase, user };
}
```

### `isAdmin()` — `lib/is-admin.ts`

Returns `boolean` without redirecting. Used for conditional UI rendering (showing/hiding admin link in navigation).

### Duplicate Admin Check — `app/admin/scoring/actions.ts`

The scoring actions file has its own inline `requireAdmin()` function (lines 29-46) that duplicates the logic from `lib/admin.ts`. This is technical debt.

## Authorization Matrix

| Route / Action | Auth Required | Admin Required | Additional Checks |
|----------------|:---:|:---:|---|
| `/auth/*` | No | No | Logged-in users redirected to `/leaderboard` |
| `/` (root) | Yes | No | Redirects to `/leaderboard` |
| `/leaderboard` | Yes | No | — |
| `/submit` | Yes | No | Must be on a team, submissions must be open |
| `/teams` | Yes | No | Registration must be open for create/join/change-tier |
| `/profile` | Yes | No | Can only see own submissions |
| `/rules` | Yes | No | — |
| `/admin/*` (layout) | Yes | No | Layout itself doesn't enforce admin; individual pages/actions do |
| `/admin/scoring` actions | Yes | Yes | `requireAdmin()` |
| `/admin/submissions` actions | Yes | Yes | `requireAdmin()` |
| `/admin/teams` actions | Yes | Yes | `requireAdmin()` |
| `/admin/settings` actions | Yes | Yes | `requireAdmin()` |
| `/admin/announcements` actions | Yes | Yes | `requireAdmin()` |
| `/api/cron/finalize-week` | No* | No | `CRON_SECRET` bearer token check |
| `/api/slack/command` | No | No | Slack signature verification |
| `/api/slack/notify` | No | No | Slack signature verification |

> [!WARNING]
> The admin layout (`app/admin/layout.tsx`) does NOT enforce admin access. It renders for any authenticated user. Authorization is only enforced at the server action level when mutations are attempted. This means non-admin users can see the admin UI but cannot perform actions.

## Server-Side Authorization Checks

All mutations in server actions verify:
1. User is authenticated (`supabase.auth.getUser()`)
2. User has appropriate role (`requireAdmin()` for admin actions)
3. Business rules are met (e.g., `submissions_open`, `registration_open`, team membership)

## Client-Side Visibility Checks

- `AdminLink` component (`components/admin-link.tsx`) uses `isAdmin()` to conditionally show the admin link in navigation
- `SpartanNavLinks` (`components/spartan-nav-links.tsx`) shows navigation items based on authentication state

> [!IMPORTANT]
> Client-side visibility checks are NOT authorization. They are convenience features only. All security is enforced server-side.

## Row Level Security (RLS)

**Confirmed in migrations:**
- `tier_settings`: Public SELECT, admin-only ALL
- `weekly_history`: Public SELECT, admin-only ALL
- `submission_edit_requests`: Users can INSERT/SELECT their own; admin access via service role key

**Not in migrations but likely configured in Supabase dashboard:**
- `profiles` — `Needs maintainer confirmation`
- `teams` — `Needs maintainer confirmation`
- `submissions` — `Needs maintainer confirmation`
- `activity_rules` — `Needs maintainer confirmation`
- `game_settings` — `Needs maintainer confirmation`
- `streak_settings` — `Needs maintainer confirmation`

The `is_admin(auth.uid())` SQL function is used in RLS policies, confirming its existence in the database but not in migration files.

## Cron Authentication

The `/api/cron/finalize-week` route checks for a `Bearer {CRON_SECRET}` authorization header. If `CRON_SECRET` is not set, the check is skipped (allowing unauthenticated access).

## Slack Authentication

Both `/api/slack/command` and `/api/slack/notify` verify the request signature using `SLACK_SIGNING_SECRET` with HMAC-SHA256. In development (non-production without the secret), verification is skipped.

## Known Authorization Risks

1. **Admin UI visible to non-admins** — The admin layout and pages render for any authenticated user. Only mutations are protected.
2. **CRON_SECRET bypass** — If `CRON_SECRET` is not set, the cron endpoint is publicly accessible.
3. **Team membership not verified for rename** — `renameTeamAction` updates the team name without verifying the user is a member of that team. RLS may protect this depending on policy configuration.
4. **RLS configuration unknown** — Several tables' RLS policies are only in the Supabase dashboard, making them undocumented and potentially misconfigured.

## How to Add or Change a Role Safely

1. If adding a new role (beyond admin/member), add a column to `profiles` or create a roles table
2. Create a server-side check function similar to `requireAdmin()`
3. Add RLS policies using the new role
4. Update middleware if routes should be entirely blocked
5. Add both server-side action checks AND client-side UI visibility
6. Update this document

## Change this document when…

- Authentication providers change (e.g., adding OAuth)
- New roles are introduced
- RLS policies are modified
- Protected route patterns change
- The admin determination logic changes
