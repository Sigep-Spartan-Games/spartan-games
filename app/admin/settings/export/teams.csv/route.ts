/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import {
  exportFilename,
  ExportError,
  ExportRequestError,
  fetchAllExportRows,
  parseExportScope,
  resolveExportSeasons,
  toCsv,
} from "@/lib/export-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildTeamRosterMap,
  EMPTY_TEAM_ROSTER,
  type CanonicalRosterRow,
} from "@/lib/team-rosters";

async function requireAdminForRoute() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .single();
  return profile?.is_admin === true;
}

export async function GET(request: Request) {
  if (!(await requireAdminForRoute())) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const scope = parseExportScope(request);
    const supabase = createAdminClient();
    const seasons = await resolveExportSeasons(supabase, scope);
    const currentSeasonId = seasons[0].id;
    const seasonNames = new Map(seasons.map((season) => [season.id, season.name]));

    const [standings, identities, memberships, wins, champions] = await Promise.all([
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("team_standings").select(
          "id,season_id,name,season_points,weekly_points,created_at,tier,streak_count,last_activity_date,archived_at,weeks_won_count",
        );
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("season_points", { ascending: false }).order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("teams").select("id,season_id,invite_code");
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase
          .from("team_memberships")
          .select("id,season_id,team_id,user_id,role,display_name:display_name_snapshot,joined_at")
          .is("left_at", null);
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("team_id").order("joined_at").order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase
          .from("team_week_results")
          .select("id,season_id,team_id,competition_weeks(starts_on)")
          .eq("won", true);
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("season_champions").select(
          "id,season_id,team_id,tier_key,decision_method,finalized_at",
        );
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("tier_key").order("id").range(from, to);
      }),
    ]);

    const inviteCodes = new Map(identities.map((team) => [team.id, team.invite_code]));
    const rosterMap = buildTeamRosterMap(memberships as CanonicalRosterRow[]);
    const championMap = new Map(champions.map((champion) => [champion.team_id, champion]));
    const winDates = new Map<string, string[]>();
    for (const result of wins) {
      const week = Array.isArray(result.competition_weeks)
        ? result.competition_weeks[0]
        : result.competition_weeks;
      if (!week?.starts_on) continue;
      const dates = winDates.get(result.team_id) ?? [];
      dates.push(week.starts_on);
      winDates.set(result.team_id, dates);
    }

    const rows = standings.map((team) => {
      const roster = rosterMap.get(team.id) ?? EMPTY_TEAM_ROSTER;
      const champion = championMap.get(team.id);
      return {
        season_name: seasonNames.get(team.season_id) ?? "Unknown season",
        season_id: team.season_id,
        team_name: team.name,
        total_points: team.season_points ?? 0,
        weekly_points: team.weekly_points ?? 0,
        tier: team.tier,
        streak_count: team.streak_count ?? 0,
        last_activity_date: team.last_activity_date ?? "",
        weeks_won_count: team.weeks_won_count ?? 0,
        weeks_won: (winDates.get(team.id) ?? []).sort().join("; "),
        champion: champion ? "TRUE" : "FALSE",
        champion_decision: champion?.decision_method ?? "",
        captain_name: roster.captain_name ?? "",
        teammate_name: roster.teammate_name ?? "",
        invite_code: inviteCodes.get(team.id) ?? "",
        team_id: team.id,
        captain_id: roster.captain_id ?? "",
        teammate_id: roster.teammate_id ?? "",
        team_status: team.archived_at ? "archived" : "active",
        created_at: team.created_at,
      };
    });

    const headers = [
      "season_name", "season_id", "team_name", "total_points", "weekly_points",
      "tier", "streak_count", "last_activity_date", "weeks_won_count", "weeks_won",
      "champion", "champion_decision", "captain_name", "teammate_name", "invite_code",
      "team_id", "captain_id", "teammate_id", "team_status", "created_at",
    ];

    return new NextResponse(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename("spartan-games-teams", scope, "csv")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof ExportError ? error.message : "Could not generate teams export.";
    return new NextResponse(message, { status: error instanceof ExportRequestError ? 400 : 500 });
  }
}
