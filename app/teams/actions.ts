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

  // Generate a random 6-char invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Create team directly
  const { error } = await supabase.from("teams").insert({
    name: teamName,
    member1_id: auth.user.id,
    invite_code: inviteCode,
    // defaults: weekly_points=0, total_points=0, etc.
  });

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

  // 1. Find the team
  const { data: team, error: findError } = await supabase
    .from("teams")
    .select("id, member1_id, member2_id")
    .eq("invite_code", code)
    .single();

  if (findError || !team) {
    redirect("/teams?error=Invalid%20invite%20code");
  }

  // 2. Check if full
  if (team.member1_id && team.member2_id) {
    redirect("/teams?error=Team%20is%20full");
  }

  // 3. Determine which slot to take
  // The constraint implies member1!=member2. 
  // If member1 is empty (rare but possible if creator left), take it. Else take member2.
  const updateData: { member1_id?: string; member2_id?: string } = {};
  if (!team.member1_id) {
    updateData.member1_id = auth.user.id;
  } else if (!team.member2_id) {
    updateData.member2_id = auth.user.id;
  }

  const { error: updateError } = await supabase
    .from("teams")
    .update(updateData)
    .eq("id", team.id);

  if (updateError) redirect(`/teams?error=${encodeURIComponent(updateError.message)}`);

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

  const { error } = await supabase
    .from("teams")
    .update({ name: newName })
    .eq("id", teamId);

  if (error) redirect(`/teams?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/teams");
  redirect("/teams?success=Team%20renamed");
}

export async function leaveTeamAction(teamId: string): Promise<void> {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/teams?error=Sign%20in%20required");

  // Fetch current membership
  const { data: team, error: fetchError } = await supabase
    .from("teams")
    .select("id, member1_id, member2_id")
    .eq("id", teamId)
    .single();

  if (fetchError || !team) redirect("/teams?error=Team%20not%20found");

  const userId = auth.user.id;
  const isMember1 = team.member1_id === userId;
  const isMember2 = team.member2_id === userId;

  if (!isMember1 && !isMember2) redirect("/teams?error=Not%20a%20member");

  // If this is the last member, delete the team? Or just leave it empty?
  // Usually if last member leaves, we destroy the team to clean up.
  // If not last member, we just set our slot to null.

  const otherMemberExists = isMember1 ? !!team.member2_id : !!team.member1_id;

  if (!otherMemberExists) {
    // We are the last one. Delete the team.
    const { error: delError } = await supabase.from("teams").delete().eq("id", teamId);
    if (delError) redirect(`/teams?error=${encodeURIComponent(delError.message)}`);
  } else {
    // Just vacate our slot
    const updateData = isMember1 ? { member1_id: null } : { member2_id: null };
    const { error: upError } = await supabase.from("teams").update(updateData).eq("id", teamId);
    if (upError) redirect(`/teams?error=${encodeURIComponent(upError.message)}`);
  }

  revalidatePath("/teams");
  redirect("/teams?success=Left%20team");
}
