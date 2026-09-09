"use server";

import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getInputTypeForActivityUnit,
  getStepValueForActivityUnit,
  normalizeActivityUnit,
} from "@/lib/activity-units";

function toNumber(v: FormDataEntryValue | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function toStringOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function toNumberOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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

  const { data: existingRules, error: existingError } = await supabase
    .from("current_activity_rules")
    .select("*");
  if (existingError) redirect(`/admin?error=${encodeURIComponent(existingError.message)}`);

  const payload = keys.map((k, i) => {
    const pointsPerUnit = Number(ppuList[i]);
    const teammateBonus = Number(bonusList[i]);
    const existing = existingRules?.find((rule) => rule.activity_key === k);

    if (!k) throw new Error("missing key");
    if (!Number.isFinite(pointsPerUnit) || pointsPerUnit <= 0)
      throw new Error("invalid ppu");
    if (!Number.isFinite(teammateBonus) || teammateBonus <= 0)
      throw new Error("invalid bonus");
    if (!existing) throw new Error(`missing existing rule: ${k}`);

    return {
      activity_key: k,
      points_per_unit: pointsPerUnit,
      teammate_bonus: teammateBonus,
      label: existing.label,
      input_type: existing.input_type,
      unit_label: existing.unit_label,
      description: existing.description,
      min_value: existing.min_value,
      step_value: existing.step_value,
      weekly_cap: existing.weekly_cap,
    };
  });

  const { error } = await supabase.rpc("save_activity_rules_bulk_v2", {
    p_rules: payload,
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}

export async function updateActivityRule(formData: FormData) {
  const supabase = await requireAdmin();

  const originalKey = String(
    formData.get("original_activity_key") ?? "",
  ).trim();
  const activityKey = String(formData.get("activity_key") ?? "").trim();

  const pointsPerUnit = toNumber(formData.get("points_per_unit"));
  const teammateBonus = toNumber(formData.get("teammate_bonus"));

  const label = toStringOrNull(formData.get("label"));
  const unitLabel = normalizeActivityUnit(
    toStringOrNull(formData.get("unit_label")),
  );
  const normalizedInputType = getInputTypeForActivityUnit(unitLabel);
  const weeklyCap = toNumberOrNull(formData.get("weekly_cap"));

  if (!activityKey) redirect("/admin?error=missing_activity_key");
  if (!Number.isFinite(pointsPerUnit) || pointsPerUnit <= 0)
    redirect("/admin?error=invalid_points_per_unit");
  if (!Number.isFinite(teammateBonus) || teammateBonus <= 0)
    redirect("/admin?error=invalid_teammate_bonus");

  const targetKey = originalKey || activityKey;
  if (targetKey !== activityKey) redirect("/admin?error=activity_keys_cannot_be_renamed");

  const { error } = await supabase.rpc("save_activity_rule_v2", {
    p_activity_key: targetKey,
    p_label: label ?? targetKey,
    p_measurement_type: normalizedInputType,
    p_unit_label: unitLabel,
    p_description: toStringOrNull(formData.get("description")),
    p_min_value: 0,
    p_step_value: getStepValueForActivityUnit(unitLabel),
    p_points_per_unit: pointsPerUnit,
    p_teammate_multiplier: teammateBonus,
    p_weekly_cap_points: weeklyCap != null ? Math.trunc(weeklyCap) : null,
  });

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
  const unitLabel = normalizeActivityUnit(
    toStringOrNull(formData.get("unit_label")),
  );
  const normalizedInputType = getInputTypeForActivityUnit(unitLabel);
  const weeklyCap = toNumberOrNull(formData.get("weekly_cap"));

  // If activity_key is empty, generate it from the label
  if (!activityKey && label) {
    activityKey = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // remove special chars
      .replace(/\s+/g, "_"); // spaces to underscores
  } else {
    activityKey = activityKey.replace(/\s+/g, "_").toLowerCase();
  }

  if (!activityKey) redirect("/admin?error=missing_activity_key");
  if (!Number.isFinite(pointsPerUnit) || pointsPerUnit <= 0)
    redirect("/admin?error=invalid_points_per_unit");
  if (!Number.isFinite(teammateBonus) || teammateBonus <= 0)
    redirect("/admin?error=invalid_teammate_bonus");

  // Check if it already exists
  const { data: existing } = await supabase
    .from("current_activity_rules")
    .select("activity_key")
    .eq("activity_key", activityKey)
    .single();

  if (existing) {
    redirect("/admin?error=activity_already_exists");
  }

  const { error } = await supabase.rpc("save_activity_rule_v2", {
    p_activity_key: activityKey,
    p_label: label ?? activityKey,
    p_measurement_type: normalizedInputType,
    p_unit_label: unitLabel,
    p_description: toStringOrNull(formData.get("description")),
    p_min_value: 0,
    p_step_value: getStepValueForActivityUnit(unitLabel),
    p_points_per_unit: pointsPerUnit,
    p_teammate_multiplier: teammateBonus,
    p_weekly_cap_points: weeklyCap != null ? Math.trunc(weeklyCap) : null,
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}

export async function deleteActivityRule(formData: FormData) {
  const supabase = await requireAdmin();

  const activityKey = String(formData.get("activity_key") ?? "").trim();
  if (!activityKey) redirect("/admin?error=missing_activity_key");

  const { error } = await supabase.rpc("archive_activity_v2", {
    p_activity_key: activityKey,
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  redirect("/admin?saved=1");
}
