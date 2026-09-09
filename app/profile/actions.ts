"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SuggestedChanges = {
  activity_key?: string;
  activity_date?: string;
  activity_units?: number;
  activity_value_text?: string;
  activity_value_bool?: boolean;
  did_with_teammate?: boolean;
  is_deletion?: boolean;
};

export async function requestSubmissionEdit(
  submissionId: string,
  _teamId: string,
  suggestedChanges: SuggestedChanges,
  reason: string,
) {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!submissionId || !suggestedChanges || !reason.trim()) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.rpc("request_submission_edit_v2", {
    p_submission_id: submissionId,
    p_suggested_changes: suggestedChanges,
    p_reason: reason.trim(),
  });

  if (error) {
    console.error("Error creating edit request:", error);
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/admin/submissions");

  return { success: true };
}
