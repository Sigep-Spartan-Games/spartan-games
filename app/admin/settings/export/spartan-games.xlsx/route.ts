/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/settings/export/spartan-games.xlsx/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTeamRosterMap,
  EMPTY_TEAM_ROSTER,
  type CanonicalRosterRow,
} from "@/lib/team-rosters";

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

function isoDate(d: any) {
  if (!d) return "";
  return String(d);
}

function safeStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function boolStr(v: any) {
  if (v === null || v === undefined) return "";
  return v ? "TRUE" : "FALSE";
}

function amountFromSubmission(s: any) {
  const amt =
    s.activity_value_number ??
    (s.activity_value_bool === true ? 1 : null);

  return amt ?? "";
}

function weeksWonStr(weeks: string[] | null): string {
  if (!weeks || weeks.length === 0) return "";
  return weeks.join(", ");
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFDDDDDD" } },
      left: { style: "thin", color: { argb: "FFDDDDDD" } },
      bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
      right: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
  });
}

function autoWidth(ws: ExcelJS.Worksheet, max = 60) {
  ws.columns?.forEach((col) => {
    let best = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      const s = v === null || v === undefined ? "" : String(v);
      best = Math.max(best, Math.min(max, s.length + 2));
    });
    col.width = best;
  });
}

export async function GET() {
  const guard = await requireAdminForRoute();
  if (!guard.ok)
    return new NextResponse("Unauthorized", { status: guard.status });

  const supabase = createAdminClient();

  // Fetch activity_rules for dynamic labels
  const { data: activityRules } = await supabase
    .from("current_activity_rules")
    .select("activity_key, label, unit, unit_label, points_per_unit, teammate_bonus, weekly_cap, active, input_type, min_value, step_value")
    .order("activity_key");

  // Build label map from dynamic activity_rules
  const activityLabels: Record<string, string> = {};
  for (const rule of activityRules ?? []) {
    const label = rule.label || rule.activity_key;
    const unitLabel = rule.unit_label || rule.unit || "";
    activityLabels[rule.activity_key] = unitLabel ? `${label} (${unitLabel})` : label;
  }

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

  const teamsErr =
    standingsResult.error ??
    identitiesResult.error ??
    rostersResult.error ??
    winsResult.error;
  if (teamsErr) return new NextResponse(teamsErr.message, { status: 500 });

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

  const teams = (standingsResult.data ?? []).map((team) => {
    const roster = rosterMap.get(team.id) ?? EMPTY_TEAM_ROSTER;
    return {
      ...team,
      total_points: team.season_points ?? 0,
      invite_code: inviteCodes.get(team.id) ?? null,
      weeks_won: winDates.get(team.id) ?? [],
      ...roster,
    };
  });

  // Submission facts remain snapshots, while team membership comes from the roster.
  const { data: subs, error: subsErr } = await supabase
    .from("submissions")
    .select(
      `
      id,
      created_at,
      activity_date,
      team_id,
      teams ( name ),
      submitted_by,
      activity_key,
      did_with_teammate,
      multiplier,
      activity_value_number,
      activity_value_text,
      activity_value_bool,
      points_per_unit,
      teammate_bonus,
      base_points,
      points_awarded,
      streak_bonus,
      proof_image_path
    `,
    )
    .order("created_at", { ascending: false });

  if (subsErr) return new NextResponse(subsErr.message, { status: 500 });

  const { data: resultHistory, error: historyError } = await supabase
    .from("team_week_results")
    .select(
      "id,team_id,points,tier_key,goal_points,won,streak_count,finalized_at,teams(name),competition_weeks(label,starts_on)",
    )
    .order("finalized_at", { ascending: false });

  if (historyError)
    return new NextResponse(historyError.message, { status: 500 });

  const cumulativeWins = new Map<string, number>();
  const weeklyHistory = [...(resultHistory ?? [])]
    .sort((a: any, b: any) => {
      const aWeek = Array.isArray(a.competition_weeks)
        ? a.competition_weeks[0]
        : a.competition_weeks;
      const bWeek = Array.isArray(b.competition_weeks)
        ? b.competition_weeks[0]
        : b.competition_weeks;
      return String(aWeek?.starts_on ?? "").localeCompare(
        String(bWeek?.starts_on ?? ""),
      );
    })
    .map((result: any) => {
      const week = Array.isArray(result.competition_weeks)
        ? result.competition_weeks[0]
        : result.competition_weeks;
      const wins =
        (cumulativeWins.get(result.team_id) ?? 0) + (result.won ? 1 : 0);
      cumulativeWins.set(result.team_id, wins);
      return {
        id: result.id,
        team_id: result.team_id,
        teams: result.teams,
        week_identifier: week?.label ?? "",
        weekly_points: result.points,
        tier: result.tier_key,
        weekly_goal: result.goal_points,
        met_goal: result.points >= result.goal_points,
        weeks_won_count: wins,
        streak_count: result.streak_count,
        created_at: result.finalized_at,
      };
    })
    .reverse();

  // Tier Settings
  const { data: tierSettings } = await supabase
    .from("current_tier_settings")
    .select("tier, weekly_goal, created_at, updated_at")
    .order("tier");

  // Streak Settings
  const { data: streakSettings } = await supabase
    .from("current_season_settings")
    .select("daily_bonus_increment, max_streak_bonus")
    .maybeSingle();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Spartan Games";
  workbook.created = new Date();

  // -----------------------------
  // Sheet 1: Overview (Leaderboard)
  // -----------------------------
  const wsOverview = workbook.addWorksheet("Overview", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  wsOverview.addRow([
    "Rank",
    "Team Name",
    "Total Points",
    "Weekly Points",
    "Tier",
    "Streak",
    "Members",
    "Invite Code",
    "Team ID",
  ]);
  styleHeader(wsOverview.getRow(1));

  (teams ?? []).forEach((t: any, idx: number) => {
    const members = [t.member1_name, t.member2_name]
      .filter(Boolean)
      .join(" & ");
    wsOverview.addRow([
      idx + 1,
      t.name,
      t.total_points ?? 0,
      t.weekly_points ?? 0,
      t.tier ?? "",
      t.streak_count ?? 0,
      members,
      t.invite_code ?? "",
      t.id,
    ]);
  });

  autoWidth(wsOverview);

  // -----------------------------
  // Sheet 2: Teams (full details)
  // -----------------------------
  const wsTeams = workbook.addWorksheet("Teams", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  wsTeams.addRow([
    "Team Name",
    "Total Points",
    "Weekly Points",
    "Tier",
    "Streak Count",
    "Last Activity Date",
    "Weeks Won",
    "Member 1 Name",
    "Member 2 Name",
    "Invite Code",
    "Created At",
    "Team ID",
    "Member 1 ID",
    "Member 2 ID",
  ]);
  styleHeader(wsTeams.getRow(1));

  (teams ?? []).forEach((t: any) => {
    wsTeams.addRow([
      t.name,
      t.total_points ?? 0,
      t.weekly_points ?? 0,
      t.tier ?? "",
      t.streak_count ?? 0,
      isoDate(t.last_activity_date),
      weeksWonStr(t.weeks_won),
      t.member1_name ?? "",
      t.member2_name ?? "",
      t.invite_code ?? "",
      safeStr(t.created_at),
      t.id,
      t.member1_id ?? "",
      t.member2_id ?? "",
    ]);
  });

  autoWidth(wsTeams);

  // -----------------------------
  // Sheet 3: Submissions (audit-friendly)
  // -----------------------------
  const wsSubs = workbook.addWorksheet("Submissions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  wsSubs.addRow([
    "Created At",
    "Activity Date",
    "Team Name",
    "Team Members",
    "Activity Type",
    "Activity Key",
    "Amount",
    "With Teammate",
    "Multiplier",
    "Points / Unit",
    "Teammate Bonus",
    "Streak Bonus",
    "Base Points",
    "Points Awarded",
    "Amount Text",
    "Amount Bool",
    "Proof Image",
    "Submitted By",
    "Team ID",
    "Submission ID",
  ]);
  styleHeader(wsSubs.getRow(1));

  (subs ?? []).forEach((s: any) => {
    const teamName = s.teams?.name ?? "";
    const roster = rosterMap.get(s.team_id) ?? EMPTY_TEAM_ROSTER;
    const teamMembers = [roster.member1_name, roster.member2_name]
      .filter(Boolean)
      .join(" & ");

    wsSubs.addRow([
      safeStr(s.created_at),
      isoDate(s.activity_date),
      teamName,
      teamMembers,
      activityLabels[s.activity_key] ?? s.activity_key,
      s.activity_key,
      amountFromSubmission(s),
      boolStr(s.did_with_teammate),
      s.multiplier ?? 1,
      s.points_per_unit ?? "",
      s.teammate_bonus ?? "",
      s.streak_bonus ?? 0,
      s.base_points ?? "",
      s.points_awarded ?? "",
      s.activity_value_text ?? "",
      s.activity_value_bool === null ? "" : boolStr(s.activity_value_bool),
      s.proof_image_path ?? "",
      s.submitted_by ?? "",
      s.team_id ?? "",
      s.id ?? "",
    ]);
  });

  autoWidth(wsSubs);

  // -----------------------------
  // Sheet 4: Activity Summary (by team + activity)
  // -----------------------------
  const wsSummary = workbook.addWorksheet("Activity Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  wsSummary.addRow([
    "Team Name",
    "Activity Type",
    "Activity Key",
    "Submission Count",
    "Total Amount",
    "Total Points Awarded",
  ]);
  styleHeader(wsSummary.getRow(1));

  // Build summary in JS
  const bucket = new Map<string, any>();
  for (const s of subs ?? []) {
    const teamName = (s as any).teams?.name ?? "";
    const key = `${teamName}||${(s as any).activity_key}`;
    const amount = Number(amountFromSubmission(s as any)) || 0;
    const pts = Number((s as any).points_awarded) || 0;

    if (!bucket.has(key)) {
      bucket.set(key, {
        team_name: teamName,
        activity_key: (s as any).activity_key,
        activity_type:
          activityLabels[(s as any).activity_key] ?? (s as any).activity_key,
        submission_count: 0,
        total_amount: 0,
        total_points: 0,
      });
    }

    const b = bucket.get(key);
    b.submission_count += 1;
    b.total_amount += amount;
    b.total_points += pts;
  }

  const summaryRows = Array.from(bucket.values()).sort((a, b) => {
    if (a.team_name !== b.team_name)
      return a.team_name.localeCompare(b.team_name);
    return b.total_points - a.total_points;
  });

  for (const r of summaryRows) {
    wsSummary.addRow([
      r.team_name,
      r.activity_type,
      r.activity_key,
      r.submission_count,
      r.total_amount,
      r.total_points,
    ]);
  }

  autoWidth(wsSummary);

  // -----------------------------
  // Sheet 5: Activity Rules
  // -----------------------------
  const wsRules = workbook.addWorksheet("Activity Rules", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  wsRules.addRow([
    "Activity Key",
    "Label",
    "Unit",
    "Unit Label",
    "Input Type",
    "Points Per Unit",
    "Teammate Bonus",
    "Weekly Cap",
    "Min Value",
    "Step Value",
    "Active",
  ]);
  styleHeader(wsRules.getRow(1));

  (activityRules ?? []).forEach((r: any) => {
    wsRules.addRow([
      r.activity_key,
      r.label ?? "",
      r.unit ?? "",
      r.unit_label ?? "",
      r.input_type ?? "",
      r.points_per_unit ?? "",
      r.teammate_bonus ?? "",
      r.weekly_cap ?? "No Cap",
      r.min_value ?? "",
      r.step_value ?? "",
      boolStr(r.active),
    ]);
  });

  autoWidth(wsRules);

  // -----------------------------
  // Sheet 6: Weekly History
  // -----------------------------
  const wsHistory = workbook.addWorksheet("Weekly History", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  wsHistory.addRow([
    "Week",
    "Team Name",
    "Tier",
    "Weekly Points",
    "Weekly Goal",
    "Met Goal",
    "Weeks Won Count",
    "Streak Count",
    "Created At",
    "Team ID",
    "ID",
  ]);
  styleHeader(wsHistory.getRow(1));

  (weeklyHistory ?? []).forEach((h: any) => {
    wsHistory.addRow([
      h.week_identifier ?? "",
      h.teams?.name ?? "",
      h.tier ?? "",
      h.weekly_points ?? 0,
      h.weekly_goal ?? "",
      boolStr(h.met_goal),
      h.weeks_won_count ?? 0,
      h.streak_count ?? 0,
      safeStr(h.created_at),
      h.team_id ?? "",
      h.id ?? "",
    ]);
  });

  autoWidth(wsHistory);

  // -----------------------------
  // Sheet 7: Settings
  // -----------------------------
  const wsSettings = workbook.addWorksheet("Settings", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // Tier Settings section
  wsSettings.addRow(["TIER SETTINGS"]);
  styleHeader(wsSettings.getRow(1));
  wsSettings.addRow(["Tier", "Weekly Goal", "Created At", "Updated At"]);
  styleHeader(wsSettings.getRow(2));

  (tierSettings ?? []).forEach((t: any) => {
    wsSettings.addRow([
      t.tier ?? "",
      t.weekly_goal ?? "",
      safeStr(t.created_at),
      safeStr(t.updated_at),
    ]);
  });

  // Add spacing
  wsSettings.addRow([]);
  wsSettings.addRow(["STREAK SETTINGS"]);
  const streakHeaderRow = wsSettings.lastRow!.number;
  styleHeader(wsSettings.getRow(streakHeaderRow));
  wsSettings.addRow(["Daily Bonus Increment", "Max Bonus"]);
  styleHeader(wsSettings.getRow(streakHeaderRow + 1));

  if (streakSettings) {
    wsSettings.addRow([
      streakSettings.daily_bonus_increment ?? "",
      streakSettings.max_streak_bonus ?? "",
    ]);
  }

  autoWidth(wsSettings);

  // Return workbook as file
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="spartan-games.xlsx"`,
    },
  });
}
