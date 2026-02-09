// app/admin/settings/actions.ts
"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export async function startGames() {
  const { supabase } = await requireAdmin("/admin/settings");

  const { error } = await supabase
    .from("game_settings")
    .update({
      registration_open: false,
      submissions_open: true,
      games_started_at: new Date().toISOString(),
      games_ended_at: null,
    })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  redirect(
    "/admin/settings?ok=" +
    encodeURIComponent(
      "Games started: registration closed, submissions opened.",
    ),
  );
}

export async function endGames() {
  const { supabase } = await requireAdmin("/admin/settings");

  const { error } = await supabase
    .from("game_settings")
    .update({
      registration_open: true,
      submissions_open: false,
      games_ended_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  redirect(
    "/admin/settings?ok=" +
    encodeURIComponent(
      "Games ended: registration opened, submissions closed.",
    ),
  );
}

export async function finalizeWeek() {
  const { supabase } = await requireAdmin("/admin/settings");

  const { error } = await supabase
    .from("game_settings")
    .update({
      finalize_requested: true,
    })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  redirect(
    "/admin/settings?ok=" +
    encodeURIComponent(
      "Weekly finalization requested. The background job will process it shortly.",
    ),
  );
}

export async function resetSpartanGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "RESET") {
    redirect(
      "/admin/settings?error=" +
      encodeURIComponent("Confirmation text must be RESET."),
    );
  }

  // First, delete all proof images from storage
  try {
    const { data: files, error: listError } = await supabase.storage
      .from("submission-proofs")
      .list("", { limit: 1000 });

    if (!listError && files && files.length > 0) {
      const filePaths = files.map((f) => f.name);
      const { error: deleteStorageError } = await supabase.storage
        .from("submission-proofs")
        .remove(filePaths);

      if (deleteStorageError) {
        console.error("Error deleting proof images:", deleteStorageError);
        // Continue with reset even if storage cleanup fails
      }
    }
  } catch (e) {
    console.error("Error cleaning up storage:", e);
    // Continue with reset even if storage cleanup fails
  }

  // Delete submissions first (even though teams has ON DELETE CASCADE, this is explicit)
  const { error: subErr } = await supabase
    .from("submissions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (subErr)
    redirect("/admin/settings?error=" + encodeURIComponent(subErr.message));

  // Delete teams (this also cascades to weekly_history)
  const { error: teamErr } = await supabase
    .from("teams")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (teamErr)
    redirect("/admin/settings?error=" + encodeURIComponent(teamErr.message));

  redirect(
    "/admin/settings?ok=" +
    encodeURIComponent("All teams, submissions, and proof images deleted."),
  );
}
