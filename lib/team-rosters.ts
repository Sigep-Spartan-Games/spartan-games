export type CanonicalRosterRow = {
  team_id: string;
  user_id: string | null;
  role: string;
  display_name: string | null;
  joined_at: string;
};

export type TeamRosterSummary = {
  captain_id: string | null;
  captain_name: string | null;
  teammate_id: string | null;
  teammate_name: string | null;
};

export function buildTeamRosterMap(rows: CanonicalRosterRow[]) {
  const grouped = new Map<string, CanonicalRosterRow[]>();

  for (const row of rows) {
    const members = grouped.get(row.team_id) ?? [];
    members.push(row);
    grouped.set(row.team_id, members);
  }

  const result = new Map<string, TeamRosterSummary>();
  for (const [teamId, members] of grouped) {
    members.sort((a, b) => {
      const roleOrder = Number(b.role === "captain") - Number(a.role === "captain");
      return roleOrder || a.joined_at.localeCompare(b.joined_at);
    });

    result.set(teamId, {
      captain_id: members[0]?.user_id ?? null,
      captain_name: members[0]?.display_name ?? null,
      teammate_id: members[1]?.user_id ?? null,
      teammate_name: members[1]?.display_name ?? null,
    });
  }

  return result;
}

export const EMPTY_TEAM_ROSTER: TeamRosterSummary = {
  captain_id: null,
  captain_name: null,
  teammate_id: null,
  teammate_name: null,
};
