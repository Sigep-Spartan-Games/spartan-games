"use server";

import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";
import { ActivityRule } from "@/lib/types";

function toNumber(v: FormDataEntryValue | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function toStringOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
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

// NOTE: This bulk function is simplified as managing full complex objects in bulk is difficult UI-wise.
// We'll rely on individual updates for complex edits.
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

export async function updateActivityRule(formData: FormData) {
  const supabase = await requireAdmin();

  const originalKey = String(formData.get("original_activity_key") ?? "").trim();
  const activityKey = String(formData.get("activity_key") ?? "").trim();

  const pointsPerUnit = toNumber(formData.get("points_per_unit"));
  const teammateBonus = toNumber(formData.get("teammate_bonus"));

  const label = toStringOrNull(formData.get("label"));
  const inputType = toStringOrNull(formData.get("input_type"));
  const unitLabel = toStringOrNull(formData.get("unit_label"));

  const active = formData.get("active") === "on";

  if (!activityKey) redirect("/admin?error=missing_activity_key");
  if (!Number.isFinite(pointsPerUnit) || pointsPerUnit < 0)
    redirect("/admin?error=invalid_points_per_unit");
  if (!Number.isFinite(teammateBonus) || teammateBonus < 0)
    redirect("/admin?error=invalid_teammate_bonus");

  const payload: Partial<ActivityRule> = {
    points_per_unit: pointsPerUnit,
    teammate_bonus: Math.trunc(teammateBonus),
    label: label,
    input_type: inputType as any,
    unit_label: unitLabel,
    active: active,
    updated_at: new Date().toISOString(),
  };

  const targetKey = originalKey || activityKey;

  const { error } = await supabase.from("activity_rules")
    .update(payload)
    .eq("activity_key", targetKey);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}

export async function resetActivityRulesDefaults() {
  redirect("/admin?error=not_implemented");
}

export async function addActivityRule(formData: FormData) {
  const supabase = await requireAdmin();

  let activityKey = String(formData.get("activity_key") ?? "").trim();
  const pointsPerUnit = toNumber(formData.get("points_per_unit"));
  const teammateBonus = toNumber(formData.get("teammate_bonus"));
  const label = toStringOrNull(formData.get("label"));
  const inputType = toStringOrNull(formData.get("input_type"));
  const unitLabel = toStringOrNull(formData.get("unit_label"));

  activityKey = activityKey.replace(/\s+/g, "_").toLowerCase();

  if (!activityKey) redirect("/admin?error=missing_activity_key");
  if (!Number.isFinite(pointsPerUnit) || pointsPerUnit < 0)
    redirect("/admin?error=invalid_points_per_unit");
  if (!Number.isFinite(teammateBonus) || teammateBonus < 0)
    redirect("/admin?error=invalid_teammate_bonus");

  // Check if it already exists
  const { data: existing } = await supabase
    .from("activity_rules")
    .select("activity_key")
    .eq("activity_key", activityKey)
    .single();

  if (existing) {
    redirect("/admin?error=activity_already_exists");
  }

  const { error } = await supabase.from("activity_rules").insert({
    activity_key: activityKey,
    points_per_unit: pointsPerUnit,
    teammate_bonus: Math.trunc(teammateBonus),
    label: label ?? activityKey,
    input_type: inputType,
    unit_label: unitLabel,
    active: true, // Default to active
    updated_at: new Date().toISOString(),
    min_value: 0,
    step_value: inputType === 'number' ? 1 : null,
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}

export async function deleteActivityRule(formData: FormData) {
  const supabase = await requireAdmin();

  const activityKey = String(formData.get("activity_key") ?? "").trim();
  if (!activityKey) redirect("/admin?error=missing_activity_key");

  const { error } = await supabase
    .from("activity_rules")
    .delete()
    .eq("activity_key", activityKey);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}
