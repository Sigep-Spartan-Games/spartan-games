// app/admin/settings/streak-settings-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export async function updateStreakSettings(formData: FormData) {
    const { supabase } = await requireAdmin("/admin/settings");

    const dailyBonusIncrement = Number(formData.get("daily_bonus_increment"));
    const maxBonus = Number(formData.get("max_bonus"));

    if (!Number.isInteger(dailyBonusIncrement) || dailyBonusIncrement < 0) {
        redirect("/admin/settings?error=Invalid increment value");
    }

    if (!Number.isInteger(maxBonus) || maxBonus < 0) {
        redirect("/admin/settings?error=Invalid max bonus value");
    }

    const { error } = await supabase.rpc("update_streak_settings_v2", {
        p_daily_bonus_increment: dailyBonusIncrement,
        p_max_streak_bonus: maxBonus,
    });

    if (error) {
        redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/admin/settings");
    redirect("/admin/settings?ok=Streak settings updated");
}
