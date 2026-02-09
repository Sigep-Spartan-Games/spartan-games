// app/admin/settings/streak-settings-section.tsx
import { createClient } from "@/lib/supabase/server";
import { updateStreakSettings } from "./streak-settings-actions";

export default async function StreakSettingsSection() {
    const supabase = await createClient();
    const { data: settings } = await supabase
        .from("streak_settings")
        .select("*")
        .eq("id", true)
        .single();

    const dailyBonusIncrement = settings?.daily_bonus_increment ?? 1;
    const maxBonus = settings?.max_bonus ?? 10;

    return (
        <div className="rounded-2xl border p-5 space-y-3">
            <div>
                <h2 className="text-lg font-semibold">Streak Bonus Settings</h2>
                <p className="text-sm text-muted-foreground">
                    Configure how streak bonuses are awarded for consecutive daily activity.
                </p>
            </div>

            <form action={updateStreakSettings} className="space-y-4 max-w-md">
                <div className="space-y-2">
                    <label htmlFor="daily_bonus_increment" className="text-sm font-medium">
                        Daily Bonus Increment
                    </label>
                    <p className="text-xs text-muted-foreground">
                        Points added for each consecutive day (e.g., Day 1 = 1pt, Day 2 = 2pts).
                    </p>
                    <input
                        id="daily_bonus_increment"
                        name="daily_bonus_increment"
                        type="number"
                        min="0"
                        defaultValue={dailyBonusIncrement}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="max_bonus" className="text-sm font-medium">
                        Maximum Bonus
                    </label>
                    <p className="text-xs text-muted-foreground">
                        The maximum bonus points a team can earn from a streak per day.
                    </p>
                    <input
                        id="max_bonus"
                        name="max_bonus"
                        type="number"
                        min="0"
                        defaultValue={maxBonus}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="h-10 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium"
                >
                    Save Streak Settings
                </button>
            </form>
        </div>
    );
}
