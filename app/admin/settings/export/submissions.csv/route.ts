/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/settings/export/submissions.csv/route.ts
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

  // Fetch current versioned scoring rules for dynamic labels.
  const { data: activityRules } = await supabase
    .from("current_activity_rules")
    .select("activity_key, label, unit_label, unit");

  // Build the activity label map.
  const activityLabels: Record<string, string> = {};
  for (const rule of activityRules ?? []) {
    const label = rule.label || rule.activity_key;
    const unitLabel = rule.unit_label || rule.unit || "";
    activityLabels[rule.activity_key] = unitLabel ? `${label} (${unitLabel})` : label;
  }

  const [submissionsResult, rostersResult] = await Promise.all([
    supabase
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
      .order("created_at", { ascending: false }),
    supabase
      .from("team_memberships")
      .select(
        "team_id,user_id,role,display_name:display_name_snapshot,joined_at",
      )
      .is("left_at", null),
  ]);

  const subs = submissionsResult.data;
  const error = submissionsResult.error ?? rostersResult.error;

  if (error) return new NextResponse(error.message, { status: 500 });

  const rosterMap = buildTeamRosterMap(
    (rostersResult.data ?? []) as CanonicalRosterRow[],
  );

  const rows = (subs ?? []).map((s: any) => {
    const amount =
      s.activity_value_number ??
      (s.activity_value_bool ? 1 : "");

    const teamName = s.teams?.name ?? "";
    const roster = rosterMap.get(s.team_id) ?? EMPTY_TEAM_ROSTER;
    const teamMembers = [roster.captain_name, roster.teammate_name]
      .filter(Boolean)
      .join(" & ");

    return {
      created_at: s.created_at,
      activity_date: s.activity_date,
      team_name: teamName,
      team_members: teamMembers,
      team_id: s.team_id,
      submitted_by: s.submitted_by,

      activity_type: activityLabels[s.activity_key] ?? s.activity_key,
      activity_key: s.activity_key,

      amount, // normalized
      did_with_teammate: s.did_with_teammate ? "TRUE" : "FALSE",
      multiplier: s.multiplier,

      points_per_unit: s.points_per_unit,
      teammate_bonus: s.teammate_bonus,
      streak_bonus: s.streak_bonus ?? 0,
      base_points: s.base_points,
      points_awarded: s.points_awarded,

      amount_text: s.activity_value_text ?? "",
      amount_bool:
        s.activity_value_bool === null
          ? ""
          : s.activity_value_bool
            ? "TRUE"
            : "FALSE",

      proof_image_path: s.proof_image_path ?? "",

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
    "streak_bonus",
    "base_points",
    "points_awarded",

    "amount_text",
    "amount_bool",

    "proof_image_path",

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
