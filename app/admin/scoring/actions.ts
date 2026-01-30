"use server";

import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";

type DefaultRule = {
  activity_key: string;
  points_per_unit: number;
  teammate_bonus: number;
};

const DEFAULT_RULES: DefaultRule[] = [
  { activity_key: "sport_practice", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "running", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "cycling", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "gyming", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "swimming", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "sporting", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "calorie_goal", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "races", points_per_unit: 10, teammate_bonus: 15 },
  {
    activity_key: "powerlifting_meet",
    points_per_unit: 10,
    teammate_bonus: 15,
  },
  {
    activity_key: "bodybuilding_show",
    points_per_unit: 10,
    teammate_bonus: 15,
  },
  { activity_key: "win_tournament", points_per_unit: 10, teammate_bonus: 15 },
  { activity_key: "sleep", points_per_unit: 10, teammate_bonus: 15 },
];

function toNumber(v: FormDataEntryValue | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function requireAdmin() {
  const supabase = await createClient(); // ✅ await

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/admin?error=not_authenticated");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  if (!profile?.is_admin) redirect("/admin?error=not_admin");

  return supabase;
}

export async function upsertActivityRule(formData: FormData) {
  const supabase = await requireAdmin();

  const activityKey = String(formData.get("activity_key") ?? "").trim();
  const pointsPerUnit = toNumber(formData.get("points_per_unit"));
  const teammateBonus = toNumber(formData.get("teammate_bonus"));

  if (!activityKey) redirect("/admin?error=missing_activity_key");
  if (!Number.isFinite(pointsPerUnit) || pointsPerUnit < 0)
    redirect("/admin?error=invalid_points_per_unit");
  if (!Number.isFinite(teammateBonus) || teammateBonus < 0)
    redirect("/admin?error=invalid_teammate_bonus");

  const { error } = await supabase.from("activity_rules").upsert(
    {
      activity_key: activityKey,
      points_per_unit: pointsPerUnit,
      teammate_bonus: Math.trunc(teammateBonus),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "activity_key" },
  );

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}

export async function upsertActivityRulesBulk(formData: FormData) {
  const supabase = await requireAdmin();

  const keys = formData.getAll("activity_key[]").map(String);
  const ppuList = formData.getAll("points_per_unit[]");
  const bonusList = formData.getAll("teammate_bonus[]");

  if (keys.length === 0) redirect("/admin?error=no_rows");
  if (keys.length !== ppuList.length || keys.length !== bonusList.length) {
    redirect("/admin?error=bulk_mismatch");
  }

  const payload = keys.map((k, i) => {
    const pointsPerUnit = Number(ppuList[i]);
    const teammateBonus = Number(bonusList[i]);

    if (!k) throw new Error("missing key");
    if (!Number.isFinite(pointsPerUnit) || pointsPerUnit < 0)
      throw new Error("invalid ppu");
    if (!Number.isFinite(teammateBonus) || teammateBonus < 0)
      throw new Error("invalid bonus");

    return {
      activity_key: k,
      points_per_unit: pointsPerUnit,
      teammate_bonus: Math.trunc(teammateBonus),
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from("activity_rules")
    .upsert(payload, { onConflict: "activity_key" });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}

export async function resetActivityRulesDefaults() {
  const supabase = await requireAdmin();

  const payload = DEFAULT_RULES.map((r) => ({
    ...r,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("activity_rules")
    .upsert(payload, { onConflict: "activity_key" });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?reset=1");
}
