// app/admin/history/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";

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

function HistorySkeleton() {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border p-5">
                <div className="h-6 w-56 rounded bg-muted/40" />
                <div className="mt-2 h-4 w-72 rounded bg-muted/30" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl border p-4">
                    <div className="h-4 w-full rounded bg-muted/25" />
                </div>
            ))}
        </div>
    );
}

async function AdminHistoryInner() {
    noStore();

    const { supabase } = await requireAdmin("/admin/history");

    // Fetch all weekly history with team names
    const { data: history, error } = await supabase
        .from("weekly_history")
        .select(`
            id,
            week_identifier,
            weekly_points,
            tier,
            weekly_goal,
            met_goal,
            weeks_won_count,
            streak_count,
            created_at,
            team_id,
            teams ( name )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        return (
            <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
                Error loading history: {error.message}
            </div>
        );
    }

    // Group by week
    const byWeek: Record<string, any[]> = {};
    (history || []).forEach((h: any) => {
        if (!byWeek[h.week_identifier]) {
            byWeek[h.week_identifier] = [];
        }
        byWeek[h.week_identifier].push(h);
    });

    const weeks = Object.keys(byWeek).sort().reverse();

    if (weeks.length === 0) {
        return (
            <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
                No weekly history recorded yet. Use "Finalize Week" to start tracking performance.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Weekly Performance History</h1>
                <p className="text-sm text-muted-foreground">
                    Historical record of team goal achievement
                </p>
            </div>

            {weeks.map((week) => {
                const weekData = byWeek[week];
                const metGoalCount = weekData.filter((h) => h.met_goal).length;
                const totalTeams = weekData.length;
                const successRate = totalTeams > 0 ? Math.round((metGoalCount / totalTeams) * 100) : 0;

                return (
                    <div key={week} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Week {week}</h2>
                            <div className="text-sm">
                                <span className={successRate >= 70 ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                                    {metGoalCount}/{totalTeams} teams met goal ({successRate}%)
                                </span>
                            </div>
                        </div>

                        <div className="rounded-2xl border overflow-hidden">
                            {/* Desktop header */}
                            <div className="hidden md:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                                <div className="col-span-3">Team</div>
                                <div className="col-span-2">Tier</div>
                                <div className="col-span-2 text-right">Points / Goal</div>
                                <div className="col-span-2 text-center">Status</div>
                                <div className="col-span-1 text-center">Wins</div>
                                <div className="col-span-2 text-center">Streak</div>
                            </div>

                            {weekData.map((h: any) => {
                                const teamName = h.teams?.name || "Unknown Team";
                                const percentage = h.weekly_goal > 0 ? Math.round((h.weekly_points / h.weekly_goal) * 100) : 0;

                                return (
                                    <div key={h.id} className="border-b last:border-b-0">
                                        {/* Desktop row */}
                                        <div className="hidden md:grid grid-cols-12 items-center px-4 py-3">
                                            <div className="col-span-3 text-sm font-medium truncate">
                                                {teamName}
                                            </div>

                                            <div className="col-span-2">
                                                {h.tier && (
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[h.tier]}`}>
                                                        {TIER_LABELS[h.tier]}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="col-span-2 text-sm text-right tabular-nums">
                                                {h.weekly_points} / {h.weekly_goal}
                                            </div>

                                            <div className="col-span-2 text-center">
                                                {h.met_goal ? (
                                                    <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                                                        ✓ Met Goal
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">
                                                        {percentage}% ({h.weekly_goal - h.weekly_points} short)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="col-span-1 text-sm text-center tabular-nums">
                                                {h.weeks_won_count}
                                            </div>

                                            <div className="col-span-2 text-center">
                                                {(h.streak_count ?? 0) >= 2 ? (
                                                    <span className="text-orange-500 text-sm font-bold">
                                                        🔥 {h.streak_count}
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
                                                    <div className="text-sm font-medium truncate">{teamName}</div>
                                                    {h.tier && (
                                                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[h.tier]} mt-1`}>
                                                            {TIER_LABELS[h.tier]}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0 ml-2">
                                                    <div className="text-sm font-medium">{h.weekly_points} pts</div>
                                                    <div className="text-xs text-muted-foreground">Goal: {h.weekly_goal}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                {h.met_goal ? (
                                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                                        ✓ Met Goal
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        {percentage}% ({h.weekly_goal - h.weekly_points} short)
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <span className="text-muted-foreground">Wins: {h.weeks_won_count}</span>
                                                    {(h.streak_count ?? 0) >= 2 && (
                                                        <span className="text-orange-500 font-bold">
                                                            🔥 {h.streak_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function AdminHistoryPage() {
    return (
        <div className="space-y-4">
            <Suspense fallback={<HistorySkeleton />}>
                <AdminHistoryInner />
            </Suspense>
        </div>
    );
}
