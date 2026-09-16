import type { Json } from "@/lib/database.types";

export type SeasonChampion = {
  season_id?: string;
  tier_key: string;
  team_id: string;
  team_name: string;
  weekly_wins: number;
  season_points: number;
  goals_met: number;
  decision_method?: "automatic" | "admin_tiebreak";
  finalized_at?: string;
};

export type ChampionTieGroup = {
  tier_key: string;
  candidates: SeasonChampion[];
};

export type SeasonCompletionResult = {
  season_id: string;
  status: "completed" | "needs_tiebreak" | string;
  champions: SeasonChampion[];
  ties: ChampionTieGroup[];
  weeks_finalized?: number;
  weeks_already_finalized?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseChampion(value: unknown): SeasonChampion | null {
  const row = asRecord(value);
  if (
    typeof row.tier_key !== "string" ||
    typeof row.team_id !== "string" ||
    typeof row.team_name !== "string"
  ) {
    return null;
  }

  return {
    season_id: typeof row.season_id === "string" ? row.season_id : undefined,
    tier_key: row.tier_key,
    team_id: row.team_id,
    team_name: row.team_name,
    weekly_wins: asNumber(row.weekly_wins),
    season_points: asNumber(row.season_points),
    goals_met: asNumber(row.goals_met),
    decision_method:
      row.decision_method === "automatic" || row.decision_method === "admin_tiebreak"
        ? row.decision_method
        : undefined,
    finalized_at: typeof row.finalized_at === "string" ? row.finalized_at : undefined,
  };
}

function parseChampions(value: unknown): SeasonChampion[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseChampion).filter((row): row is SeasonChampion => row !== null);
}

function parseTies(value: unknown): ChampionTieGroup[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const row = asRecord(item);
    if (typeof row.tier_key !== "string") return [];
    return [{ tier_key: row.tier_key, candidates: parseChampions(row.candidates) }];
  });
}

export function parseSeasonCompletionResult(value: Json | null): SeasonCompletionResult {
  const row = asRecord(value);
  return {
    season_id: typeof row.season_id === "string" ? row.season_id : "",
    status: typeof row.status === "string" ? row.status : "unknown",
    champions: parseChampions(row.champions),
    ties: parseTies(row.ties),
    weeks_finalized: asNumber(row.weeks_finalized),
    weeks_already_finalized: asNumber(row.weeks_already_finalized),
  };
}

