"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export async function finalizeWeekWithHistory() {
  const { supabase } = await requireAdmin("/admin/settings");
  const { data, error } = await supabase.rpc("finalize_competition_week", {
    p_week_id: null,
  });

  if (error) {
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  const result = (data ?? {}) as { status?: string; label?: string; result_count?: number };
  const message = result.status === "already_finalized"
    ? `${result.label ?? "Previous week"} was already finalized.`
    : `${result.label ?? "Previous week"} finalized (${result.result_count ?? 0} team results).`;
  redirect(`/admin/settings?ok=${encodeURIComponent(message)}`);
}
