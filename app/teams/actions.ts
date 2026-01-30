"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

async function requireRegistrationOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data: settings, error } = await supabase
    .from("game_settings")
    .select("registration_open")
    .eq("id", true)
    .single();

  if (error) {
    // fail-closed is safer for admin control
    redirect(
      `/teams?error=${encodeURIComponent("Could not load game settings")}`,
    );
  }

  if (!settings?.registration_open) {
    redirect(
      `/teams?error=${encodeURIComponent("Team registration is closed")}`,
    );
  }
}

export async function createTeamAction(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const teamName = String(formData.get("teamName") ?? "").trim();
  if (teamName.length < 2 || teamName.length > 40) {
    redirect("/teams?error=Invalid%20team%20name");
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/teams?error=Sign%20in%20required");

  // ✅ enforce registration open
  await requireRegistrationOpen(supabase);

  const { error } = await supabase.rpc("create_team", { p_name: teamName });
  if (error) redirect(`/teams?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/teams");
  redirect("/teams?success=Team%20created");
}

export async function joinByCodeAction(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const code = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  if (code.length < 4) redirect("/teams?error=Invalid%20invite%20code");

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/teams?error=Sign%20in%20required");

  // ✅ enforce registration open
  await requireRegistrationOpen(supabase);

  const { error } = await supabase.rpc("join_team_by_code", { p_code: code });
  if (error) redirect(`/teams?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/teams");
  redirect("/teams?success=Joined%20team");
}

export async function renameTeamAction(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const teamId = String(formData.get("teamId") ?? "");
  const newName = String(formData.get("newName") ?? "").trim();

  if (!teamId) redirect("/teams?error=Missing%20team%20id");
  if (newName.length < 2 || newName.length > 40)
    redirect("/teams?error=Invalid%20team%20name");

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/teams?error=Sign%20in%20required");

  const { error } = await supabase.rpc("rename_team", {
    p_team_id: teamId,
    p_new_name: newName,
  });
  if (error) redirect(`/teams?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/teams");
  redirect("/teams?success=Team%20renamed");
}

export async function leaveTeamAction(teamId: string): Promise<void> {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/teams?error=Sign%20in%20required");

  const { error } = await supabase.rpc("leave_team", { p_team_id: teamId });
  if (error) redirect(`/teams?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/teams");
  redirect("/teams?success=Left%20team");
}
