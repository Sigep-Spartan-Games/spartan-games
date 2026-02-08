// app/admin/settings/tier-goals-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateTierGoals(formData: FormData) {
    await requireAdmin("/admin/settings");
    const supabase = await createClient();

    const goldGoal = parseInt(String(formData.get("gold_goal") || "100"));
    const purpleGoal = parseInt(String(formData.get("purple_goal") || "75"));
    const redGoal = parseInt(String(formData.get("red_goal") || "50"));

    if (!Number.isFinite(goldGoal) || goldGoal < 0) {
        redirect("/admin/settings?error=Invalid gold goal value");
    }
    if (!Number.isFinite(purpleGoal) || purpleGoal < 0) {
        redirect("/admin/settings?error=Invalid purple goal value");
    }
    if (!Number.isFinite(redGoal) || redGoal < 0) {
        redirect("/admin/settings?error=Invalid red goal value");
    }

    // Update all three tiers
    const updates = [
        { tier: "gold", weekly_goal: goldGoal },
        { tier: "purple", weekly_goal: purpleGoal },
        { tier: "red", weekly_goal: redGoal },
    ];

    for (const update of updates) {
        const { error } = await supabase
            .from("tier_settings")
            .upsert(update, { onConflict: "tier" });

        if (error) {
            redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
        }
    }

    revalidatePath("/admin/settings");
    redirect("/admin/settings?ok=Tier goals updated successfully");
}

export async function getTierGoals() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("tier_settings")
        .select("tier, weekly_goal")
        .order("tier");

    if (error) {
        console.error("Error fetching tier goals:", error);
        return { gold: 100, purple: 75, red: 50 };
    }

    const goals: Record<string, number> = {};
    (data || []).forEach((row) => {
        goals[row.tier] = row.weekly_goal;
    });

    return {
        gold: goals.gold ?? 100,
        purple: goals.purple ?? 75,
        red: goals.red ?? 50,
    };
}
