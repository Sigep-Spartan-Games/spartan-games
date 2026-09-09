"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const PROOF_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function fail(reason: string): never {
  redirect(`/submit?error=${encodeURIComponent(reason)}`);
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createSubmission(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) fail("Not authenticated");

  const { data: myTeam, error: teamError } = await supabase.rpc("get_my_team_v2");
  if (teamError) fail(teamError.message);
  if (!myTeam || typeof myTeam !== "object") fail("Join a team before submitting");

  const teamId = String((myTeam as { id?: string }).id ?? "");
  const postedTeamId = String(formData.get("team_id") ?? "");
  if (!teamId || postedTeamId !== teamId) fail("Team mismatch");

  const activityKey = String(formData.get("activity_key") ?? "").trim();
  const activityDate = String(formData.get("activity_date") ?? "").trim();
  if (!activityKey || !/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
    fail("Missing or invalid activity fields");
  }

  const valueNumber = optionalNumber(formData.get("activity_value_number"));
  const valueText = String(formData.get("activity_value_text") ?? "").trim() || null;
  const valueBool = formData.get("activity_value_bool") === "on";
  const didWithTeammate = formData.get("did_with_teammate") === "on";

  let proofPath: string | null = null;
  let proofMime: string | null = null;
  let proofSize: number | null = null;
  const proof = formData.get("proof_image");

  if (proof instanceof File && proof.size > 0) {
    const extension = PROOF_EXTENSIONS[proof.type];
    if (!extension) fail("Proof must be a JPG, PNG, WebP, or GIF image");
    if (proof.size > MAX_PROOF_BYTES) fail("Proof image must be 10 MB or smaller");

    proofPath = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
    proofMime = proof.type;
    proofSize = proof.size;

    const { error: uploadError } = await supabase.storage
      .from("submission-proofs")
      .upload(proofPath, proof, { contentType: proof.type, upsert: false });
    if (uploadError) fail(`Image upload failed: ${uploadError.message}`);
  }

  const { error } = await supabase.rpc("create_activity_submission_v2", {
    p_team_id: teamId,
    p_activity_key: activityKey,
    p_activity_date: activityDate,
    p_did_with_teammate: didWithTeammate,
    p_value_number: valueNumber,
    p_value_text: valueText,
    p_value_bool: valueBool,
    p_proof_path: proofPath,
    p_proof_mime: proofMime,
    p_proof_size: proofSize,
  });

  if (error) {
    if (proofPath) await supabase.storage.from("submission-proofs").remove([proofPath]);
    fail(error.message);
  }

  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  revalidatePath("/submit");
  redirect("/leaderboard");
}
