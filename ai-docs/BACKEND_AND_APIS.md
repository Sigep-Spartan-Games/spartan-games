# Backend and APIs

> **Purpose:** Document all backend entry points, server actions, and API routes.
> **Audience:** Developers, AI agents implementing backend changes.
> **Source of truth:** All `actions.ts` files, `app/api/` routes, `lib/` modules.
> **Last reviewed:** 2026-09-04

## Backend Architecture

The backend is entirely **Next.js server-side**: Server Actions for form mutations and Route Handlers for API endpoints. There is no separate backend service.

## Server Actions Reference

### Submit — `app/submit/actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `createSubmission(formData)` | User | Creates a new activity submission |

**Flow:**
1. Verify authentication
2. Check `game_settings.submissions_open`
3. Find user's team
4. Validate team_id matches
5. Validate activity_key and date (must be current Monday-to-Monday week, US Eastern timezone)
6. Fetch activity rule, verify active
7. Check weekly cap
8. Parse input based on `input_type` (number/text/boolean)
9. Calculate points: `floor(points_per_unit × units)`, then `floor(result × teammate_bonus)` if with teammate
10. Calculate streak bonus (consecutive day logic)
11. Upload proof image to Supabase Storage if provided
12. Insert submission record
13. Insert separate streak bonus submission if applicable
14. Update team streak count and last_activity_date
15. Redirect to `/leaderboard`

---

### Auth — `app/auth/login/actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `loginAction(prevState, formData)` | No | Signs in with email/password |

Uses `useActionState` pattern. Returns `{ ok: boolean, error?: string }`.

---

### Profile — `app/profile/actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `requestSubmissionEdit(submissionId, teamId, suggestedChanges, reason)` | User | Creates a submission edit request; does not verify supplied object ownership |

Inserts into `submission_edit_requests` with status `"pending"`.

---

### Teams — `app/teams/actions.ts`

| Action | Auth | Description | Additional Checks |
|--------|:----:|-------------|-------------------|
| `createTeamAction(formData)` | User | Creates a new team with invite code | Registration open, valid tier, valid name length (2-40) |
| `joinByCodeAction(formData)` | User | Joins a team using invite code | Registration open, team not full |
| `renameTeamAction(formData)` | User | Renames a team | Valid name length |
| `leaveTeamAction(teamId)` | User | Leaves a team (deletes if last member) | Must be a member |
| `changeTierAction(formData)` | User | Changes team tier | Registration open, must be captain (member1) |
| `leaveTeamActionFormData(formData)` | User | Wrapper for ConfirmDeleteButton | — |

---

### Admin Scoring — `app/admin/scoring/actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `upsertActivityRulesBulk(formData)` | Admin | Bulk update points_per_unit and teammate_bonus |
| `updateActivityRule(formData)` | Admin | Update a single activity rule (full edit) |
| `addActivityRule(formData)` | Admin | Create a new activity rule |
| `deleteActivityRule(formData)` | Admin | Delete an activity rule |
| `resetActivityRulesDefaults()` | Admin | **Not implemented** — redirects with error |

---

### Admin Submissions — `app/admin/submissions/actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `deleteSubmission(formData)` | Admin | Deletes a submission; code assumes an unversioned DB trigger updates team points |
| `updateSubmission(formData)` | Admin | Edits a submission, recomputes points from current rules |
| `resolveEditRequest(formData)` | Admin | Approves or rejects a submission edit request |

---

### Admin Teams — `app/admin/teams/actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `deleteTeam(formData)` | Admin | Deletes a team |
| `updateTeamTier(formData)` | Admin | Changes a team's tier |

---

### Admin Settings — `app/admin/settings/actions.ts`

| Action | Auth | Description | Side Effects |
|--------|:----:|-------------|-------------|
| `startGames(formData)` | Admin | Start competition | Closes registration, opens submissions, optionally emails all users |
| `endGames(formData)` | Admin | End competition | Closes submissions, opens registration, optionally emails all users |
| `toggleSubmissions(formData)` | Admin | Toggle submissions independently | — |
| `toggleRegistration(formData)` | Admin | Toggle registration independently | — |
| `finalizeWeek()` | Admin | Trigger weekly finalization | Sets `finalize_requested = true` |
| `resetSpartanGames(formData)` | Admin | Reset competition data | Requires "RESET"; deletes submissions and teams, but nested proof cleanup is incomplete/non-fatal |

### Admin Settings — `app/admin/settings/finalize-week-actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `finalizeWeekWithHistory()` | Admin | Alternative finalize that reads back result; currently not referenced by UI |

