"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Flame } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const TIER_LABELS: Record<string, string> = {
  gold: "Gold",
  purple: "Purple",
  red: "Red",
};

const TIER_COLORS: Record<string, string> = {
  gold: "border-achievement/30 bg-achievement/10 text-achievement",
  purple: "border-primary/30 bg-primary/10 text-primary",
  red: "border-competition/30 bg-competition/10 text-competition",
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

  // Collapse state for weekly history
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>(() => {
    // Default the most recent week to open, others closed
    if (weeks.length > 0) {
      return { [weeks[0]]: true };
    }
    return {};
  });

  // Collapse state for All-Time Totals
  const [showTotals, setShowTotals] = useState(false);

  const toggleWeek = (week: string) => {
    setOpenWeeks((prev) => ({
      ...prev,
      [week]: !prev[week],
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly performance history"
        description="Historical record of team goal achievement."
      />

      {/* Filters */}
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label className="app-label">Tier</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-11 w-full rounded-control border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Tiers</option>
            <option value="gold">Gold</option>
            <option value="purple">Purple</option>
            <option value="red">Red</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="app-label">Goal</label>
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="h-11 w-full rounded-control border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Teams</option>
            <option value="met">Met Goal</option>
            <option value="not_met">Did Not Meet Goal</option>
          </select>
        </div>
        {(tierFilter !== "all" || goalFilter !== "all") && (
          <button
            onClick={() => {
              setTierFilter("all");
              setGoalFilter("all");
            }}
            className="h-11 rounded-control border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* All-Time Totals Table */}
      {totalsArray.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowTotals((prev) => !prev)}
            className="flex min-h-11 w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/30"
            aria-expanded={showTotals}
          >
            <div className="flex items-center gap-2">
              {showTotals ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <h2 className="text-lg font-semibold">All-Time Totals</h2>
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {totalsArray.length} team{totalsArray.length !== 1 && "s"}
            </div>
          </button>

          {showTotals && (
            <div className="animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-lg border bg-card duration-200">
              <div className="hidden md:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Team</div>
                <div className="col-span-2">Tier</div>
                <div className="col-span-2 text-right">All-Time Pts</div>
                <div className="col-span-2 text-center text-success">
                  Goals Met
                </div>
                <div className="col-span-2 text-center text-destructive">
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
                    <div className="col-span-2 text-center text-sm font-medium tabular-nums text-success">
                      {t.goals_met}
                    </div>
                    <div className="col-span-2 text-center text-sm font-medium tabular-nums text-destructive">
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
                      <div className="font-medium text-success">
                        Goals Met: {t.goals_met}
                      </div>
                      <div className="font-medium text-destructive">
                        Goals Missed: {t.goals_missed}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {weeks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
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
                className="flex min-h-11 w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/30"
                aria-expanded={isOpen}
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
                        ? "font-medium text-success"
                        : "text-muted-foreground"
                    }
                  >
                    {metGoalCount}/{totalTeams} met goals ({successRate}%)
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-lg border bg-card duration-200">
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
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                                Met Goal
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
                              <span className="inline-flex items-center gap-1 text-sm font-bold text-competition">
                                <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                                {h.streak_count}
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
                              <span className="inline-flex items-center gap-1 font-medium text-success">
                                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                                Met Goal
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
                                <span className="inline-flex items-center gap-1 font-bold text-competition">
                                  <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                                  {h.streak_count}
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
