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
    const seasonIds = seasons.map((season) => season.id);
    const seasonNames = new Map(seasons.map((season) => [season.id, season.name]));
    const currentSeasonId = seasonIds[0];

    const [submissions, memberships, activities, streakEvents] = await Promise.all([
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("submissions").select(`
          id, season_id, created_at, activity_date, team_id, teams(name),
          submitted_by, activity_key, did_with_teammate, multiplier,
          activity_value_number, activity_value_text, activity_value_bool,
          points_per_unit, teammate_bonus, base_points, points_awarded,
          proof_image_path, voided_at
        `);
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase
          .from("team_memberships")
          .select("team_id,user_id,role,display_name:display_name_snapshot,joined_at,season_id")
          .is("left_at", null);
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("team_id").order("joined_at").order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) =>
        supabase
          .from("activities")
          .select("id,key,label,unit_label")
          .order("key")
          .order("id")
          .range(from, to),
      ),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase
          .from("score_events")
          .select("id,season_id,source_submission_id,points")
          .eq("event_type", "streak_bonus")
          .not("source_submission_id", "is", null);
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("id").range(from, to);
      }),
    ]);

    const rosterMap = buildTeamRosterMap(memberships as CanonicalRosterRow[]);
    const activityLabels = new Map(
      activities.map((activity) => [
        activity.key,
        activity.unit_label
          ? `${activity.label || activity.key} (${activity.unit_label})`
          : activity.label || activity.key,
      ]),
    );
    const streakBonusBySubmission = new Map<string, number>();
    for (const event of streakEvents) {
      if (!event.source_submission_id) continue;
      streakBonusBySubmission.set(
        event.source_submission_id,
        (streakBonusBySubmission.get(event.source_submission_id) ?? 0) + Number(event.points ?? 0),
      );
    }

    const rows = submissions.map((submission) => {
      const roster = rosterMap.get(submission.team_id) ?? EMPTY_TEAM_ROSTER;
      const team = Array.isArray(submission.teams) ? submission.teams[0] : submission.teams;
      return {
        season_name: seasonNames.get(submission.season_id) ?? "Unknown season",
        season_id: submission.season_id,
        created_at: submission.created_at,
        activity_date: submission.activity_date,
        team_name: team?.name ?? "",
        team_members: [roster.captain_name, roster.teammate_name].filter(Boolean).join(" / "),
        team_id: submission.team_id,
        submitted_by: submission.submitted_by,
        activity_type: activityLabels.get(submission.activity_key) ?? submission.activity_key,
        activity_key: submission.activity_key,
        amount: submission.activity_value_number ?? (submission.activity_value_bool ? 1 : ""),
        did_with_teammate: submission.did_with_teammate,
        multiplier: submission.multiplier,
        points_per_unit: submission.points_per_unit ?? "",
        teammate_bonus: submission.teammate_bonus ?? "",
        streak_bonus: streakBonusBySubmission.get(submission.id) ?? 0,
        base_points: submission.base_points,
        points_awarded: submission.points_awarded,
        total_points:
          Number(submission.points_awarded ?? 0) +
          (streakBonusBySubmission.get(submission.id) ?? 0),
        amount_text: submission.activity_value_text ?? "",
        amount_bool:
          submission.activity_value_bool === null
            ? ""
            : submission.activity_value_bool
              ? "TRUE"
              : "FALSE",
        status: submission.voided_at ? "voided" : "active",
        proof_image_path: submission.proof_image_path ?? "",
        submission_id: submission.id,
      };
    });

    const headers = [
      "season_name", "season_id", "created_at", "activity_date", "team_name",
      "team_members", "team_id", "submitted_by", "activity_type", "activity_key",
      "amount", "did_with_teammate", "multiplier", "points_per_unit",
      "teammate_bonus", "streak_bonus", "base_points", "points_awarded",
      "total_points", "amount_text", "amount_bool", "status", "proof_image_path",
      "submission_id",
    ];

    return new NextResponse(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename("spartan-games-submissions", scope, "csv")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof ExportError ? error.message : "Could not generate submissions export.";
    return new NextResponse(message, { status: error instanceof ExportRequestError ? 400 : 500 });
  }
}
