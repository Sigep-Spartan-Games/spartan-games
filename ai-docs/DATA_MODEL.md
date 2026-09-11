# Data Model

> **Purpose:** Canonical database entities, relationships, derived views, and lifecycle rules.
> **Source of truth:** `supabase/migrations/`.
> **Last reviewed:** 2026-09-11

## Design Rules

- Season-specific state always carries `season_id`.
- Calendar weeks are real rows, not presentation strings.
- Team membership is relational and historical.
- Scoring configuration is versioned; a submission snapshots its exact rule.
- `score_events` is the point authority. Standings are derived rather than cached on teams.
- Historical competition data is retained. UI “delete” operations archive or void.
- Each fact has one canonical storage location; compatibility copies were retired in migration `20260910010000`.

## Core Relationships

```text
seasons
  ├─ season_tiers ─ tiers
  ├─ teams
  │    ├─ team_memberships ─ profiles/auth.users
  │    └─ team_streaks
  ├─ competition_weeks
  ├─ scoring_rule_versions ─ activities
  ├─ submissions
  │    ├─ score_events
  │    ├─ submission_attachments
  │    └─ submission_edit_requests
  └─ team_week_results

job_runs records cron/idempotent workflow executions.
```

## Canonical Tables

### `seasons`

Owns the competition lifecycle: name/slug, timezone, dates, `draft|registration|active|completed`, registration/submission switches, and streak settings. At most one unarchived registration/active season exists.

`current_season_id()` selects the unarchived season used by application views and RPCs. `close_current_season_v2()` is the canonical completion workflow: it closes submissions and finalizes all eligible weeks, including the current partial week, before setting `status = 'completed'`.

### `tiers` and `season_tiers`

`tiers` defines stable tier keys and display order. `season_tiers` stores the weekly goal for each season/tier pair. A goal change affects the current season without rewriting finalized results; `team_week_results.goal_points` is the historical snapshot.

### `teams`, `team_memberships`, and `team_streaks`

`teams` owns team identity, season, tier, invite code, and archive state. Canonical roster rows live in `team_memberships` with a role, display-name snapshot, join time, and leave time.

Database constraints enforce:

- one active team per user per season;
- one active membership row per team/user;
- one active captain per team;
- application RPCs enforce the two-person roster limit;
- active team names are unique case-insensitively within a season.

`team_streaks` is one-to-one with a team. `teams` stores only identity, season, tier, invite code, creation time, and archive state.

### `activities` and `scoring_rule_versions`

`activities` contains stable activity identity and input metadata (`number`, `text`, or `boolean`). Archiving an activity prevents new use without breaking history.

`scoring_rule_versions` contains season-scoped points per unit, teammate multiplier, weekly cap, effective interval, and creator. Only one version can be current for an activity/season. Changing a rule closes the current version and inserts a new one.

### `competition_weeks`

A week has a season, inclusive `starts_on`/`ends_on`, display label, status, and optional finalization time. `(season_id, starts_on)` is unique. The authoritative week starts Monday in the season timezone.

### `submissions`

A submission references its season, week, team, activity, and scoring-rule version. It stores typed input, submitter-name snapshot, calculated point snapshots, proof path, kind, and optional `voided_at`.

For `submission_kind = 'activity'`, both `activity_id` and `scoring_rule_version_id` are required. `submitted_by` may become null after account deletion; `submitted_by_name` preserves attribution.

### `score_events`

The point ledger. Each row records season/week/team, event type, points, actor, source submission, and metadata. Activity and streak events from the same submission are separate rows. A unique partial index prevents duplicate event types for a source submission.

Valid event types are `activity`, `streak_bonus`, and `admin_adjustment`. Submission triggers synchronize its activity event. Voiding a submission removes its ledger events. `team_standings` derives current-week and season totals directly from this ledger.

### `team_week_results`

The immutable-by-convention final result for a team/week: tier snapshot, points, goal, rank, win flag, streak, and finalization timestamp. `(team_id, week_id)` is unique.

### `submission_edit_requests`

Stores user-owned edit/delete requests, structured suggested changes, status, request type, resolver, resolution time, and note. Numeric suggested values use the canonical `activity_value_number` JSON key. A user can have only one pending request per submission. The database derives the team through `submission_id`; no duplicate team column is stored. Approval of a deletion request atomically voids the linked submission and queues its attachment before the request becomes approved.

### `submission_attachments`

Tracks private storage objects, uploader, MIME type, size, deletion request, purge completion, and cleanup error. A voided submission queues its attachment by setting `deleted_at`; the daily cleanup job sets `purged_at` after storage deletion.

### `job_runs`

Tracks job type, deduplication key, status, attempts, times, error, and metadata. `(job_type, deduplication_key)` is unique.

## Read Views

- `current_season_settings` — safe current season configuration.
- `current_activity_rules` — current versioned activity rules in the stable application read shape.
- `current_tier_settings` — current season tier goals.
- `active_team_rosters` — active membership snapshots without profile email.
- `active_teams` — active current-season teams without invite codes.
- `team_standings` — ledger-derived weekly/season totals and win counts.

Application reads should prefer these views. `get_my_team_v2()` returns the caller’s own invite code and role without exposing every team’s invite code.

## Retired Compatibility Layer

Migration `20260910010000_retire_legacy_compatibility.sql` removed the duplicate
`activity_rules`, `tier_settings`, `streak_settings`, `game_settings`, and
`weekly_history` tables. It also removed roster/point/win/streak columns from
`teams`, the deprecated `submissions.activity` and `submissions.activity_units`
columns, and the derived `submission_edit_requests.team_id` column.

Use these canonical replacements:

| Need | Canonical source |
|---|---|
| Team members and names | `team_memberships` / `active_team_rosters` |
| Weekly and season points | `score_events` / `team_standings` |
| Streak | `team_streaks` |
| Weekly winners/history | `team_week_results` joined to `competition_weeks` |
| Season controls/streak settings | `seasons` / `current_season_settings` |
| Tier goals | `season_tiers` / `current_tier_settings` |
| Activity definitions and scoring | `activities`, `scoring_rule_versions`, `current_activity_rules` |

The `active_teams` view retains its prior read shape for callers, but all computed
values now come from `team_standings`; it stores no duplicate state.

## Deletion and Retention

- Teams are archived, not deleted.
- Seasons are completed/archived and retained.
- Submissions are voided; their point events are removed and their row remains auditable.
- Proof attachment `deleted_at` is set by the same void transaction; `purged_at` is set only after the cleanup job removes the Storage object.
- Activity definitions are archived; scoring versions remain.
- User deletion nulls historical user references and retains name snapshots.
- Foreign keys use `RESTRICT` for competition history and `SET NULL` for user identity where appropriate.

See [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md) for deployment and invariant checks.
