import { createAdminClient } from "@/lib/supabase/admin";

type FinalizationResult = {
  status?: string;
  week_id?: string;
  label?: string;
  result_count?: number;
};

/** Run the idempotent, advisory-locked finalization transaction. */
export async function finalizeWeekService() {
  const supabase = createAdminClient();
  const { data: season, error: seasonError } = await supabase
    .from("current_season_settings")
    .select("id, status")
    .maybeSingle();

  if (seasonError) throw new Error(`Failed to read current season: ${seasonError.message}`);
  if (!season) return { success: true, message: "No current season configured — skipped." };
  if (season.status !== "active") {
    return { success: true, message: `Season is ${season.status} — skipped.` };
  }

  const { data, error } = await supabase.rpc("finalize_competition_week", {
    p_week_id: null,
  });
  if (error) throw new Error(`Failed to finalize week: ${error.message}`);

  const result = (data ?? {}) as FinalizationResult;
  const label = result.label ?? result.week_id ?? "previous week";
  return {
    success: true,
    status: result.status ?? "completed",
    message:
      result.status === "already_finalized"
        ? `${label} was already finalized.`
        : `${label} finalized successfully (${result.result_count ?? 0} team results).`,
    weekId: result.week_id,
  };
}
