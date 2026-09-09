"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function teamRedirect(error: string): never {
  redirect(`/teams?error=${encodeURIComponent(error)}`);
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) teamRedirect("Sign in required");
  return supabase;
}

function refreshTeams() {
  revalidatePath("/teams");
  revalidatePath("/leaderboard");
  revalidatePath("/submit");
}

export async function createTeamAction(formData: FormData): Promise<void> {
  const supabase = await requireUser();
  const name = String(formData.get("teamName") ?? "").trim();
  const tier = String(formData.get("tier") ?? "").trim().toLowerCase();

  if (name.length < 2 || name.length > 40) teamRedirect("Invalid team name");
  if (!["gold", "purple", "red"].includes(tier)) teamRedirect("Please select a tier");

  const { error } = await supabase.rpc("create_team_v2", {
    p_name: name,
    p_tier_key: tier,
  });
  if (error) teamRedirect(error.message);

  refreshTeams();
  redirect("/teams?success=Team%20created");
}

export async function joinByCodeAction(formData: FormData): Promise<void> {
  const supabase = await requireUser();
  const code = String(formData.get("inviteCode") ?? "").trim().toUpperCase();
  if (code.length < 4 || code.length > 16) teamRedirect("Invalid invite code");

  const { error } = await supabase.rpc("join_team_by_code_v2", { p_code: code });
  if (error) teamRedirect(error.message);

  refreshTeams();
  redirect("/teams?success=Joined%20team");
}

export async function renameTeamAction(formData: FormData): Promise<void> {
  const supabase = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("newName") ?? "").trim();
  if (!teamId) teamRedirect("Missing team id");
  if (name.length < 2 || name.length > 40) teamRedirect("Invalid team name");

  const { error } = await supabase.rpc("rename_team_v2", {
    p_team_id: teamId,
    p_new_name: name,
  });
  if (error) teamRedirect(error.message);

  refreshTeams();
  redirect("/teams?success=Team%20renamed");
}

export async function leaveTeamAction(teamId: string): Promise<void> {
  const supabase = await requireUser();
  if (!teamId) teamRedirect("Missing team id");

  const { error } = await supabase.rpc("leave_team_v2", { p_team_id: teamId });
  if (error) teamRedirect(error.message);

  refreshTeams();
  redirect("/teams?success=Left%20team");
}

export async function changeTierAction(formData: FormData): Promise<void> {
  const supabase = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  const tier = String(formData.get("tier") ?? "").trim().toLowerCase();
  if (!teamId) teamRedirect("Missing team id");
  if (!["gold", "purple", "red"].includes(tier)) teamRedirect("Invalid tier");

  const { error } = await supabase.rpc("change_team_tier_v2", {
    p_team_id: teamId,
    p_tier_key: tier,
  });
  if (error) teamRedirect(error.message);

  refreshTeams();
  redirect("/teams?success=Tier%20updated");
}

export async function leaveTeamActionFormData(formData: FormData): Promise<void> {
  await leaveTeamAction(String(formData.get("teamId") ?? ""));
}
