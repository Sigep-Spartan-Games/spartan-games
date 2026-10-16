export const ACHIEVEMENT_LEVELS = ["bronze", "silver", "gold", "platinum"] as const;
export type AchievementLevel = (typeof ACHIEVEMENT_LEVELS)[number];

export type AchievementCardData = {
  key: string;
  scope: "personal" | "team";
  kind: "tiered" | "standalone";
  name: string;
  description: string;
  icon_key: string;
  unit: string;
  thresholds?: number[];
  tier_history?: { level: AchievementLevel; threshold: number; earned: boolean; earned_at: string | null }[];
  level: AchievementLevel | null;
  earned: boolean;
  value: number;
  current_threshold?: number | null;
  next_threshold?: number | null;
  eligible_weeks?: number | null;
  earned_at?: string | null;
  detail?: string | null;
  sort_order: number;
};

export type AchievementProgress = {
  season: { id: string; slug: string; name: string; status: string };
  team: {
    id: string;
    name: string;
    tier: string | null;
    emblem_key: string;
    color_key: string;
    motto: string | null;
  } | null;
  membership: { role: "captain" | "member"; joined_at: string; left_at: string | null } | null;
  personal: AchievementCardData[];
  team_achievements: AchievementCardData[];
};

export type TeamProfile = {
  id: string;
  season_id: string;
  name: string;
  tier: "gold" | "purple" | "red" | null;
  emblem_key: string;
  color_key: string;
  motto: string | null;
  weekly_points: number;
  season_points: number;
  weeks_won_count: number;
  streak_count: number;
  roster: { display_name: string; role: "captain" | "member" }[];
  achievements: AchievementCardData[];
};

export function parseAchievementProgress(value: unknown): AchievementProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Partial<AchievementProgress>;
  if (!result.season || !Array.isArray(result.personal) || !Array.isArray(result.team_achievements)) return null;
  return result as AchievementProgress;
}

export function parseTeamProfile(value: unknown): TeamProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Partial<TeamProfile>;
  if (!result.id || !result.name || !Array.isArray(result.roster) || !Array.isArray(result.achievements)) return null;
  return result as TeamProfile;
}

export function sortAchievements(cards: AchievementCardData[]) {
  return [...cards].sort((a, b) => Number(b.earned) - Number(a.earned) || a.sort_order - b.sort_order);
}
