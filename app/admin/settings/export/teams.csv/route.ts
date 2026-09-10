/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/settings/export/teams.csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTeamRosterMap,
  EMPTY_TEAM_ROSTER,
  type CanonicalRosterRow,
} from "@/lib/team-rosters";

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function weeksWonStr(weeks: string[] | null): string {
  if (!weeks || weeks.length === 0) return "";
  return weeks.join("; ");
}

async function requireAdminForRoute() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false as const, status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { ok: false as const, status: 403 };

  return { ok: true as const, status: 200, supabase };
}

export async function GET() {
  const guard = await requireAdminForRoute();
  if (!guard.ok)
    return new NextResponse("Unauthorized", { status: guard.status });

  const supabase = createAdminClient();

  const [standingsResult, identitiesResult, rostersResult, winsResult] =
    await Promise.all([
      supabase
        .from("team_standings")
        .select(
          "id,name,season_points,weekly_points,created_at,tier,streak_count,last_activity_date",
        )
        .order("season_points", { ascending: false })
        .order("name", { ascending: true }),
      supabase.from("teams").select("id,invite_code"),
      supabase
        .from("team_memberships")
        .select(
          "team_id,user_id,role,display_name:display_name_snapshot,joined_at",
        )
        .is("left_at", null),
      supabase
        .from("team_week_results")
        .select("team_id,competition_weeks(starts_on)")
        .eq("won", true),
    ]);

  const error =
    standingsResult.error ??
    identitiesResult.error ??
    rostersResult.error ??
    winsResult.error;

  if (error) return new NextResponse(error.message, { status: 500 });

  const inviteCodes = new Map(
    (identitiesResult.data ?? []).map((team) => [team.id, team.invite_code]),
  );
  const rosterMap = buildTeamRosterMap(
    (rostersResult.data ?? []) as CanonicalRosterRow[],
  );
  const winDates = new Map<string, string[]>();
  for (const result of winsResult.data ?? []) {
    const relation = Array.isArray(result.competition_weeks)
      ? result.competition_weeks[0]
      : result.competition_weeks;
    if (!relation?.starts_on) continue;
    const dates = winDates.get(result.team_id) ?? [];
    dates.push(relation.starts_on);
    winDates.set(result.team_id, dates);
  }

  const rows = (standingsResult.data ?? []).map((team) => {
    const roster = rosterMap.get(team.id) ?? EMPTY_TEAM_ROSTER;
    return {
      team_name: team.name,
      total_points: team.season_points ?? 0,
      weekly_points: team.weekly_points ?? 0,
      tier: team.tier ?? "",
      streak_count: team.streak_count ?? 0,
      last_activity_date: team.last_activity_date ?? "",
      weeks_won: weeksWonStr(winDates.get(team.id) ?? []),
      member1_name: roster.captain_name ?? "",
      member2_name: roster.teammate_name ?? "",
      invite_code: inviteCodes.get(team.id) ?? "",
      team_id: team.id,
      member1_id: roster.captain_id ?? "",
      member2_id: roster.teammate_id ?? "",
      created_at: team.created_at,
    };
  });

  const headers = [
    "team_name",
    "total_points",
    "weekly_points",
    "tier",
    "streak_count",
    "last_activity_date",
    "weeks_won",
    "member1_name",
    "member2_name",
    "invite_code",
    "team_id",
    "member1_id",
    "member2_id",
    "created_at",
  ];

  const csv =
    headers.join(",") +
    "\n" +
    rows
      .map((r) => headers.map((h) => csvEscape((r as any)[h])).join(","))
      .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spartan-games-teams.csv"`,
    },
  });
}
