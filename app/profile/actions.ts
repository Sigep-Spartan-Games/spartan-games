"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SuggestedChanges = {
  activity_date?: string;
  activity_units?: number;
  activity_value_text?: string;
  activity_value_bool?: boolean;
  did_with_teammate?: boolean;
};

export async function requestSubmissionEdit(
  submissionId: string,
  teamId: string,
  suggestedChanges: SuggestedChanges,
  reason: string,
) {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!submissionId || !teamId || !suggestedChanges || !reason.trim()) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.from("submission_edit_requests").insert({
    submission_id: submissionId,
    user_id: user.id,
    team_id: teamId,
    suggested_changes: suggestedChanges,
    reason: reason.trim(),
    status: "pending",
  });

  if (error) {
    console.error("Error creating edit request:", error);
    return { error: "Failed to create edit request." };
  }

  revalidatePath("/profile");
  revalidatePath("/admin/submissions");

  return { success: true };
}
