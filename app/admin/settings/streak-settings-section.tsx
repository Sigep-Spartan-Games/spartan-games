// app/admin/settings/streak-settings-section.tsx
import { createClient } from "@/lib/supabase/server";
import { updateStreakSettings } from "./streak-settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        <form action={updateStreakSettings} className="space-y-4 max-w-md">
            <div className="space-y-2">
                <label htmlFor="daily_bonus_increment" className="text-sm font-medium">
                    Daily Bonus Increment
                </label>
                <p className="text-xs text-muted-foreground">
                    Points added for each consecutive day (e.g., Day 1 = 1pt, Day 2 = 2pts).
                </p>
                <Input
                    id="daily_bonus_increment"
                    name="daily_bonus_increment"
                    type="number"
                    min="0"
                    defaultValue={dailyBonusIncrement}
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
                <Input
                    id="max_bonus"
                    name="max_bonus"
                    type="number"
                    min="0"
                    defaultValue={maxBonus}
                    required
                />
            </div>

            <Button type="submit">
                Save Streak Settings
            </Button>
        </form>
    );
}
