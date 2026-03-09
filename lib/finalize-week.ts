// lib/finalize-week.ts
// Thin wrapper that triggers the SQL finalize_week() function via the
// finalize_requested flag on game_settings.  All heavy lifting (per-tier
// winners, weekly_history recording, points roll-up) is handled atomically
// inside the database.

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Triggers the weekly finalization.
 *
 * Setting `finalize_requested = true` fires the database trigger
 * `trg_finalize_previous_week`, which calls `finalize_week()` for the
 * previous week inside a single transaction.
 */
export async function finalizeWeekService() {
  const supabase = createAdminClient();

  // Check that games are currently running
  const { data: settings, error: settingsError } = await supabase
    .from("game_settings")
    .select("games_started_at, games_ended_at, finalize_requested")
    .eq("id", true)
    .single();

  if (settingsError) {
    throw new Error(`Failed to read game_settings: ${settingsError.message}`);
  }

  if (!settings?.games_started_at) {
    return { success: true, message: "Games have not started yet — skipped." };
  }

  if (
    settings.games_ended_at &&
    new Date() >= new Date(settings.games_ended_at)
  ) {
    return { success: true, message: "Games have ended — skipped." };
  }

  if (settings.finalize_requested) {
    return {
      success: true,
      message: "Finalization already in progress — skipped.",
    };
  }

  // Flip the flag — the AFTER UPDATE trigger handles everything
  const { error: updateError } = await supabase
    .from("game_settings")
    .update({ finalize_requested: true })
    .eq("id", true);

  if (updateError) {
    throw new Error(`Failed to trigger finalization: ${updateError.message}`);
  }

  // Read back the result to confirm it worked
  const { data: after } = await supabase
    .from("game_settings")
    .select("last_week_finalized, finalize_requested")
    .eq("id", true)
    .single();

  return {
    success: true,
    message: `Week finalized successfully. last_week_finalized = ${after?.last_week_finalized}`,
    lastWeekFinalized: after?.last_week_finalized,
  };
}
