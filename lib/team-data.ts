import { createClient } from "@/lib/supabase/server";

export type TeamDirectoryRow = {
  id: string;
  season_id: string;
  name: string;
  tier: "gold" | "purple" | "red" | null;
  weekly_points: number;
  season_points: number;
  weeks_won_count: number;
  streak_count: number;
  created_at: string;
  captain_id: string | null;
  captain_name: string | null;
  member_id: string | null;
  member_name: string | null;
};

export type MyTeam = {
  id: string;
  season_id: string;
  name: string;
  tier: "gold" | "purple" | "red" | null;
  invite_code: string;
  role: "captain" | "member";
  weekly_points: number;
  total_points: number;
  streak_count: number;
  last_activity_date: string | null;
};

type RosterRow = {
  team_id: string;
  user_id: string | null;
  role: "captain" | "member";
  display_name: string;
  joined_at: string;
};

export async function getTeamDirectory(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data: season, error: seasonError } = await supabase
    .from("current_season_settings")
    .select("id")
    .maybeSingle();

  if (seasonError || !season) {
    return { teams: [] as TeamDirectoryRow[], error: seasonError };
  }

  const [standingsResult, rosterResult] = await Promise.all([
    supabase
      .from("team_standings")
      .select(
        "id, season_id, name, tier, weekly_points, season_points, weeks_won_count, streak_count, created_at, archived_at",
      )
      .eq("season_id", season.id)
      .is("archived_at", null)
      .order("weekly_points", { ascending: false })
      .order("season_points", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("active_team_rosters")
      .select("team_id, user_id, role, display_name, joined_at")
      .eq("season_id", season.id)
      .order("joined_at", { ascending: true }),
  ]);

  if (standingsResult.error) {
    return { teams: [] as TeamDirectoryRow[], error: standingsResult.error };
  }
  if (rosterResult.error) {
    return { teams: [] as TeamDirectoryRow[], error: rosterResult.error };
  }

  const rosters = new Map<string, RosterRow[]>();
  for (const member of (rosterResult.data ?? []) as RosterRow[]) {
    const current = rosters.get(member.team_id) ?? [];
    current.push(member);
    rosters.set(member.team_id, current);
  }

  const teams = (standingsResult.data ?? []).map((team) => {
    const members = rosters.get(team.id) ?? [];
    const captain = members.find((member) => member.role === "captain") ?? members[0];
    const teammate = members.find((member) => member !== captain);

    return {
      id: team.id,
      season_id: team.season_id,
      name: team.name,
      tier: team.tier as TeamDirectoryRow["tier"],
      weekly_points: Number(team.weekly_points ?? 0),
      season_points: Number(team.season_points ?? 0),
      weeks_won_count: Number(team.weeks_won_count ?? 0),
      streak_count: Number(team.streak_count ?? 0),
      created_at: team.created_at,
      captain_id: captain?.user_id ?? null,
      captain_name: captain?.display_name ?? null,
      member_id: teammate?.user_id ?? null,
      member_name: teammate?.display_name ?? null,
    } satisfies TeamDirectoryRow;
  });

  return { teams, error: null };
}

export async function getMyTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ team: MyTeam | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc("get_my_team_v2");
  if (error) return { team: null, error };
  return { team: data && typeof data === "object" ? (data as MyTeam) : null, error: null };
}
