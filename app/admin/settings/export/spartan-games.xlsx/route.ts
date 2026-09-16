/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import {
  exportFilename,
  ExportError,
  ExportRequestError,
  fetchAllExportRows,
  parseExportScope,
  resolveExportSeasons,
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
  if (!auth.user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .single();
  return profile?.is_admin
    ? { ok: true as const, status: 200 }
    : { ok: false as const, status: 403 };
}

function safeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return value;
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFDDDDDD" } },
      left: { style: "thin", color: { argb: "FFDDDDDD" } },
      bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
      right: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
  });
}

function autoWidth(worksheet: ExcelJS.Worksheet, max = 60) {
  worksheet.columns.forEach((column) => {
    let width = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      width = Math.max(width, Math.min(max, String(cell.value ?? "").length + 2));
    });
    column.width = width;
  });
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: unknown[][],
) {
  const worksheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  worksheet.addRow(headers);
  styleHeader(worksheet.getRow(1));
  rows.forEach((row) => worksheet.addRow(row.map(safeCell)));
  autoWidth(worksheet);
  return worksheet;
}

function relationName(value: any) {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation?.name ?? "";
}

function relationWeek(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

export async function GET(request: Request) {
  const guard = await requireAdminForRoute();
  if (!guard.ok) return new NextResponse("Unauthorized", { status: guard.status });

  try {
    const scope = parseExportScope(request);
    const supabase = createAdminClient();
    const seasons = await resolveExportSeasons(supabase, scope);
    const currentSeasonId = seasons[0].id;
    const seasonNames = new Map(seasons.map((season) => [season.id, season.name]));

    const [
      seasonSettings,
      standings,
      identities,
      memberships,
      wins,
      submissions,
      streakEvents,
      history,
      champions,
      rules,
      tierSettings,
    ] = await Promise.all([
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("seasons").select(
          "id,name,status,timezone,starts_on,ends_on,registration_open,submissions_open,daily_bonus_increment,max_streak_bonus,archived_at,created_at",
        );
        if (scope === "current") query = query.eq("id", currentSeasonId);
        return query.order("starts_on").order("id").range(from, to);
      }),
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
        let query = supabase.from("submissions").select(`
          id,season_id,created_at,activity_date,team_id,teams(name),submitted_by,
          activity_key,did_with_teammate,multiplier,activity_value_number,
          activity_value_text,activity_value_bool,points_per_unit,teammate_bonus,
          base_points,points_awarded,proof_image_path,voided_at
        `);
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("created_at", { ascending: false }).order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase
          .from("score_events")
          .select("id,season_id,source_submission_id,points")
          .eq("event_type", "streak_bonus")
          .not("source_submission_id", "is", null);
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("team_week_results").select(
          "id,season_id,team_id,points,tier_key,goal_points,won,streak_count,finalized_at,teams(name),competition_weeks(label,starts_on)",
        );
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("finalized_at", { ascending: false }).order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("season_champions").select(
          "id,season_id,tier_key,team_id,team_name_snapshot,weekly_wins,season_points,goals_met,decision_method,finalized_at",
        );
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("tier_key").order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("scoring_rule_versions").select(
          "id,season_id,points_per_unit,teammate_multiplier,weekly_cap_points,effective_from,effective_to,activities(key,label,measurement_type,unit_label,min_value,step_value)",
        );
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("effective_from").order("id").range(from, to);
      }),
      fetchAllExportRows<any>((from, to) => {
        let query = supabase.from("season_tiers").select(
          "id,season_id,tier_key,weekly_goal,created_at,updated_at",
        );
        if (scope === "current") query = query.eq("season_id", currentSeasonId);
        return query.order("season_id").order("tier_key").order("id").range(from, to);
      }),
    ]);

    const inviteCodes = new Map(identities.map((team) => [team.id, team.invite_code]));
    const rosterMap = buildTeamRosterMap(memberships as CanonicalRosterRow[]);
    const championByTeam = new Map(champions.map((champion) => [champion.team_id, champion]));
    const winsByTeam = new Map<string, string[]>();
    wins.forEach((result) => {
      const week = relationWeek(result.competition_weeks);
      if (!week?.starts_on) return;
      winsByTeam.set(result.team_id, [...(winsByTeam.get(result.team_id) ?? []), week.starts_on]);
    });
    const streakBySubmission = new Map<string, number>();
    streakEvents.forEach((event) => {
      if (!event.source_submission_id) return;
      streakBySubmission.set(
        event.source_submission_id,
        (streakBySubmission.get(event.source_submission_id) ?? 0) + Number(event.points ?? 0),
      );
    });
    const activityLabels = new Map<string, string>();
    rules.forEach((rule) => {
      const activity = Array.isArray(rule.activities) ? rule.activities[0] : rule.activities;
      if (!activity?.key) return;
      activityLabels.set(
        activity.key,
        activity.unit_label
          ? `${activity.label || activity.key} (${activity.unit_label})`
          : activity.label || activity.key,
      );
    });

    const teams = standings.map((team) => ({
      ...team,
      season_name: seasonNames.get(team.season_id) ?? "Unknown season",
      invite_code: inviteCodes.get(team.id) ?? "",
      weeks_won: (winsByTeam.get(team.id) ?? []).sort(),
      champion: championByTeam.get(team.id),
      ...(rosterMap.get(team.id) ?? EMPTY_TEAM_ROSTER),
    }));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Spartan Games";
    workbook.created = new Date();

    addSheet(workbook, "Overview", [
      "Season", "Team", "Tier", "Season Points", "Weekly Points", "Wins", "Champion", "Members",
    ], teams.map((team) => [
      team.season_name,
      team.name,
      team.tier,
      team.season_points ?? 0,
      team.weekly_points ?? 0,
      team.weeks_won_count ?? 0,
      team.champion ? "YES" : "",
      [team.captain_name, team.teammate_name].filter(Boolean).join(" & "),
    ]));

    addSheet(workbook, "Teams", [
      "Season", "Season ID", "Team", "Team ID", "Tier", "Season Points", "Weekly Points",
      "Streak", "Last Activity", "Wins", "Win Dates", "Champion", "Champion Decision",
      "Captain", "Teammate", "Captain ID", "Teammate ID", "Invite Code", "Status", "Created At",
    ], teams.map((team) => [
      team.season_name, team.season_id, team.name, team.id, team.tier, team.season_points ?? 0,
      team.weekly_points ?? 0, team.streak_count ?? 0, team.last_activity_date ?? "",
      team.weeks_won_count ?? 0, team.weeks_won.join(", "), team.champion ? "TRUE" : "FALSE",
      team.champion?.decision_method ?? "", team.captain_name ?? "", team.teammate_name ?? "",
      team.captain_id ?? "", team.teammate_id ?? "", team.invite_code,
      team.archived_at ? "archived" : "active", team.created_at,
    ]));

    addSheet(workbook, "Submissions", [
      "Season", "Season ID", "Created At", "Activity Date", "Team", "Team Members",
      "Activity", "Activity Key", "Amount", "With Teammate", "Points / Unit", "Teammate Multiplier",
      "Activity Points", "Streak Bonus", "Total Points", "Text Value", "Boolean Value", "Status",
      "Proof Image", "Submitted By", "Team ID", "Submission ID",
    ], submissions.map((submission) => {
      const roster = rosterMap.get(submission.team_id) ?? EMPTY_TEAM_ROSTER;
      const amount = submission.activity_value_number ?? (submission.activity_value_bool ? 1 : "");
      const streak = streakBySubmission.get(submission.id) ?? 0;
      return [
        seasonNames.get(submission.season_id) ?? "Unknown season", submission.season_id,
        submission.created_at, submission.activity_date, relationName(submission.teams),
        [roster.captain_name, roster.teammate_name].filter(Boolean).join(" & "),
        activityLabels.get(submission.activity_key) ?? submission.activity_key, submission.activity_key,
        amount, submission.did_with_teammate ? "TRUE" : "FALSE", submission.points_per_unit ?? "",
        submission.teammate_bonus ?? "", submission.points_awarded ?? 0, streak,
        Number(submission.points_awarded ?? 0) + streak, submission.activity_value_text ?? "",
        submission.activity_value_bool === null ? "" : submission.activity_value_bool ? "TRUE" : "FALSE",
        submission.voided_at ? "voided" : "active", submission.proof_image_path ?? "",
        submission.submitted_by ?? "", submission.team_id, submission.id,
      ];
    }));

    const activitySummary = new Map<string, any>();
    submissions.filter((submission) => !submission.voided_at).forEach((submission) => {
      const key = `${submission.season_id}:${submission.team_id}:${submission.activity_key}`;
      const current = activitySummary.get(key) ?? {
        season: seasonNames.get(submission.season_id) ?? "Unknown season",
        team: relationName(submission.teams),
        activity: activityLabels.get(submission.activity_key) ?? submission.activity_key,
        activity_key: submission.activity_key,
        count: 0,
        amount: 0,
        points: 0,
      };
      current.count += 1;
      current.amount += Number(submission.activity_value_number ?? (submission.activity_value_bool ? 1 : 0));
      current.points += Number(submission.points_awarded ?? 0) + (streakBySubmission.get(submission.id) ?? 0);
      activitySummary.set(key, current);
    });
    addSheet(workbook, "Activity Summary", [
      "Season", "Team", "Activity", "Activity Key", "Submission Count", "Total Amount", "Total Points",
    ], Array.from(activitySummary.values()).map((row) => [
      row.season, row.team, row.activity, row.activity_key, row.count, row.amount, row.points,
    ]));

    addSheet(workbook, "Weekly History", [
      "Season", "Season ID", "Week", "Week Start", "Team", "Team ID", "Tier", "Points",
      "Goal", "Met Goal", "Won", "Streak", "Finalized At", "Result ID",
    ], history.map((result) => {
      const week = relationWeek(result.competition_weeks);
      return [
        seasonNames.get(result.season_id) ?? "Unknown season", result.season_id, week?.label ?? "",
        week?.starts_on ?? "", relationName(result.teams), result.team_id, result.tier_key,
        result.points, result.goal_points, result.points >= result.goal_points ? "TRUE" : "FALSE",
        result.won ? "TRUE" : "FALSE", result.streak_count, result.finalized_at, result.id,
      ];
    }));

    addSheet(workbook, "Champions", [
      "Season", "Season ID", "Tier", "Team", "Team ID", "Weekly Wins", "Season Points",
      "Goals Met", "Decision", "Finalized At",
    ], champions.map((champion) => [
      seasonNames.get(champion.season_id) ?? "Unknown season", champion.season_id, champion.tier_key,
      champion.team_name_snapshot, champion.team_id, champion.weekly_wins, champion.season_points,
      champion.goals_met, champion.decision_method, champion.finalized_at,
    ]));

    addSheet(workbook, "Activity Rules", [
      "Season", "Season ID", "Activity Key", "Label", "Input Type", "Unit", "Points / Unit",
      "Teammate Multiplier", "Weekly Cap", "Min Value", "Step Value", "Effective From", "Effective To",
    ], rules.map((rule) => {
      const activity = Array.isArray(rule.activities) ? rule.activities[0] : rule.activities;
      return [
        seasonNames.get(rule.season_id) ?? "Unknown season", rule.season_id, activity?.key ?? "",
        activity?.label ?? "", activity?.measurement_type ?? "", activity?.unit_label ?? "",
        rule.points_per_unit, rule.teammate_multiplier, rule.weekly_cap_points ?? "",
        activity?.min_value ?? "", activity?.step_value ?? "", rule.effective_from, rule.effective_to ?? "",
      ];
    }));

    addSheet(workbook, "Tier Goals", [
      "Season", "Season ID", "Tier", "Weekly Goal", "Created At", "Updated At",
    ], tierSettings.map((setting) => [
      seasonNames.get(setting.season_id) ?? "Unknown season", setting.season_id, setting.tier_key,
      setting.weekly_goal, setting.created_at, setting.updated_at,
    ]));

    addSheet(workbook, "Seasons", [
      "Season", "Season ID", "Status", "Timezone", "Starts On", "Ends On", "Registration Open",
      "Submissions Open", "Daily Streak Increment", "Maximum Streak Bonus", "Archived At", "Created At",
    ], seasonSettings.map((season) => [
      season.name, season.id, season.status, season.timezone, season.starts_on, season.ends_on ?? "",
      season.registration_open ? "TRUE" : "FALSE", season.submissions_open ? "TRUE" : "FALSE",
      season.daily_bonus_increment, season.max_streak_bonus, season.archived_at ?? "", season.created_at,
    ]));

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${exportFilename("spartan-games", scope, "xlsx")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof ExportError ? error.message : "Could not generate workbook.";
    return new NextResponse(message, { status: error instanceof ExportRequestError ? 400 : 500 });
  }
}
