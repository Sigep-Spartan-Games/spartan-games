// app/admin/settings/streak-settings-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateStreakSettings(formData: FormData) {
    await requireAdmin("/admin/settings");

    const dailyBonusIncrement = Number(formData.get("daily_bonus_increment"));
    const maxBonus = Number(formData.get("max_bonus"));

    if (!Number.isInteger(dailyBonusIncrement) || dailyBonusIncrement < 0) {
        redirect("/admin/settings?error=Invalid increment value");
    }

    if (!Number.isInteger(maxBonus) || maxBonus < 0) {
        redirect("/admin/settings?error=Invalid max bonus value");
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from("streak_settings")
        .upsert({
            id: true,
            daily_bonus_increment: dailyBonusIncrement,
            max_bonus: maxBonus,
        });

    if (error) {
        redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/admin/settings");
    redirect("/admin/settings?ok=Streak settings updated");
}
