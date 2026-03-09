// app/admin/settings/finalize-week-actions.ts
"use server";

import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

/**
 * Admin action: finalizes the previous week.
 *
 * Sets `finalize_requested = true` on game_settings, which fires the
 * database trigger `trg_finalize_previous_week`.  The SQL function handles
 * per-tier winners, weekly history recording, points roll-up, and reset —
 * all inside a single transaction.
 */
export async function finalizeWeekWithHistory() {
  const { supabase } = await requireAdmin("/admin/settings");

  try {
    // Check current state
    const { data: settings } = await supabase
      .from("game_settings")
      .select("finalize_requested, last_week_finalized")
      .eq("id", true)
      .single();

    if (settings?.finalize_requested) {
      redirect(
        "/admin/settings?error=" +
          encodeURIComponent("Finalization is already in progress."),
      );
    }

    // Flip the flag — the AFTER UPDATE trigger does everything
    const { error } = await supabase
      .from("game_settings")
      .update({ finalize_requested: true })
      .eq("id", true);

    if (error) {
      throw new Error(error.message);
    }

    // Read back the result
    const { data: after } = await supabase
      .from("game_settings")
      .select("last_week_finalized")
      .eq("id", true)
      .single();

    redirect(
      "/admin/settings?ok=" +
        encodeURIComponent(
          `Week finalized! last_week_finalized = ${after?.last_week_finalized}`,
        ),
    );
  } catch (error) {
    // Next.js redirect throws a special error — re-throw it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent(`Failed to finalize week: ${errorMessage}`),
    );
  }
}
