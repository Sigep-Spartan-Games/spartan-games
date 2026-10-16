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
    return result as WrappedReady;
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

export function positiveContributionCallout(
  rank: number | null,
  participantCount: number,
) {
  if (!rank || participantCount < 1) return null;
  if (rank === 1) return "#1 contributor";
  if (rank <= 3) return "Top 3 contributor";
  if (rank <= Math.max(1, Math.ceil(participantCount * 0.1))) {
    return "Top 10% contributor";
  }
  return null;
}

export function positiveTeamFinishCallout(
  rank: number | null,
  teamCount: number | null,
) {
  if (!rank || !teamCount || teamCount < 1) return null;
  if (rank === 1) return "#1 in the tier";
  if (rank <= 3) return "a Top 3 finish";
  if (rank <= Math.max(1, Math.ceil(teamCount * 0.1))) {
    return "a Top 10% finish";
  }
  return null;
}

export function formatWrappedNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
