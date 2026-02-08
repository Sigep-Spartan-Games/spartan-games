// app/admin/teams/teams-below-goal.tsx
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

const TIER_LABELS: Record<string, string> = {
    gold: "🥇 Gold",
    purple: "🟣 Purple",
    red: "🔴 Red",
};

const TIER_COLORS: Record<string, string> = {
    gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
    purple: "bg-purple-500/20 text-purple-600 border-purple-500/30 dark:text-purple-300",
    red: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400",
};

type TeamWithGoal = {
    id: string;
    name: string;
    tier: "gold" | "purple" | "red" | null;
    weekly_points: number;
    total_points: number;
    weeks_won: string[] | null;
    streak_count: number | null;
    weekly_goal: number;
    percentage: number;
};

export default async function TeamsBelowGoal() {
    noStore();

    const supabase = await createClient();

    // Fetch all teams with tier info
    const { data: teams } = await supabase
        .from("teams")
        .select("id, name, tier, weekly_points, total_points, weeks_won, streak_count")
        .not("tier", "is", null) // Only teams with a tier
        .order("tier")
        .order("name");

    // Fetch tier goals
    const { data: tierSettings } = await supabase
        .from("tier_settings")
        .select("tier, weekly_goal");

    const tierGoals: Record<string, number> = {};
    (tierSettings || []).forEach((ts) => {
        tierGoals[ts.tier] = ts.weekly_goal;
    });

    // Calculate which teams are below their goal
    const teamsWithGoals: TeamWithGoal[] = (teams || []).map((team) => {
        const goal = team.tier ? tierGoals[team.tier] ?? 100 : 100;
        const weeklyPoints = team.weekly_points ?? 0;
        const percentage = goal > 0 ? Math.round((weeklyPoints / goal) * 100) : 0;

        return {
            ...team,
            weekly_points: weeklyPoints,
            total_points: team.total_points ?? 0,
            weekly_goal: goal,
            percentage,
        };
    });

    const teamsBelowGoal = teamsWithGoals.filter((t) => t.percentage < 100);

    if (teamsBelowGoal.length === 0) {
        return (
            <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
                🎉 All teams have met their weekly goals!
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-lg font-semibold">Teams Below Weekly Goal</h3>
                <p className="text-sm text-muted-foreground">
                    {teamsBelowGoal.length} team{teamsBelowGoal.length !== 1 ? "s" : ""} haven't reached their tier's weekly goal yet
                </p>
            </div>

            <div className="rounded-2xl border overflow-hidden">
                {/* Desktop header */}
                <div className="hidden md:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-3">Team</div>
                    <div className="col-span-2">Tier</div>
                    <div className="col-span-2 text-right">Points / Goal</div>
                    <div className="col-span-2 text-center">Progress</div>
                    <div className="col-span-1 text-center">Wins</div>
                    <div className="col-span-2 text-center">Streak</div>
                </div>

                {teamsBelowGoal.map((team) => {
                    const effectiveTotal = team.total_points + team.weekly_points;

                    return (
                        <div key={team.id} className="border-b last:border-b-0">
                            {/* Desktop row */}
                            <div className="hidden md:grid grid-cols-12 items-center px-4 py-3">
                                <div className="col-span-3 text-sm font-medium truncate">
                                    {team.name}
                                </div>

                                <div className="col-span-2">
                                    {team.tier && (
                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[team.tier]}`}>
                                            {TIER_LABELS[team.tier]}
                                        </span>
                                    )}
                                </div>

                                <div className="col-span-2 text-sm text-right tabular-nums">
                                    {team.weekly_points} / {team.weekly_goal}
                                </div>

                                <div className="col-span-2 text-center">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${team.percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground tabular-nums w-10">
                                            {team.percentage}%
                                        </span>
                                    </div>
                                </div>

                                <div className="col-span-1 text-sm text-center tabular-nums">
                                    {team.weeks_won?.length ?? 0}
                                </div>

                                <div className="col-span-2 text-center">
                                    {(team.streak_count ?? 0) >= 2 ? (
                                        <span className="text-orange-500 text-sm font-bold">
                                            🔥 {team.streak_count}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                </div>
                            </div>

                            {/* Mobile row */}
                            <div className="md:hidden px-4 py-3 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium truncate">{team.name}</div>
                                        {team.tier && (
                                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[team.tier]} mt-1`}>
                                                {TIER_LABELS[team.tier]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <div className="text-sm font-medium">{team.weekly_points} pts</div>
                                        <div className="text-xs text-muted-foreground">Goal: {team.weekly_goal}</div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${team.percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {team.percentage}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>Wins: {team.weeks_won?.length ?? 0}</span>
                                    <span>Total: {effectiveTotal} pts</span>
                                    {(team.streak_count ?? 0) >= 2 && (
                                        <span className="text-orange-500 font-bold">
                                            🔥 {team.streak_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
