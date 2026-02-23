// app/admin/submissions/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

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

  revalidatePath("/admin/submissions");
  revalidatePath("/profile");
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

  const requestId = String(formData.get("request_id") ?? "").trim();
  const editQueryParams: Record<string, string> = {};
  if (teamFilter) editQueryParams.team = teamFilter;
  if (requestId) editQueryParams.requestId = requestId;

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
    redirect(editUrl(id, { ...editQueryParams, error: "missing_team" }));
  }
  if (!activity_key) {
    redirect(
      editUrl(id, { ...editQueryParams, error: "missing_activity_key" }),
    );
  }
  if (!activity_date) {
    redirect(editUrl(id, { ...editQueryParams, error: "missing_date" }));
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
      editUrl(id, { ...editQueryParams, error: "missing_rule_for_activity" }),
    );
  }

  const points_per_unit = Number(rule.points_per_unit);
  const teammate_bonus = Number(rule.teammate_bonus);

  if (!Number.isFinite(points_per_unit) || points_per_unit < 0) {
    redirect(
      editUrl(id, {
        ...editQueryParams,
        error: "invalid_points_per_unit_rule",
      }),
    );
  }
  if (!Number.isFinite(teammate_bonus) || teammate_bonus < 0) {
    redirect(
      editUrl(id, { ...editQueryParams, error: "invalid_teammate_bonus_rule" }),
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
      editUrl(id, { ...editQueryParams, error: "invalid_activity_units" }),
    );
  }

  // Preserve multiplier
  const multiplier = Number(existing.multiplier ?? 1.0);
  if (!(multiplier > 0)) {
    redirect(editUrl(id, { ...editQueryParams, error: "invalid_multiplier" }));
  }

  // Compute integer points exactly like submit/actions.ts
  const base_points = Math.max(1, Math.floor(activity_units * points_per_unit));

  let computedPoints = Math.floor(points_per_unit * activity_units);
  if (did_with_teammate) {
    computedPoints = Math.floor(computedPoints * teammate_bonus);
  }

  // Apply admin multiplier (usually 1.0)
  computedPoints = Math.floor(computedPoints * multiplier);

  const points_awarded = Math.max(1, computedPoints);

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
    redirect(editUrl(id, { ...editQueryParams, error: error.message }));
  }

  // If there's a request ID provided (e.g. from the edit request workflow), approve it
  if (requestId) {
    const adminClient = createAdminClient();
    await adminClient
      .from("submission_edit_requests")
      .update({ status: "approved" })
      .eq("id", requestId);
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/profile");
  redirect(safeBackToList(teamFilter));
}

export async function resolveEditRequest(formData: FormData) {
  console.log(
    "resolveEditRequest triggered with formData",
    Object.fromEntries(formData.entries()),
  );
  const { supabase } = await requireAdmin("/admin/submissions");
  const adminClient = createAdminClient();

  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const teamFilter = String(formData.get("team") ?? "").trim();

  if (!requestId || !status) {
    redirect("/admin/submissions?error=missing_request_info");
  }

  const { error } = await adminClient
    .from("submission_edit_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) {
    redirect(
      `/admin/submissions?error=${encodeURIComponent(error.message)}${teamFilter ? `&team=${encodeURIComponent(teamFilter)}` : ""}`,
    );
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/profile");
  return { success: true };
}
