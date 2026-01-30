// app/admin/submissions/actions.ts
"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

function num(v: FormDataEntryValue | null) {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function isChecked(formData: FormData, name: string) {
  return formData.get(name) !== null;
}

function safeBackToList(teamFilter?: string) {
  if (teamFilter && teamFilter.trim().length) {
    return `/admin/submissions?team=${encodeURIComponent(teamFilter.trim())}`;
  }
  return "/admin/submissions";
}

function editUrl(id: string, qs?: Record<string, string>) {
  const base = `/admin/submissions/${encodeURIComponent(id)}`;
  if (!qs) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (v !== undefined && v !== null && String(v).length)
      params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}

/**
 * Delete a submission.
 * Your DB trigger trg_submission_points_delete will handle team point updates.
 */
export async function deleteSubmission(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/submissions");

  const id = String(formData.get("id") ?? "").trim();
  const teamFilter = String(formData.get("team") ?? "").trim();

  if (!id) redirect("/admin/submissions?error=missing_id");

  const { error } = await supabase.from("submissions").delete().eq("id", id);

  if (error) {
    redirect(
      `/admin/submissions?error=${encodeURIComponent(error.message)}${
        teamFilter ? `&team=${encodeURIComponent(teamFilter)}` : ""
      }`,
    );
  }

  redirect(safeBackToList(teamFilter));
}

/**
 * Admin edit: same fields as submit form:
 * - team_id (optional but supported by UI)
 * - activity_key
 * - amount (activity_units OR activity_value_text OR activity_value_bool)
 * - activity_date
 * - did_with_teammate
 *
 * Then always recompute points from CURRENT activity_rules.
 * points_awarded update triggers your team points update trigger.
 */
export async function updateSubmission(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/submissions");

  const id = String(formData.get("id") ?? "").trim();
  const teamFilter = String(formData.get("teamFilter") ?? "").trim();

  if (!id) redirect("/admin/submissions?error=missing_id");

  // Read form fields (same as submit)
  const team_id_from_form = String(formData.get("team_id") ?? "").trim(); // allow moving teams
  const activity_key = String(formData.get("activity_key") ?? "").trim();
  const activity_date = String(formData.get("activity_date") ?? "").trim();
  const did_with_teammate = isChecked(formData, "did_with_teammate");

  const activity_units_from_form = num(formData.get("activity_units")); // numeric amount
  const activity_value_text = strOrNull(formData.get("activity_value_text")); // meet/show/tournament name
  const activity_value_bool =
    formData.get("activity_value_bool") === null
      ? null
      : isChecked(formData, "activity_value_bool");

  if (!team_id_from_form) {
    redirect(editUrl(id, { error: "missing_team", team: teamFilter }));
  }
  if (!activity_key) {
    redirect(editUrl(id, { error: "missing_activity_key", team: teamFilter }));
  }
  if (!activity_date) {
    redirect(editUrl(id, { error: "missing_date", team: teamFilter }));
  }

  // Load existing to preserve multiplier (and any other non-edit fields)
  const { data: existing, error: existingErr } = await supabase
    .from("submissions")
    .select("id, multiplier")
    .eq("id", id)
    .single();

  if (existingErr || !existing) {
    redirect(safeBackToList(teamFilter));
  }

  // Look up current rule for this activity_key
  const { data: rule, error: ruleErr } = await supabase
    .from("activity_rules")
    .select("points_per_unit, teammate_bonus")
    .eq("activity_key", activity_key)
    .single();

  if (ruleErr || !rule) {
    redirect(
      editUrl(id, { error: "missing_rule_for_activity", team: teamFilter }),
    );
  }

  const points_per_unit = Number(rule.points_per_unit);
  const teammate_bonus = Math.trunc(Number(rule.teammate_bonus));

  if (!Number.isFinite(points_per_unit) || points_per_unit < 0) {
    redirect(
      editUrl(id, { error: "invalid_points_per_unit_rule", team: teamFilter }),
    );
  }
  if (!Number.isFinite(teammate_bonus) || teammate_bonus < 0) {
    redirect(
      editUrl(id, { error: "invalid_teammate_bonus_rule", team: teamFilter }),
    );
  }

  // Determine units:
  // - numeric amount => use it
  // - bool true => 1
  // - text provided => 1
  let activity_units: number | null = activity_units_from_form;

  if (activity_units === null) {
    if (activity_value_bool === true) activity_units = 1;
    else if (activity_value_text) activity_units = 1;
  }

  if (
    activity_units === null ||
    !Number.isFinite(activity_units) ||
    activity_units <= 0
  ) {
    redirect(
      editUrl(id, { error: "invalid_activity_units", team: teamFilter }),
    );
  }

  // Preserve multiplier (or default 1.0)
  const multiplier = Number(existing.multiplier ?? 1.0);
  if (!(multiplier > 0)) {
    redirect(editUrl(id, { error: "invalid_multiplier", team: teamFilter }));
  }

  // Compute integer points (schema requires > 0)
  const base_points = Math.max(1, Math.round(activity_units * points_per_unit));
  const bonus = did_with_teammate ? teammate_bonus : 0;
  const points_awarded = Math.max(
    1,
    Math.round((base_points + bonus) * multiplier),
  );

  const payload = {
    team_id: team_id_from_form,

    activity_key,
    activity_date,
    did_with_teammate,

    // normalized values
    activity_units,
    points_per_unit,
    teammate_bonus,

    // informational fields
    activity: activity_key,
    activity_value_text,
    activity_value_bool,

    // recomputed
    base_points,
    points_awarded,

    // preserved
    multiplier,
  };

  const { error } = await supabase
    .from("submissions")
    .update(payload)
    .eq("id", id);

  if (error) {
    redirect(editUrl(id, { error: error.message, team: teamFilter }));
  }

  redirect(safeBackToList(teamFilter));
}