### Admin Settings — `app/admin/settings/tier-goals-actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `updateTierGoals(formData)` | Admin | Updates weekly point goals for all tiers |
| `getTierGoals()` | Any | Fetches current tier goals |

### Admin Settings — `app/admin/settings/streak-settings-actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `updateStreakSettings(formData)` | Admin | Updates daily_bonus_increment and max_bonus |

### Admin Announcements — `app/admin/announcements/actions.ts`

| Action | Auth | Description |
|--------|:----:|-------------|
| `sendAnnouncement(formData)` | Admin | Sends announcement via Slack and/or email |
| `internalBroadcastAnnouncement(supabase, subject, message, sendSlack, sendEmail)` | Internal | Shared broadcast logic for admin UI and Slack commands |

---

## API Routes

### `GET /api/cron/finalize-week` — `app/api/cron/finalize-week/route.ts`

**Purpose:** Automated weekly finalization via Vercel cron.

**Schedule:** `0 6 * * 1` (every Monday at 6:00 AM UTC)

**Authentication:** `Bearer {CRON_SECRET}` header. Skipped if `CRON_SECRET` not set.

**Response:**
- `200`: `{ success: true, message: "..." }`
- `401`: `{ error: "Unauthorized" }`
- `500`: `{ error: "Failed to finalize week", details: "..." }`

**Calls:** `finalizeWeekService()` from `lib/finalize-week.ts`

**Middleware caveat:** This route is not in the middleware public-route list. Requests without a Supabase session are redirected before reaching the bearer-token check, which conflicts with normal Vercel cron delivery.

---

### `POST /api/slack/command` — `app/api/slack/command/route.ts`

**Purpose:** Handle Slack slash commands (`/spartangamesbot` or `/spartan-games-notify`).

**Authentication:** Slack request signature verification via `verifySlackRequest()`.

**Behavior:** Parses command text, broadcasts announcement via Slack + email using service role key.

**Response:** `200` with text response.

---

### `POST /api/slack/notify` — `app/api/slack/notify/route.ts`

**Purpose:** Identical duplicate of `/api/slack/command`. Same code.

---

### Export Routes — `app/admin/settings/export/`

| Route | Method | Purpose |
|-------|--------|---------|
| `/admin/settings/export/spartan-games.xlsx` | GET | Excel workbook with Overview, Teams, Submissions, Activity Summary, Activity Rules, Weekly History, and Settings sheets |
| `/admin/settings/export/submissions.csv` | GET | CSV export of submissions |
| `/admin/settings/export/teams.csv` | GET | CSV export of teams |

Each export route implements its own authenticated `profiles.is_admin` check and returns 401 or 403 before querying export data.

---

## Internal Service Modules

### `lib/email.ts`

| Function | Purpose |
|----------|---------|
| `sendEmail({ to, subject, html })` | Send a single email via SMTP |
| `sendBulkEmail({ recipients, subject, html })` | Send to many recipients via BCC in batches of 50 |

Both functions support `EMAIL_TEST_MODE` for diverting emails to a test recipient.

### `lib/slack.ts`

| Function | Purpose |
|----------|---------|
| `sendToSlack(subject, message)` | Send formatted message to Slack webhook |
| `verifySlackRequest(req, bodyText)` | Verify Slack request signature using HMAC-SHA256 |

### `lib/finalize-week.ts`

| Function | Purpose |
|----------|---------|
| `finalizeWeekService()` | Check game state and trigger DB finalization by setting `finalize_requested = true` |

### `lib/admin.ts`

| Function | Purpose |
|----------|---------|
| `requireAdmin(redirectTo)` | Server action guard — redirects if not admin |

### `lib/is-admin.ts`

| Function | Purpose |
|----------|---------|
| `isAdmin()` | Returns boolean — for conditional UI rendering |

### `lib/cached-data.ts`

| Function | Purpose |
|----------|---------|
| `getCachedUser()` | React-cached auth user fetch |
| `getCachedAdminProfile(userId)` | React-cached admin profile check |
| `getPendingEditRequestsCount()` | Count pending edit requests |

### `lib/activity-units.ts`

Activity unit normalization and conversion utilities (miles, games, laps, time, true/false).

## Unwired Backend Entry Points

`finalizeWeek()` in `app/admin/settings/actions.ts` and `finalizeWeekWithHistory()` in `app/admin/settings/finalize-week-actions.ts` are exported but not imported or rendered by the current Settings page. They are dormant code, not a user-accessible manual-finalization feature.

## Change this document when…

- Server actions are added, removed, or their signatures change
- API routes are added or removed
- Email or Slack integration changes
- Authentication requirements for endpoints change
