// app/admin/settings/export/submissions.csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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

// Keep consistent with your labels everywhere
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

export async function GET() {
  const guard = await requireAdminForRoute();
  if (!guard.ok)
    return new NextResponse("Unauthorized", { status: guard.status });

  const { supabase } = guard;

  // Join teams to include team name + member names for auditing
  const { data: subs, error } = await supabase
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

  if (error) return new NextResponse(error.message, { status: 500 });

  const rows = (subs ?? []).map((s: any) => {
    // Prefer activity_units, but fall back to activity_value_number for older rows
    const amount =
      s.activity_units ??
      s.activity_value_number ??
      (s.activity_value_bool ? 1 : "");

    const teamName = s.teams?.name ?? "";
    const teamMembers = [s.teams?.member1_name, s.teams?.member2_name]
      .filter(Boolean)
      .join(" & ");

    return {
      created_at: s.created_at,
      activity_date: s.activity_date,
      team_name: teamName,
      team_members: teamMembers,
      team_id: s.team_id,
      submitted_by: s.submitted_by,

      activity_type: ACTIVITY_LABELS[s.activity_key] ?? s.activity_key,
      activity_key: s.activity_key,

      amount, // normalized
      did_with_teammate: s.did_with_teammate ? "TRUE" : "FALSE",
      multiplier: s.multiplier,

      points_per_unit: s.points_per_unit,
      teammate_bonus: s.teammate_bonus,
      base_points: s.base_points,
      points_awarded: s.points_awarded,

      amount_text: s.activity_value_text ?? "",
      amount_bool:
        s.activity_value_bool === null
          ? ""
          : s.activity_value_bool
            ? "TRUE"
            : "FALSE",

      submission_id: s.id,
    };
  });

  const headers = [
    "created_at",
    "activity_date",
    "team_name",
    "team_members",
    "team_id",
    "submitted_by",

    "activity_type",
    "activity_key",

    "amount",
    "did_with_teammate",
    "multiplier",

    "points_per_unit",
    "teammate_bonus",
    "base_points",
    "points_awarded",

    "amount_text",
    "amount_bool",

    "submission_id",
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
      "Content-Disposition": `attachment; filename="spartan-games-submissions.csv"`,
    },
  });
}
