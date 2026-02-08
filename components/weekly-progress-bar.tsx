// components/weekly-progress-bar.tsx
import { createClient } from "@/lib/supabase/server";

type WeeklyProgressBarProps = {
    weeklyPoints: number;
    tier: "gold" | "purple" | "red" | null;
    className?: string;
};

const TIER_COLORS: Record<string, string> = {
    gold: "bg-yellow-500",
    purple: "bg-purple-500",
    red: "bg-red-500",
};

const TIER_BG_COLORS: Record<string, string> = {
    gold: "bg-yellow-500/10",
    purple: "bg-purple-500/10",
    red: "bg-red-500/10",
};

export default async function WeeklyProgressBar({
    weeklyPoints,
    tier,
    className = "",
}: WeeklyProgressBarProps) {
    if (!tier) {
        return null; // Don't show progress bar for teams without a tier
    }

    const supabase = await createClient();

    // Fetch the weekly goal for this tier
    const { data: tierSettings } = await supabase
        .from("tier_settings")
        .select("weekly_goal")
        .eq("tier", tier)
        .maybeSingle();

    const weeklyGoal = tierSettings?.weekly_goal ?? 100;
    const percentage = Math.min(100, Math.round((weeklyPoints / weeklyGoal) * 100));
    const pointsNeeded = Math.max(0, weeklyGoal - weeklyPoints);
    const goalReached = weeklyPoints >= weeklyGoal;

    return (
        <div className={`space-y-1.5 ${className}`}>
            {/* Progress bar */}
            <div className={`h-2 w-full rounded-full ${TIER_BG_COLORS[tier]} overflow-hidden`}>
                <div
                    className={`h-full ${TIER_COLORS[tier]} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Progress text */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                    {weeklyPoints} / {weeklyGoal} pts
                </span>
                <span className={goalReached ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                    {goalReached ? "✓ Goal reached!" : `${pointsNeeded} more needed`}
                </span>
            </div>
        </div>
    );
}
