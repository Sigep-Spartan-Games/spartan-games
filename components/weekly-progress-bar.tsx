import { createClient } from "@/lib/supabase/server";

type WeeklyProgressBarProps = {
  weeklyPoints: number;
  tier: "gold" | "purple" | "red" | null;
  className?: string;
};

const TIER_COLORS = {
  gold: "bg-achievement",
  purple: "bg-primary",
  red: "bg-competition",
};

const TIER_BG_COLORS = {
  gold: "bg-achievement/10",
  purple: "bg-primary/10",
  red: "bg-competition/10",
};

export default async function WeeklyProgressBar({
  weeklyPoints,
  tier,
  className = "",
}: WeeklyProgressBarProps) {
  if (!tier) return null;

  const supabase = await createClient();
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
    <div className={`space-y-2 ${className}`}>
      <div
        role="progressbar"
        aria-label="Weekly points goal"
        aria-valuemin={0}
        aria-valuemax={weeklyGoal}
        aria-valuenow={weeklyPoints}
        className={`h-1.5 w-full overflow-hidden rounded-full ${TIER_BG_COLORS[tier]}`}
      >
        <div
          className={`h-full rounded-full ${TIER_COLORS[tier]} transition-[width] duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="app-number text-muted-foreground">
          {weeklyPoints} / {weeklyGoal} pts
        </span>
        <span className={goalReached ? "font-semibold text-success" : "text-muted-foreground"}>
          {goalReached ? "Goal reached" : `${pointsNeeded} more needed`}
        </span>
      </div>
    </div>
  );
}
