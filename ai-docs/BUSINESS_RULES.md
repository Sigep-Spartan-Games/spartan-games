# Business Rules

> **Purpose:** Domain behavior enforced by the database workflows.
> **Source of truth:** `20260909020000_transactional_workflows.sql`, `20260910010000_retire_legacy_compatibility.sql`, `20260911010000_harden_season_close_and_deletion_requests.sql`, `20260911020000_enforce_season_and_roster_lifecycle.sql`, `20260911030000_keep_finalized_results_in_sync.sql`, and database constraints.
> **Last reviewed:** 2026-09-11

## Season Lifecycle

- `registration`: registration may be open; submissions normally remain closed.
- `active`: submissions are open and registration remains open by default so unteamed users may register late.
- `completed`: both are closed and an end date is recorded.
- Lifecycle transitions are one-way: `registration -> active -> completed`. A completed season cannot be restarted; an admin must create a new season.
- Starting a new season archives the previous season and its teams, preserves all history, and copies tier goals and current scoring rules.
- Completing an active season first locks its season row, closes submissions, ensures every Monday–Sunday week from the season start through the current partial week exists, and finalizes those weeks before recording the completed status.
- Starting a new season invokes the same close workflow before archiving the outgoing season, so rollover cannot strand an unfinalized final week.

The admin UI intentionally exposes lifecycle actions instead of independent registration/submission toggles. Start Games opens submissions and keeps registration open; End Games closes both through the coordinated completion workflow. Notification email is selected by default for both actions, but the admin may opt out before confirmation. Completed-season controls are locked. State changes are stored on the current `seasons` row through the transactional RPCs.

## Teams

- Team names are 2–40 characters and unique, case-insensitively, among active teams in one season.
- A user may belong to one active team per season.
- A team has at most two active members and one captain.
- The creator is captain. Joining uses an eight-character invite code generated in PostgreSQL.
- Only the captain or an admin may rename a team or change its tier. A non-admin captain may change tier only before Start Games; admins retain the correction override afterward.
- An unteamed user may create or join a team during active play while registration is open. Existing members do not occupy a second team.
- After a participant records a non-voided activity in a season, that participant cannot leave, create another team, or join another team for that season. This lock belongs to the submitting participant, so a late registrant may still fill the open spot on a one-member team.
- Before that lock applies, when a captain leaves the remaining member becomes captain. An empty team is archived. End Games closes registration and therefore all member roster changes.
- Admin removal archives the team and closes active memberships; history is retained.

These checks run under row locks in the `*_v2` team RPCs to prevent concurrent joins or duplicate memberships. A membership trigger independently rejects a third active member and a membership whose season differs from its team.

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
The snapshot calculation is centralized in `recalculate_week_results`. If an
admin later edits or voids an activity in a finalized week, the entire affected
week is recalculated in the same transaction so points, ranks, and winners stay
aligned with the ledger. Historical tier, goal, and streak snapshots are preserved
during a correction.

## Edits and Voids

Users may request edits only for their own non-voided activity submissions. Suggested JSON keys are allow-listed. The database derives ownership and team; it does not trust browser-supplied IDs.

Admin edits recalculate against the current rule and update canonical references and ledger points in one transaction. If the original or destination week is finalized, its complete result set is refreshed before the edit commits. Admin “delete” voids the submission, removes its ledger events, preserves the row, queues its proof for cleanup, and refreshes finalized history when applicable.

Approving a member deletion request performs that same void operation before marking the request approved. Both changes share one database transaction, so an approved deletion request cannot leave an active submission or scoring events behind. Rejecting the request changes only the request status.
