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

export async function resetSpartanGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "RESET") {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("Confirmation text must be RESET."),
    );
  }

  // Delete submissions first (even though teams has ON DELETE CASCADE, this is explicit)
  const { error: subErr } = await supabase
    .from("submissions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (subErr)
    redirect("/admin/settings?error=" + encodeURIComponent(subErr.message));

  const { error: teamErr } = await supabase
    .from("teams")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (teamErr)
    redirect("/admin/settings?error=" + encodeURIComponent(teamErr.message));

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent("All teams and submissions deleted."),
  );
}
