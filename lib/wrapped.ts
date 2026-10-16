export type WrappedActivity = {
  key: string;
  label: string;
  measurement_type: "number" | "text" | "boolean" | null;
  unit_label: string | null;
  submission_count: number;
  points: number;
  numeric_total: number | null;
};

export type WrappedBestDay = {
  date: string;
  points: number;
  submission_count: number;
};

export type WrappedBestWeek = {
  id: string;
  label: string;
  points: number;
  submission_count?: number;
  rank?: number | null;
  won?: boolean;
  goal_points?: number | null;
};

export type WrappedMember = {
  name: string;
  role: "captain" | "member";
  is_current_user: boolean;
  contribution_points: number;
  team_score_share_percent: number;
};

export type WrappedReady = {
  version: 1;
  status: "ready";
  preview: boolean;
  season: {
    id: string;
    slug: string;
    name: string;
    status: string;
    starts_on: string;
    ends_on: string | null;
  };
  player: {
    id: string;
    name: string;
  };
  personal: {
    points: number;
    activity_count: number;
    active_days: number;
    active_weeks: number;
    longest_active_day_run: number;
    streak_bonus_points: number;
    teammate_activities: number;
    teammate_bonus_points: number;
    team_score_share_percent: number;
    contribution_rank: number | null;
    participant_count: number;
    overall_contribution_rank: number | null;
    overall_participant_count: number;
    tier_contribution_rank: number | null;
    tier_participant_count: number;
    contribution_tier: string | null;
    top_activity: WrappedActivity | null;
    best_day: WrappedBestDay | null;
    best_week: WrappedBestWeek | null;
  };
  team: {
    id: string;
    name: string;
    tier: string | null;
    points: number;
    activity_count: number;
    active_days: number;
    teammate_activities: number;
    teammate_bonus_points: number;
    weeks_won: number;
    goals_met: number;
    finalized_weeks: number;
    longest_streak: number;
    adjustment_points: number;
    tier_rank: number | null;
    tier_team_count: number | null;
    is_champion: boolean;
    top_activity: WrappedActivity | null;
    best_week: WrappedBestWeek | null;
    best_comeback: {
      from_week: string;
      to_week: string;
      previous_rank: number;
      rank: number;
      places_gained: number;
    } | null;
    members: WrappedMember[];
  };
};

export type WrappedUnavailable = {
  version: 1;
  status: "locked" | "not_eligible" | "not_found";
  season?: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
};

export type WrappedResult = WrappedReady | WrappedUnavailable;

export function parseWrappedResult(value: unknown): WrappedResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { version: 1, status: "not_found" };
  }

  const result = value as Partial<WrappedResult>;
  if (result.status === "ready" && "season" in result && "personal" in result && "team" in result) {
    const ready = result as WrappedReady;
    return {
      ...ready,
      personal: {
        ...ready.personal,
        overall_contribution_rank:
          ready.personal.overall_contribution_rank ?? ready.personal.contribution_rank ?? null,
        overall_participant_count:
          ready.personal.overall_participant_count ?? ready.personal.participant_count ?? 0,
        tier_contribution_rank: ready.personal.tier_contribution_rank ?? null,
        tier_participant_count: ready.personal.tier_participant_count ?? 0,
        contribution_tier: ready.personal.contribution_tier ?? ready.team.tier ?? null,
      },
    };
  }
  if (
    result.status === "locked"
    || result.status === "not_eligible"
    || result.status === "not_found"
  ) {
    return result as WrappedUnavailable;
  }
  return { version: 1, status: "not_found" };
}

export function titleCaseTier(tier: string | null) {
  if (!tier) return "Open";
  return tier
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

type ContributionRankFacts = Pick<
  WrappedReady["personal"],
  | "points"
  | "overall_contribution_rank"
  | "overall_participant_count"
  | "tier_contribution_rank"
  | "tier_participant_count"
  | "contribution_tier"
>;

export function isTopTenContribution(rank: number | null, points: number) {
  return points > 0 && rank !== null && rank >= 1 && rank <= 10;
}

export function contributionRankCallouts(personal: ContributionRankFacts) {
  if (personal.points <= 0) return [];

  const callouts: string[] = [];
  if (isTopTenContribution(personal.tier_contribution_rank, personal.points)) {
    callouts.push(
      `#${personal.tier_contribution_rank} of ${personal.tier_participant_count} contributors in the ${titleCaseTier(personal.contribution_tier)} tier.`,
    );
  }
  if (isTopTenContribution(personal.overall_contribution_rank, personal.points)) {
    callouts.push(
      `#${personal.overall_contribution_rank} of ${personal.overall_participant_count} contributors across Spartan Games.`,
    );
  }
  return callouts;
}

export function compactContributionHighlight(
  personal: ContributionRankFacts & { team_score_share_percent: number },
) {
  if (isTopTenContribution(personal.overall_contribution_rank, personal.points)) {
    return {
      label: "Overall contributor",
      value: `#${personal.overall_contribution_rank}`,
    };
  }
  if (isTopTenContribution(personal.tier_contribution_rank, personal.points)) {
    return {
      label: `${titleCaseTier(personal.contribution_tier)} tier contributor`,
      value: `#${personal.tier_contribution_rank}`,
    };
  }
  return {
    label: "Team score share",
    value: `${formatWrappedNumber(personal.team_score_share_percent)}%`,
  };
}

export function selectStableWrappedCopy<T>(
  seasonId: string,
  playerId: string,
  slideId: string,
  options: readonly T[],
) {
  if (options.length === 0) {
    throw new Error("Wrapped copy options cannot be empty.");
  }

  const seed = `${seasonId}:${playerId}:${slideId}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return options[(hash >>> 0) % options.length];
}

export function formatWrappedNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function formatWrappedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
