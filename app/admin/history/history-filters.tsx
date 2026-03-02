"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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

type TeamTotal = {
  id: string;
  name: string;
  tier: string | null;
  total_points: number;
  weekly_points: number;
  all_time_points: number;
  goals_met: number;
  goals_missed: number;
};

function getTeamName(h: HistoryEntry): string {
  if (!h.teams) return "Unknown Team";
  if (Array.isArray(h.teams)) return h.teams[0]?.name || "Unknown Team";
  return h.teams.name || "Unknown Team";
}

export function HistoryFilters({
  history,
  teams,
}: {
  history: HistoryEntry[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teams: any[];
}) {
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");

  // Apply filters
  const filtered = history.filter((h) => {
    if (tierFilter !== "all" && h.tier !== tierFilter) return false;
    if (goalFilter === "met" && !h.met_goal) return false;
    if (goalFilter === "not_met" && h.met_goal) return false;
    return true;
  });

  // Calculate All-Time Totals
  const teamTotalsMap: Record<string, TeamTotal> = {};

  teams.forEach((t) => {
    teamTotalsMap[t.id] = {
      id: t.id,
      name: t.name,
      tier: t.tier,
      total_points: t.total_points || 0,
      weekly_points: t.weekly_points || 0,
      all_time_points: (t.total_points || 0) + (t.weekly_points || 0),
      goals_met: 0,
      goals_missed: 0,
    };
  });

  // Count goals met/missed from the raw history (unfiltered)
  history.forEach((h) => {
    if (teamTotalsMap[h.team_id]) {
      if (h.met_goal) {
        teamTotalsMap[h.team_id].goals_met += 1;
      } else {
        teamTotalsMap[h.team_id].goals_missed += 1;
      }
    }
  });

  const totalsArray = Object.values(teamTotalsMap)
    .filter((t) => {
      // Apply the same Tier filter to the totals table if desired
      if (tierFilter !== "all" && t.tier !== tierFilter) return false;
      return true;
    })
    .sort((a, b) => b.all_time_points - a.all_time_points);

  // Group filtered history by week
  const byWeek: Record<string, HistoryEntry[]> = {};
  filtered.forEach((h) => {
    if (!byWeek[h.week_identifier]) {
      byWeek[h.week_identifier] = [];
    }
    byWeek[h.week_identifier].push(h);
  });

  const weeks = Object.keys(byWeek).sort().reverse();

  // Collapse state
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>(() => {
    // Default the most recent week to open, others closed
    if (weeks.length > 0) {
      return { [weeks[0]]: true };
    }
    return {};
  });

  const toggleWeek = (week: string) => {
    setOpenWeeks((prev) => ({
      ...prev,
      [week]: !prev[week],
    }));
  };

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

      {/* All-Time Totals Table */}
      {totalsArray.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">All-Time Totals</h2>
          <div className="rounded-2xl border overflow-hidden">
            <div className="hidden md:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-4">Team</div>
              <div className="col-span-2">Tier</div>
              <div className="col-span-2 text-right">All-Time Pts</div>
              <div className="col-span-2 text-center text-green-600 dark:text-green-500">
                Goals Met
              </div>
              <div className="col-span-2 text-center text-red-500">
                Goals Missed
              </div>
            </div>
            {totalsArray.map((t) => (
              <div key={t.id} className="border-b last:border-b-0">
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-12 items-center px-4 py-3">
                  <div className="col-span-4 text-sm font-medium truncate">
                    {t.name}
                  </div>
                  <div className="col-span-2">
                    {t.tier && (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[t.tier]}`}
                      >
                        {TIER_LABELS[t.tier]}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-sm text-right tabular-nums font-semibold">
                    {t.all_time_points}
                  </div>
                  <div className="col-span-2 text-sm text-center tabular-nums text-green-600 dark:text-green-500 font-medium">
                    {t.goals_met}
                  </div>
                  <div className="col-span-2 text-sm text-center tabular-nums text-red-500 font-medium">
                    {t.goals_missed}
                  </div>
                </div>
                {/* Mobile */}
                <div className="md:hidden px-4 py-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {t.name}
                      </div>
                      {t.tier && (
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[t.tier]} mt-1`}
                        >
                          {TIER_LABELS[t.tier]}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-semibold">
                        {t.all_time_points} pts
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t mt-2 border-border/50">
                    <div className="text-green-600 dark:text-green-500 font-medium">
                      Goals Met: {t.goals_met}
                    </div>
                    <div className="text-red-500 font-medium">
                      Goals Missed: {t.goals_missed}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

          const isOpen = openWeeks[week] || false;

          return (
            <div key={week} className="space-y-3">
              <button
                onClick={() => toggleWeek(week)}
                className="w-full flex items-center justify-between hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <h2 className="text-lg font-semibold">{week}</h2>
                </div>
                <div className="text-sm border rounded-full px-3 py-1 bg-background">
                  <span
                    className={
                      successRate >= 70
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {metGoalCount}/{totalTeams} matched ({successRate}%)
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="rounded-2xl border overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
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
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
