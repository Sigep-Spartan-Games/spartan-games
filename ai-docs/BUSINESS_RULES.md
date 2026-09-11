# Business Rules

> **Purpose:** Domain behavior enforced by the database workflows.
> **Source of truth:** `20260909020000_transactional_workflows.sql`, `20260910010000_retire_legacy_compatibility.sql`, `20260911010000_harden_season_close_and_deletion_requests.sql`, and database constraints.
> **Last reviewed:** 2026-09-11

## Season Lifecycle

- `registration`: registration may be open; submissions normally remain closed.
- `active`: registration is closed and submissions may be open.
- `completed`: both are closed and an end date is recorded.
- Starting a new season archives the previous season and its teams, preserves all history, and copies tier goals and current scoring rules.
- Completing an active season first locks its season row, closes submissions, ensures every Monday–Sunday week from the season start through the current partial week exists, and finalizes those weeks before recording the completed status.
- Starting a new season invokes the same close workflow before archiving the outgoing season, so rollover cannot strand an unfinalized final week.

Admins may independently toggle registration/submissions for controlled testing. All controls are changed through `set_season_controls_v2` and stored on the current `seasons` row.

## Teams

- Team names are 2–40 characters and unique, case-insensitively, among active teams in one season.
- A user may belong to one active team per season.
- A team has at most two active members and one captain.
- The creator is captain. Joining uses an eight-character invite code generated in PostgreSQL.
- Only the captain or an admin may rename a team or change its tier. A non-admin may change tier only while registration is open.
- When a captain leaves, the remaining member becomes captain. An empty team is archived.
- Admin removal archives the team and closes active memberships; history is retained.

These checks run under row locks in the `*_v2` team RPCs to prevent concurrent joins or duplicate memberships.

## Activity Submission

`create_activity_submission_v2` is the sole user submission write path. It verifies:

1. authenticated caller and active team membership;
2. open submissions for that team’s season;
3. activity date in the current Monday–Sunday week in the season timezone;
4. active activity and current season-specific scoring rule;
5. exactly the correct typed value for the activity measurement type;
6. caller-owned proof path, supported image MIME, and a 10 MiB limit;
7. weekly activity cap after acquiring a team/activity/week advisory lock.

Numeric values must be positive and meet the configured minimum. Text must be non-empty. Boolean activities must be confirmed.

## Scoring

For an activity:

```text
base_points = max(1, floor(points_per_unit × units))
activity_points = teammate
  ? max(1, floor(base_points × teammate_multiplier))
  : base_points
```

The rule version and calculation inputs are stored on the submission. The awarded activity points are stored as an `activity` ledger event. Weekly caps compare the new event plus existing team/activity/week ledger points, so concurrent submissions cannot both pass the cap.

Changing an activity rule creates a new version. Historical submissions and results keep their previous snapshots.

## Streaks

- First activity day: streak becomes 1.
- Next calendar day: streak increments.
- Later date with a gap: streak resets to 1.
- Same-day or backdated submission: no streak change and no bonus.
- Bonus is `min(streak_count × daily_bonus_increment, max_streak_bonus)`.

The streak update and activity submission share one transaction and team row lock. A bonus is a separate `streak_bonus` ledger event linked to the activity submission; it is not a synthetic activity.

## Derived Standings

`score_events` is authoritative.

- `team_standings.weekly_points` is the sum of ledger events in the current season-local week.
- `team_standings.season_points` is the complete season ledger sum, including the open week.
- Finalized weekly values and wins are snapshots in `team_week_results`.

Do not store or increment duplicate point totals on `teams`; query the ledger-derived standings view.

## Weekly Finalization

`finalize_competition_week`:

- accepts an explicit week or selects the previous season-local week;
- rejects an unfinished week while submissions remain open; coordinated season close may finalize the current partial week after closing submissions;
- uses an advisory lock and `job_runs` deduplication key;
- sums ledger points for every active season team;
- snapshots tier goal and streak;
- ranks within tier by week points, prior points, team creation time, then team ID;
- awards one winner per tier only when first place scored more than zero;
- upserts `team_week_results` as the sole weekly history/winner record;
- marks the week finalized;
- returns `already_finalized` on a safe repeat.

Finalization never deletes submissions or resets authoritative data.

## Edits and Voids

Users may request edits only for their own non-voided activity submissions. Suggested JSON keys are allow-listed. The database derives ownership and team; it does not trust browser-supplied IDs.

Admin edits recalculate against the current rule and update canonical references and ledger points in one transaction. Admin “delete” voids the submission, removes its ledger events, preserves the row, and queues its proof for cleanup.

Approving a member deletion request performs that same void operation before marking the request approved. Both changes share one database transaction, so an approved deletion request cannot leave an active submission or scoring events behind. Rejecting the request changes only the request status.
