"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readTargetUserId(formData: FormData): string {
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!UUID_PATTERN.test(targetUserId)) {
    redirect(
      "/admin/settings?error=" + encodeURIComponent("Select a valid user account."),
    );
  }

  return targetUserId;
}

function redirectWithError(message: string): never {
  redirect("/admin/settings?error=" + encodeURIComponent(message));
}

function redirectWithSuccess(message: string): never {
  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=" + encodeURIComponent(message));
}

export async function grantAdminAccess(formData: FormData) {
  const targetUserId = readTargetUserId(formData);
  const { supabase } = await requireAdmin("/admin/settings");

  const { error } = await supabase.rpc("grant_admin_access_v2", {
    p_user_id: targetUserId,
  });

  if (error) redirectWithError(error.message);
  redirectWithSuccess("Administrator access granted.");
}

export async function revokeAdminAccess(formData: FormData) {
  const targetUserId = readTargetUserId(formData);
  const { supabase } = await requireAdmin("/admin/settings");

  const { error } = await supabase.rpc("revoke_admin_access_v2", {
    p_user_id: targetUserId,
  });

  if (error) redirectWithError(error.message);
  redirectWithSuccess("Administrator access removed.");
}

export async function transferAdminOwnership(formData: FormData) {
  const targetUserId = readTargetUserId(formData);
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "TRANSFER") {
    redirectWithError("Type TRANSFER to confirm the ownership change.");
  }

  const { supabase } = await requireAdmin("/admin/settings");
  const { error } = await supabase.rpc("transfer_admin_ownership_v2", {
    p_user_id: targetUserId,
  });

  if (error) redirectWithError(error.message);
  redirectWithSuccess(
    "Ownership transferred successfully. You remain an administrator.",
  );
}
