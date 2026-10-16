import assert from "node:assert/strict";
import test from "node:test";

import {
  compactContributionHighlight,
  contributionRankCallouts,
  isTopTenContribution,
  selectStableWrappedCopy,
} from "../lib/wrapped.ts";

test("contribution badges use the exact numeric top-ten cutoff", () => {
  assert.equal(isTopTenContribution(1, 25), true);
  assert.equal(isTopTenContribution(10, 25), true);
  assert.equal(isTopTenContribution(11, 25), false);
  assert.equal(isTopTenContribution(1, 0), false);
});

test("rank callouts identify tier and overall scopes", () => {
  assert.deepEqual(
    contributionRankCallouts({
      points: 42,
      overall_contribution_rank: 7,
      overall_participant_count: 30,
      tier_contribution_rank: 3,
      tier_participant_count: 12,
      contribution_tier: "gold",
    }),
    [
      "#3 of 12 contributors in the Gold tier.",
      "#7 of 30 contributors across Spartan Games.",
    ],
  );
});

test("zero-point players never receive a contribution callout", () => {
  assert.deepEqual(
    contributionRankCallouts({
      points: 0,
      overall_contribution_rank: 1,
      overall_participant_count: 4,
      tier_contribution_rank: 1,
      tier_participant_count: 2,
      contribution_tier: "purple",
    }),
    [],
  );
});

test("compact recap prioritizes overall rank, tier rank, then team share", () => {
  const base = {
    points: 20,
    overall_participant_count: 30,
    tier_participant_count: 12,
    contribution_tier: "gold",
    team_score_share_percent: 37.5,
  };

  assert.deepEqual(
    compactContributionHighlight({
      ...base,
      overall_contribution_rank: 10,
      tier_contribution_rank: 2,
    }),
    { label: "Overall contributor", value: "#10" },
  );
  assert.deepEqual(
    compactContributionHighlight({
      ...base,
      overall_contribution_rank: 11,
      tier_contribution_rank: 2,
    }),
    { label: "Gold tier contributor", value: "#2" },
  );
  assert.deepEqual(
    compactContributionHighlight({
      ...base,
      overall_contribution_rank: 11,
      tier_contribution_rank: 11,
    }),
    { label: "Team score share", value: "37.5%" },
  );
});

test("copy selection is stable for a player and varies across players", () => {
  const options = ["first", "second", "third"] as const;
  const first = selectStableWrappedCopy("season-1", "player-1", "cover", options);
  assert.equal(
    selectStableWrappedCopy("season-1", "player-1", "cover", options),
    first,
  );

  const selections = new Set(
    Array.from({ length: 20 }, (_, index) => (
      selectStableWrappedCopy("season-1", `player-${index}`, "cover", options)
    )),
  );
  assert.ok(selections.size > 1);
});
