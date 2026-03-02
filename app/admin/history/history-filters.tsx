"use client";

import { useState } from "react";

const TIER_LABELS: Record<string, string> = {
  gold: "🥇 Gold",
  purple: "🟣 Purple",
  red: "🔴 Red",
};

const TIER_COLORS: Record<string, string> = {
  gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
  purple:
    "bg-purple-500/20 text-purple-600 border-purple-500/30 dark:text-purple-300",
  red: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400",
};

type HistoryEntry = {
  id: string;
  week_identifier: string;
  weekly_points: number;
  tier: string | null;
  weekly_goal: number;
  met_goal: boolean;
  weeks_won_count: number;
  streak_count: number | null;
  created_at: string;
  team_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teams: any;
};

function getTeamName(h: HistoryEntry): string {
  if (!h.teams) return "Unknown Team";
  if (Array.isArray(h.teams)) return h.teams[0]?.name || "Unknown Team";
  return h.teams.name || "Unknown Team";
}

export function HistoryFilters({ history }: { history: HistoryEntry[] }) {
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");

  // Apply filters
  const filtered = history.filter((h) => {
    if (tierFilter !== "all" && h.tier !== tierFilter) return false;
    if (goalFilter === "met" && !h.met_goal) return false;
    if (goalFilter === "not_met" && h.met_goal) return false;
    return true;
  });

  // Group by week
  const byWeek: Record<string, HistoryEntry[]> = {};
  filtered.forEach((h) => {
    if (!byWeek[h.week_identifier]) {
      byWeek[h.week_identifier] = [];
    }
    byWeek[h.week_identifier].push(h);
  });

  const weeks = Object.keys(byWeek).sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Weekly Performance History
        </h1>
        <p className="text-sm text-muted-foreground">
          Historical record of team goal achievement
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Tier:
          </label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Tiers</option>
            <option value="gold">🥇 Gold</option>
            <option value="purple">🟣 Purple</option>
            <option value="red">🔴 Red</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Goal:
          </label>
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Teams</option>
            <option value="met">✓ Met Goal</option>
            <option value="not_met">✗ Did Not Meet Goal</option>
          </select>
        </div>
        {(tierFilter !== "all" || goalFilter !== "all") && (
          <button
            onClick={() => {
              setTierFilter("all");
              setGoalFilter("all");
            }}
            className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {weeks.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
          {history.length === 0
            ? 'No weekly history recorded yet. Use "Finalize Week" to start tracking performance.'
            : "No results match the selected filters."}
        </div>
      ) : (
        weeks.map((week) => {
          const weekData = byWeek[week];
          const metGoalCount = weekData.filter((h) => h.met_goal).length;
          const totalTeams = weekData.length;
          const successRate =
            totalTeams > 0 ? Math.round((metGoalCount / totalTeams) * 100) : 0;

          return (
            <div key={week} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{week}</h2>
                <div className="text-sm">
                  <span
                    className={
                      successRate >= 70
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-muted-foreground"
                    }
                  >
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

                {weekData.map((h) => {
                  const teamName = getTeamName(h);
                  const percentage =
                    h.weekly_goal > 0
                      ? Math.round((h.weekly_points / h.weekly_goal) * 100)
                      : 0;

                  return (
                    <div key={h.id} className="border-b last:border-b-0">
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-12 items-center px-4 py-3">
                        <div className="col-span-3 text-sm font-medium truncate">
                          {teamName}
                        </div>

                        <div className="col-span-2">
                          {h.tier && (
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[h.tier]}`}
                            >
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
                              {percentage}% ({h.weekly_goal - h.weekly_points}{" "}
                              short)
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
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mobile row */}
                      <div className="md:hidden px-4 py-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {teamName}
                            </div>
                            {h.tier && (
                              <span
                                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[h.tier]} mt-1`}
                              >
                                {TIER_LABELS[h.tier]}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-sm font-medium">
                              {h.weekly_points} pts
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Goal: {h.weekly_goal}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          {h.met_goal ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              ✓ Met Goal
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {percentage}% ({h.weekly_goal - h.weekly_points}{" "}
                              short)
                            </span>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">
                              Wins: {h.weeks_won_count}
                            </span>
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
        })
      )}
    </div>
  );
}
