// app/admin/settings/export/teams.csv/route.ts
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

export async function GET() {
  const guard = await requireAdminForRoute();
  if (!guard.ok)
    return new NextResponse("Unauthorized", { status: guard.status });

  const { supabase } = guard;

  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      "id,name,points,member1_name,member2_name,invite_code,member1_id,member2_id,created_at",
    )
    .order("points", { ascending: false })
    .order("name", { ascending: true });

  if (error) return new NextResponse(error.message, { status: 500 });

  const rows = (teams ?? []).map((t) => ({
    team_name: t.name,
    points: t.points,
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
    "points",
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
