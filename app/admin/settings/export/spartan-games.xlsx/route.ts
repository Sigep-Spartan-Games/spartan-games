// app/admin/settings/export/spartan-games.xlsx/route.ts
// export const runtime = "nodejs"; // IMPORTANT: ExcelJS must run in Node, not Edge

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

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

const ACTIVITY_LABELS: Record<string, string> = {
  sport_practice: "Sport practice (hours)",
  running: "Running (miles)",
  cycling: "Cycling (miles)",
  gyming: "Gyming (hours)",
  swimming: "Swimming (laps)",
  sporting: "Sporting (number of games)",
  calorie_goal: "Hitting Calorie Goal (yes/no)",
  races: "Races (count)",
  powerlifting_meet: "Powerlifting meet (name)",
  bodybuilding_show: "Bodybuilding show (name)",
  win_tournament: "Win a tournament (name)",
  sleep: "Sleep (hours)",
};

function isoDate(d: any) {
  if (!d) return "";
  // already YYYY-MM-DD from Postgres date in most cases
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
  // Prefer activity_units, fallback to activity_value_number for older rows,
  // or bool true => 1, otherwise blank
  const amt =
    s.activity_units ??
    s.activity_value_number ??
    (s.activity_value_bool === true ? 1 : null);

  return amt ?? "";
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

  const { supabase } = guard;

  // Teams
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select(
      "id,name,points,member1_name,member2_name,invite_code,member1_id,member2_id,created_at",
    )
    .order("points", { ascending: false })
    .order("name", { ascending: true });

  if (teamsErr) return new NextResponse(teamsErr.message, { status: 500 });

  // Submissions (+ team join for names)
  const { data: subs, error: subsErr } = await supabase
    .from("submissions")
    .select(
      `
      id,
      created_at,
      activity_date,
      team_id,
      teams ( name, member1_name, member2_name ),
      submitted_by,
      activity_key,
      activity,
      did_with_teammate,
      multiplier,
      activity_units,
      activity_value_number,
      activity_value_text,
      activity_value_bool,
      points_per_unit,
      teammate_bonus,
      base_points,
      points_awarded
    `,
    )
    .order("created_at", { ascending: false });

  if (subsErr) return new NextResponse(subsErr.message, { status: 500 });

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
    "Points",
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
      t.points ?? 0,
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
    "Points",
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
      t.points ?? 0,
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
    "Base Points",
    "Points Awarded",
    "Amount Text",
    "Amount Bool",
    "Submitted By",
    "Team ID",
    "Submission ID",
  ]);
  styleHeader(wsSubs.getRow(1));

  (subs ?? []).forEach((s: any) => {
    const teamName = s.teams?.name ?? "";
    const teamMembers = [s.teams?.member1_name, s.teams?.member2_name]
      .filter(Boolean)
      .join(" & ");

    wsSubs.addRow([
      safeStr(s.created_at),
      isoDate(s.activity_date),
      teamName,
      teamMembers,
      ACTIVITY_LABELS[s.activity_key] ?? s.activity_key,
      s.activity_key,
      amountFromSubmission(s),
      boolStr(s.did_with_teammate),
      s.multiplier ?? 1,
      s.points_per_unit ?? "",
      s.teammate_bonus ?? "",
      s.base_points ?? "",
      s.points_awarded ?? "",
      s.activity_value_text ?? "",
      s.activity_value_bool === null ? "" : boolStr(s.activity_value_bool),
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
          ACTIVITY_LABELS[(s as any).activity_key] ?? (s as any).activity_key,
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
    // sort by team then points desc
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
