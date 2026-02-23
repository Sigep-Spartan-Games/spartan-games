"use server";

import { createClient } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function requestSubmissionEdit(
  submissionId: string,
  teamId: string,
  expectedValues: string,
  reason: string,
) {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!submissionId || !teamId || !expectedValues.trim() || !reason.trim()) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.from("submission_edit_requests").insert({
    submission_id: submissionId,
    user_id: user.id,
    team_id: teamId,
    expected_values: expectedValues.trim(),
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
