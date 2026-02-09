// app/admin/settings/export/teams.csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { supabase } = guard;

  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      "id,name,total_points,weekly_points,member1_name,member2_name,invite_code,member1_id,member2_id,created_at,tier,streak_count,last_activity_date,weeks_won",
    )
    .order("total_points", { ascending: false })
    .order("name", { ascending: true });

  if (error) return new NextResponse(error.message, { status: 500 });

  const rows = (teams ?? []).map((t) => ({
    team_name: t.name,
    total_points: t.total_points ?? 0,
    weekly_points: t.weekly_points ?? 0,
    tier: t.tier ?? "",
    streak_count: t.streak_count ?? 0,
    last_activity_date: t.last_activity_date ?? "",
    weeks_won: weeksWonStr(t.weeks_won),
    member1_name: t.member1_name ?? "",
    member2_name: t.member2_name ?? "",
    invite_code: t.invite_code ?? "",
    team_id: t.id,
    member1_id: t.member1_id ?? "",
    member2_id: t.member2_id ?? "",
    created_at: t.created_at,
  }));

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
