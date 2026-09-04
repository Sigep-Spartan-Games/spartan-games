# Authentication and Authorization

> **Purpose:** Document all authentication and authorization mechanisms in the application.
> **Audience:** Developers, AI agents, security reviewers.
> **Source of truth:** `middleware.ts`, `lib/supabase/proxy.ts`, `lib/admin.ts`, `lib/is-admin.ts`, all `actions.ts` files.
> **Last reviewed:** 2026-09-04

## Authentication Provider

**Supabase Auth** with an email/password flow in application code. No OAuth flow appears in the repository. Whether email confirmation is required is a Supabase dashboard setting and cannot be confirmed from this repository.

## Session Lifecycle

1. **Sign-up:** Client-side `supabase.auth.signUp()` in `components/sign-up-form.tsx` requests an email redirect to `/protected`. The `/auth/confirm` handler can verify `token_hash` callbacks, but the actual email template and confirmation requirement live in Supabase configuration
2. **Login:** Server action `loginAction()` in `app/auth/login/actions.ts` → `supabase.auth.signInWithPassword()` → Session cookie set → Redirect to `/leaderboard`
3. **Session refresh:** Middleware (`lib/supabase/proxy.ts`) calls `supabase.auth.getUser()` on every request, which validates and refreshes the JWT
4. **Sign-out:** `LogoutButton` component calls `supabase.auth.signOut()` → Cookie cleared → Redirect to `/auth/login`
5. **Password reset:** Client-side `supabase.auth.resetPasswordForEmail()` → Email with link to `/auth/update-password` → `supabase.auth.updateUser({ password })`

## Middleware Behavior (`middleware.ts` → `lib/supabase/proxy.ts`)

`middleware()` delegates to `updateSession()` in `lib/supabase/proxy.ts`. Every request except matcher-excluded static/image paths passes through it:

1. Creates a Supabase server client with cookie handling
2. Calls `supabase.auth.getUser()` to validate the session
3. Checks if the route is public or requires authentication
4. Redirects unauthenticated users to `/auth/login`
5. Redirects authenticated users away from login/signup to `/leaderboard`

### Public Routes (no auth required)

The implementation uses `pathname.startsWith(...)`, so these entries behave as path prefixes rather than exact route matches.

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
| `/auth/*` | No | No | Only exact `/auth/login` and `/auth/sign-up` redirect signed-in users |
| `/` (root) | Yes | No | Redirects to `/leaderboard` |
| `/leaderboard` | Yes | No | — |
| `/submit` | Yes | No | Must be on a team, submissions must be open |
| `/teams` | Yes | No | Registration must be open for create/join/change-tier |
| `/profile` | Yes | No | Shows caller's submissions plus synthetic streak-bonus rows for the caller's team |
| `/rules` | Yes | No | — |
| `/admin` | Yes | Yes | Redirects to the guarded `/admin/scoring` page |
| Most `/admin/*` pages | Yes | Yes | Page loader calls `requireAdmin()` |
| `/admin/announcements` page | Yes | No | Form is visible; `sendAnnouncement()` requires admin |
| `/admin/scoring` actions | Yes | Yes | `requireAdmin()` |
| `/admin/submissions` actions | Yes | Yes | `requireAdmin()` |
| `/admin/teams` actions | Yes | Yes | `requireAdmin()` |
| `/admin/settings` actions | Yes | Yes | `requireAdmin()` |
| `/admin/announcements` actions | Yes | Yes | `requireAdmin()` |
| `/api/cron/finalize-week` | Yes* | No | Middleware currently requires a Supabase session, then the handler checks `CRON_SECRET` |
| `/api/slack/command` | No | No | Slack signature verification |
| `/api/slack/notify` | No | No | Slack signature verification |

> [!WARNING]
> The shared admin layout does not enforce admin access. The scoring, submissions, submission-detail, teams, history, and settings pages each call `requireAdmin()` while loading. The announcements page does not, so any authenticated user can render that form; its send action is admin-protected. `/admin` redirects to `/admin/scoring`, which is page-protected.

## Server-Side Authorization Checks

Admin mutations use `requireAdmin()`, and the main submission/team mutations authenticate explicitly. Do not assume every object relationship is checked: `renameTeamAction()` does not verify team membership, and `requestSubmissionEdit()` does not verify that the supplied submission/team belongs to the user.

## Client-Side Visibility Checks

- `AdminLink` component (`components/admin-link.tsx`) uses `isAdmin()` to conditionally show the admin link in navigation
- `SpartanNavLinks` is always rendered outside auth routes; middleware is what prevents unauthenticated access to its destinations

> [!IMPORTANT]
> Client-side visibility checks are not authorization. Security must be enforced by explicit server checks and RLS; the known gaps below show where that enforcement is incomplete.

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

The checked-in policies require an `is_admin(auth.uid())` SQL function, but its definition is absent and a reference does not prove it exists in every deployed database.

## Cron Authentication

The route handler checks for a `Bearer {CRON_SECRET}` header and fails open when the secret is missing. However, `/api/cron/finalize-week` is not in `publicRoutes`, so middleware first requires a Supabase user cookie. A normal Vercel cron request has the bearer header but no user session and is therefore expected to be redirected to `/auth/login`. Treat scheduled finalization as broken until the route/middleware interaction is tested and fixed.

## Slack Authentication

Both `/api/slack/command` and `/api/slack/notify` verify the request signature using `SLACK_SIGNING_SECRET` with HMAC-SHA256. In development (non-production without the secret), verification is skipped.

## Known Authorization Risks

1. **Announcements UI visible to non-admins** — The shared admin layout and announcements page lack a page-level guard. Other current admin pages guard their data loaders.
2. **CRON_SECRET fail-open** — If the handler is reached without `CRON_SECRET`, any middleware-authenticated user can trigger it. Bearer-only cron calls currently appear to be blocked by middleware.
3. **Team membership not verified for rename** — `renameTeamAction` updates the team name without verifying the user is a member of that team. RLS may protect this depending on policy configuration.
4. **RLS configuration unknown** — Several tables' RLS policies are only in the Supabase dashboard, making them undocumented and potentially misconfigured.
5. **Edit-request ownership is not checked** — The action accepts caller-supplied `submissionId` and `teamId`; the checked-in insert policy checks only `auth.uid() = user_id`.
6. **Slack user authorization is absent** — A valid Slack signature proves the workspace/app origin, but the handler does not allowlist Slack user IDs.
7. **Manifest is session-protected** — `/manifest.json` is not excluded by the matcher or public-route list, so signed-out requests are redirected to login even though the build emits it as a static asset.

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
