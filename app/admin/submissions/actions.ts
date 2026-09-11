"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

function numberOrNull(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: FormDataEntryValue | null) {
  const parsed = String(value ?? "").trim();
  return parsed || null;
}

function listUrl(teamFilter?: string) {
  return teamFilter ? `/admin/submissions?team=${encodeURIComponent(teamFilter)}` : "/admin/submissions";
}

function editUrl(id: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/admin/submissions/${encodeURIComponent(id)}?${search.toString()}`;
}

function refreshSubmissionViews() {
  revalidatePath("/admin/submissions");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}

/** Void the record and ledger events while retaining an auditable submission row. */
export async function deleteSubmission(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/submissions");
  const id = String(formData.get("id") ?? "").trim();
  const teamFilter = String(formData.get("team") ?? "").trim();
  if (!id) redirect("/admin/submissions?error=missing_id");

  const { error } = await supabase.rpc("void_submission_v2", {
    p_submission_id: id,
  });
  if (error) {
    redirect(`${listUrl(teamFilter)}${teamFilter ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  }

  refreshSubmissionViews();
  redirect(listUrl(teamFilter));
}

/** Approve a member deletion request and atomically void its submission. */
export async function approveDeletionRequest(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/submissions");
  const requestId = String(formData.get("request_id") ?? "").trim();
  const teamFilter = String(formData.get("team") ?? "").trim();
  if (!requestId) redirect("/admin/submissions?error=missing_request_id");

  const { error } = await supabase.rpc("resolve_submission_edit_request_v2", {
    p_request_id: requestId,
    p_status: "approved",
    p_resolution_note: "Deletion approved by administrator",
  });
  if (error) {
    redirect(
      `${listUrl(teamFilter)}${teamFilter ? "&" : "?"}error=${encodeURIComponent(error.message)}`,
    );
  }

  refreshSubmissionViews();
  redirect(listUrl(teamFilter));
}

export async function updateSubmission(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/submissions");
  const id = String(formData.get("id") ?? "").trim();
  const teamFilter = String(formData.get("teamFilter") ?? "").trim();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const teamId = String(formData.get("team_id") ?? "").trim();
  const activityKey = String(formData.get("activity_key") ?? "").trim();
  const activityDate = String(formData.get("activity_date") ?? "").trim();

  const backParams: Record<string, string> = {};
  if (teamFilter) backParams.team = teamFilter;
  if (requestId) backParams.requestId = requestId;
  if (!id) redirect("/admin/submissions?error=missing_id");
  if (!teamId || !activityKey || !/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
    redirect(editUrl(id, { ...backParams, error: "missing_or_invalid_fields" }));
  }

  const valueNumber = numberOrNull(formData.get("activity_value_number"));
  const valueText = stringOrNull(formData.get("activity_value_text"));
  const valueBool = formData.get("activity_value_bool") !== null;
  const didWithTeammate = formData.get("did_with_teammate") !== null;

  const { error } = await supabase.rpc("admin_update_submission_v2", {
    p_submission_id: id,
    p_team_id: teamId,
    p_activity_key: activityKey,
    p_activity_date: activityDate,
    p_did_with_teammate: didWithTeammate,
    p_value_number: valueNumber,
    p_value_text: valueText,
    p_value_bool: valueBool,
  });
  if (error) redirect(editUrl(id, { ...backParams, error: error.message }));

  if (requestId) {
    const { error: resolveError } = await supabase.rpc("resolve_submission_edit_request_v2", {
      p_request_id: requestId,
      p_status: "approved",
      p_resolution_note: "Approved through the admin submission editor",
    });
    if (resolveError) redirect(editUrl(id, { ...backParams, error: resolveError.message }));
  }

  refreshSubmissionViews();
  redirect(listUrl(teamFilter));
}

export async function resolveEditRequest(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/submissions");
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!requestId || !["approved", "rejected"].includes(status)) {
    return { success: false, error: "Missing or invalid request resolution" };
  }

  const { error } = await supabase.rpc("resolve_submission_edit_request_v2", {
    p_request_id: requestId,
    p_status: status,
    p_resolution_note: status === "rejected" ? "Rejected by administrator" : null,
  });
  if (error) return { success: false, error: error.message };

  refreshSubmissionViews();
  return { success: true };
}
