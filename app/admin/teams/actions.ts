// app/admin/teams/actions.ts
"use server";

import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

export async function deleteTeam(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/teams");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/teams?error=missing_id");

  // NOTE: if you have FK constraints (submissions -> teams), this may fail unless you cascade or delete submissions first.
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error)
    redirect(`/admin/teams?error=${encodeURIComponent(error.message)}`);

  redirect("/admin/teams");
}

export async function updateTeamTier(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/teams");
  const id = String(formData.get("id") ?? "");
  const tier = String(formData.get("tier") ?? "").toLowerCase();

  if (!id) throw new Error("Missing team ID");
  if (!["gold", "purple", "red"].includes(tier)) throw new Error("Invalid tier");

  const { error } = await supabase.from("teams").update({ tier }).eq("id", id);

  if (error) throw new Error(error.message);

  // Revalidate instead of redirect for smoother client-side update
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/teams");
}

