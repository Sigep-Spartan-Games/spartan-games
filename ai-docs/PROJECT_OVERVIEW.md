# Project Overview

> **Purpose:** Product, roles, core workflows, and project maturity.
> **Last reviewed:** 2026-09-10

## Product

Spartan Games gamifies fitness and fraternity activities for SigEp members. Members form two-person teams, choose a competition tier, log activities, earn points/streak bonuses, and compete in weekly and season standings.

Roles are member and admin. Admin status is `profiles.is_admin`; database workflows re-check it for privileged mutations.

## Capabilities

1. Supabase email/password authentication.
2. Season-scoped two-person teams with private invite codes and captain/member roles.
3. Numeric, text, or boolean activity submissions with optional private proof images.
4. Versioned season-specific scoring, teammate multipliers, and concurrency-safe weekly caps.
5. Team streak bonuses stored as separate point-ledger events.
6. Live ledger-derived weekly and season standings by Gold/Purple/Red tier.
7. Idempotent weekly finalization with result snapshots, deterministic winners, and job history.
8. Admin activity, submission, team, history, season, goal, streak, notification, and export tools.
9. User submission edit/delete requests with admin resolution.
10. Non-destructive season rollover and auditable submission voiding.

## Lifecycle

```text
registration → active → completed/archived
      │           │             │
  teams join   weekly jobs   new season copies rules/goals
```

- Starting games closes registration, opens submissions, and makes the current season active.
- Ending games closes both switches and marks the season completed.
- Starting a new season archives current teams/history, creates an empty registration season, and retains prior data.
- Weekly finalization snapshots every team, awards one positive-scoring winner per tier, and is safe to retry.

## Terminology

| Term | Meaning |
|---|---|
| Activity | Stable input definition such as Running |
| Scoring rule version | Season-specific points/multiplier/cap effective for a period |
| Submission | Member activity plus exact calculation/input snapshots |
| Score event | Authoritative activity, streak, or admin-adjustment ledger entry |
| Competition week | Monday–Sunday season-local date range |
| Team result | Finalized team/week points, goal, rank, and win snapshot |
| Void | Remove a submission’s scoring effect while retaining its audit row |
| Archive | Hide an ended team/activity/season from current use without deleting history |

## Tiers

Gold, Purple, and Red have default weekly goals of 100, 75, and 50. Goals are copied into each season and may be changed by admins; finalized results retain the goal used that week.

## Non-Goals

- No social/OAuth login in application code.
- No native mobile client or offline service worker.
- No payment/subscription functionality.
- No real-time WebSocket leaderboard; refresh/pull-to-refresh is used.
- English-only UI.

## Remaining Work

- Add browser E2E tests for critical member/admin workflows.
- Add rate limiting for abuse-prone routes/actions.
- Authorize Slack command users, not only the Slack request signature.
- Escape/sanitize announcement HTML and consolidate duplicate Slack routes.
- Remove committed legacy diagnostic/data artifacts after confirming they are not needed.
- Decide whether the static rules pages should render live scoring values.
