# Business Rules

> **Purpose:** Centralize all domain rules found throughout the code.
> **Audience:** Developers, AI agents, future maintainers.
> **Source of truth:** Server action files, especially `app/submit/actions.ts`.
> **Last reviewed:** 2026-09-03

## Points Calculation

**File:** `app/submit/actions.ts` (lines 180-182), `app/admin/submissions/actions.ts` (lines 188-198)

```
base_points = max(1, floor(points_per_unit × activity_units))
points_awarded = floor(points_per_unit × activity_units)
if (did_with_teammate): points_awarded = floor(points_awarded × teammate_bonus)
```

Points are always floored to integers. Minimum base_points is 1.

> [!WARNING]
> The submit action and admin edit action compute points slightly differently. The submit action uses `Math.floor(pointsPerUnit * units)` then `Math.floor(result * teammateBonus)`. The admin action additionally applies an admin `multiplier` field. This is a subtle inconsistency to watch.

## Streak Bonus

**File:** `app/submit/actions.ts` (lines 184-242)

| Condition | Streak Count | Bonus |
|-----------|-------------|-------|
| First activity ever | 1 | `daily_bonus_increment` |
| Consecutive day (diff = 1) | Previous + 1 | `min(count × increment, max_bonus)` |
| Missed day(s) (diff > 1) | 1 (reset) | `daily_bonus_increment` |
| Same day (diff = 0) | Unchanged | 0 |
| Backdated (diff < 0) | Unchanged | 0 |

**Defaults** (from `streak_settings` table): `daily_bonus_increment = 1`, `max_bonus = 10`.

Streak bonus is inserted as a **separate submission** with `activity_key = "daily_streak_bonus"`, not added to the original submission's points.

## Date Validation (Current Week)

**File:** `app/submit/actions.ts` (lines 56-85)

- Dates must fall within the current Monday-to-Monday week
- Week boundaries computed using **US Eastern timezone** (`America/New_York`)
- Monday at 00:00:00 to next Monday at 00:00:00
- Submissions for dates outside this range are rejected

## Weekly Cap

**File:** `app/submit/actions.ts` (lines 102-129)

- Each activity rule can have an optional `weekly_cap` (max points per team per activity per week)
- If `weekly_cap` is set and > 0, the system sums `points_awarded` for all existing submissions by the same team for the same activity in the current week
- If the sum >= cap, new submissions for that activity are blocked
- Cap is checked BEFORE the new submission is created (doesn't prevent partial over-cap)

## Activity Input Types

**File:** `app/submit/actions.ts` (lines 141-173), `lib/activity-units.ts`

| Input Type | Units Calculation | Validation |
|-----------|------------------|-----------|
| `number` | Raw numeric value | Must be finite and >= 0 |
| `text` | Always 1 | Must not be empty |
| `boolean` | 1 if checked, 0 if not | Unchecked = 0 units → rejected |

### Activity Unit Normalization

**File:** `lib/activity-units.ts`

| Unit Label | Normalized | Step Value |
|-----------|-----------|-----------|
| mile/miles | miles | 0.01 |
| game/games | games | 1 |
| lap/laps | laps | 1 |
| time/duration/hour/hours/hr/hrs | time | 1/60 |
| minute/minutes/min/mins | time (minute-based) | 1/60 |
| true/false/boolean | true/false | null |
| anything else | miles (default) | 0.01 |

Time-based activities use a duration picker (hours:minutes). Values are converted to hours or minutes depending on the unit definition.

## Team Rules

**File:** `app/teams/actions.ts`

| Rule | Implementation |
|------|---------------|
| Team name must be 2-40 characters | Validated in `createTeamAction`, `renameTeamAction` |
| Teams have exactly 2 member slots | `member1_id` and `member2_id` columns |
| Member1 is the captain | Creator always becomes `member1_id` |
| Only captain can change tier | `changeTierAction` checks `member1_id === user.id` |
| Tier must be gold, purple, or red | Validated in server actions + DB CHECK constraint |
| Invite code is 6 characters uppercase alphanumeric | Generated with `Math.random().toString(36)` |
| Last member leaving deletes the team | `leaveTeamAction` checks if other member exists |
| Team operations require registration to be open | `requireRegistrationOpen()` helper |

## Registration and Submission Gates

**File:** `app/admin/settings/actions.ts`, `app/teams/actions.ts`, `app/submit/actions.ts`

| Setting | Controls |
|---------|---------|
| `registration_open` | Team create, join, change tier |
| `submissions_open` | Activity submission |

### Start Games
- Sets `registration_open = false`
- Sets `submissions_open = true`
- Records `games_started_at`
- Clears `games_ended_at`

### End Games
- Sets `registration_open = true`
- Sets `submissions_open = false`
- Records `games_ended_at`

Both have idempotency checks to prevent double-execution.

## Leaderboard Ranking

**File:** `app/leaderboard/page.tsx` (lines 61-78)

Teams are sorted by:
1. `weekly_points` descending
2. `total_points` descending (tiebreaker)
3. `name` ascending (second tiebreaker)

Season total displayed = `total_points + weekly_points` (weekly is live, total is accumulated from finalized weeks).

Leaderboard can be filtered by tier. Default view matches the user's team tier.

## Weekly Finalization

**File:** `lib/finalize-week.ts`, `app/admin/settings/finalize-week-actions.ts`

**Trigger:** Setting `finalize_requested = true` on `game_settings`

**Database function `finalize_week()` performs (atomically):**
1. Records each team's weekly performance in `weekly_history`
2. Determines per-tier winners (highest weekly points)
3. Appends winning week to winners' `weeks_won` array
4. Rolls `weekly_points` into `total_points`
5. Resets `weekly_points` to 0
6. Resets `finalize_requested` to `false`
7. Records `last_week_finalized`

**Guards:**
- Skipped if games haven't started
- Skipped if games have ended
- Skipped if finalization already in progress

## Reset

**File:** `app/admin/settings/actions.ts` (lines 244-297)

1. Requires typing "RESET" as confirmation
2. Attempts to delete all files from `submission-proofs` storage bucket
3. Deletes all submissions
4. Deletes all teams (cascades to weekly_history)
5. Does NOT delete: user accounts, activity rules, game settings, tier settings, streak settings

## Edit Request Workflow

**File:** `app/profile/actions.ts`, `app/admin/submissions/actions.ts`

1. User submits edit request with suggested changes and reason
2. Admin sees pending requests on submissions page
3. Admin can:
   - Navigate to edit the submission directly (approves request automatically)
   - Reject the request
4. Status transitions: `pending` → `approved` | `rejected`

## Permission Rules Summary

| Action | Who | When |
|--------|-----|------|
| Create team | Any authenticated user | Registration open |
| Join team | Any authenticated user | Registration open, team not full |
| Change tier | Team captain (member1) | Registration open |
| Submit activity | Team member | Submissions open, on a team |
| Request edit | Team member | Always (for own submissions) |
| Admin actions | User with `is_admin = true` | Always |

## Duplicated Business Logic

The points calculation is implemented in two places:
1. `app/submit/actions.ts` — User submission
2. `app/admin/submissions/actions.ts` — Admin edit

These should be kept in sync. The admin version also applies the `multiplier` field.

## Change this document when…

- Point calculation formulas change
- New eligibility rules are added
- Streak logic changes
- Competition lifecycle changes
