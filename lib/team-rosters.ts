export type CanonicalRosterRow = {
  team_id: string;
  user_id: string | null;
  role: string;
  display_name: string | null;
  joined_at: string;
};

export type TeamRosterSummary = {
  member1_id: string | null;
  member1_name: string | null;
  member2_id: string | null;
  member2_name: string | null;
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
      member1_id: members[0]?.user_id ?? null,
      member1_name: members[0]?.display_name ?? null,
      member2_id: members[1]?.user_id ?? null,
      member2_name: members[1]?.display_name ?? null,
    });
  }

  return result;
}

export const EMPTY_TEAM_ROSTER: TeamRosterSummary = {
  member1_id: null,
  member1_name: null,
  member2_id: null,
  member2_name: null,
};
