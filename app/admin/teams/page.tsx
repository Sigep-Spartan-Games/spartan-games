// app/admin/teams/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteTeam } from "./actions";
import TierSelector from "./tier-selector";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import TeamFilters from "./team-filters";

type SearchParams = { [key: string]: string | string[] | undefined };

function TeamsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <div className="h-9 w-full rounded bg-muted/20" />
      </div>
      <div className="rounded-2xl border overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-2">
          <div className="h-4 w-56 rounded bg-muted/40" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3">
            <div className="h-4 w-full rounded bg-muted/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function AdminTeamsInner({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  noStore();

  const { supabase } = await requireAdmin("/admin/teams");
  const sp = (await searchParams) ?? {};

  const searchFilter =
    typeof sp.search === "string" ? sp.search.toLowerCase() : "";
  const progressFilter = typeof sp.progress === "string" ? sp.progress : "";
  const tierFilter = typeof sp.tier === "string" ? sp.tier : "";

  // Fetch all teams
  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      `
      id, 
      name, 
      weekly_points, 
      total_points, 
      invite_code, 
      tier, 
      weeks_won, 
      streak_count,
      member1:profiles!member1_id(first_name, last_name, email),
      member2:profiles!member2_id(first_name, last_name, email)
    `,
    )
    .order("name");

  // Fetch tier goals
  const { data: tierSettings } = await supabase
    .from("tier_settings")
    .select("tier, weekly_goal");

  const tierGoals: Record<string, number> = {};
  (tierSettings || []).forEach((ts) => {
    tierGoals[ts.tier] = ts.weekly_goal;
  });

  if (error) {
    return (
      <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
        Error loading teams: {error.message}
      </div>
    );
  }

  // Calculate goal progress for each team
  const teamsWithProgress = (teams ?? []).map((t: any) => {
    const goal = t.tier ? (tierGoals[t.tier] ?? 100) : 100;
    const weeklyPoints = t.weekly_points ?? 0;
    const totalPoints = t.total_points ?? 0;
    const percentage = goal > 0 ? Math.round((weeklyPoints / goal) * 100) : 0;
    const metGoal = percentage >= 100;

    const m1 = t.member1;
    const m1Name = m1
      ? m1.first_name || m1.last_name
        ? `${m1.first_name || ""} ${m1.last_name || ""}`.trim()
        : m1.email
      : null;

    const m2 = t.member2;
    const m2Name = m2
      ? m2.first_name || m2.last_name
        ? `${m2.first_name || ""} ${m2.last_name || ""}`.trim()
        : m2.email
      : null;

    return {
      ...t,
      member1_name: m1Name,
      member2_name: m2Name,
      weekly_points: weeklyPoints,
      total_points: totalPoints,
      weekly_goal: goal,
      percentage,
      metGoal,
    };
  });

  // Apply filters
  let filteredTeams = teamsWithProgress;

  if (searchFilter) {
    filteredTeams = filteredTeams.filter((t) =>
      t.name.toLowerCase().includes(searchFilter),
    );
  }

  if (progressFilter === "below") {
    filteredTeams = filteredTeams.filter((t) => !t.metGoal);
  } else if (progressFilter === "met") {
    filteredTeams = filteredTeams.filter((t) => t.metGoal);
  }

  if (tierFilter) {
    filteredTeams = filteredTeams.filter((t) => t.tier === tierFilter);
  }

  // Summary stats
  const totalTeams = teamsWithProgress.length;
  const teamsMetGoal = teamsWithProgress.filter((t) => t.metGoal).length;
  const teamsBelowGoal = totalTeams - teamsMetGoal;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg border px-3 py-1.5">
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-medium">{totalTeams}</span>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-1.5">
          <span className="text-muted-foreground">Met Goal:</span>{" "}
          <span className="font-medium text-green-600 dark:text-green-400">
            {teamsMetGoal}
          </span>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5">
          <span className="text-muted-foreground">Below Goal:</span>{" "}
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {teamsBelowGoal}
          </span>
        </div>
      </div>

      {/* Filters */}
      <TeamFilters
        currentSearch={searchFilter}
        currentProgress={progressFilter}
        currentTier={tierFilter}
      />

      {/* Teams Table */}
      <div className="rounded-2xl border overflow-hidden">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-3">Team</div>
          <div className="col-span-2 text-right">Weekly / Goal</div>
          <div className="col-span-2 text-center">Progress</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-center">Wins</div>
          <div className="col-span-1 text-center">Streak</div>
          <div className="col-span-2 text-right">Tier / Actions</div>
        </div>

        {filteredTeams.map((t) => {
          const streakCount = t.streak_count ?? 0;
          const winsCount = (t.weeks_won as string[] | null)?.length ?? 0;
          const effectiveTotal = t.total_points + t.weekly_points;

          return (
            <div key={t.id} className="border-b last:border-b-0">
              {/* Desktop row */}
              <div className="hidden lg:grid grid-cols-12 items-center px-4 py-3">
                {/* Team name & members */}
                <div className="col-span-3">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.member1_name || "—"} • {t.member2_name || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Invite: {t.invite_code ?? "-"}
                  </div>
                </div>

                {/* Weekly Points / Goal */}
                <div className="col-span-2 text-sm text-right tabular-nums">
                  {t.weekly_points} / {t.weekly_goal}
                </div>

                {/* Progress bar */}
                <div className="col-span-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${t.metGoal ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(t.percentage, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs tabular-nums w-10 text-right ${t.metGoal ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}
                    >
                      {t.percentage}%
                    </span>
                  </div>
                </div>

                {/* Total Points */}
                <div className="col-span-1 text-sm text-right tabular-nums">
                  {effectiveTotal}
                </div>

                {/* Wins */}
                <div className="col-span-1 text-sm text-center tabular-nums">
                  {winsCount}
                </div>

                {/* Streak */}
                <div className="col-span-1 text-center pr-2">
                  {streakCount >= 2 ? (
                    <span className="text-orange-500 text-sm font-bold">
                      🔥 {streakCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </div>

                {/* Tier Selector & Actions */}
                <div className="col-span-2 flex justify-end items-center gap-3 pl-2">
                  <TierSelector
                    team={{ id: t.id, name: t.name, tier: t.tier }}
                  />
                  <ConfirmDeleteButton
                    action={deleteTeam}
                    payload={{ id: t.id }}
                    title="Delete Team"
                    description={`Are you sure you want to delete "${t.name}"? This action cannot be undone.`}
                  />
                </div>
              </div>

              {/* Mobile row */}
              <div className="lg:hidden px-4 py-3 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.member1_name || "—"} • {t.member2_name || "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">
                      {t.weekly_points} / {t.weekly_goal}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total: {effectiveTotal}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${t.metGoal ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(t.percentage, 100)}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs tabular-nums ${t.metGoal ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}
                  >
                    {t.percentage}%
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Wins: {winsCount}</span>
                  {streakCount >= 2 && (
                    <span className="text-orange-500 font-bold">
                      🔥 {streakCount}
                    </span>
                  )}
                  <span className="ml-auto">
                    Invite: {t.invite_code ?? "-"}
                  </span>
                </div>

                {/* Tier & Actions - with extra spacing */}
                <div className="flex gap-3 items-center pt-2 mt-1">
                  <div className="flex-1">
                    <TierSelector
                      team={{ id: t.id, name: t.name, tier: t.tier }}
                    />
                  </div>
                  <ConfirmDeleteButton
                    action={deleteTeam}
                    payload={{ id: t.id }}
                    title="Delete Team"
                    description={`Are you sure you want to delete "${t.name}"? This action cannot be undone.`}
                    className="h-8 px-3 text-xs border"
                    buttonSize="default"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredTeams.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {searchFilter || progressFilter || tierFilter
              ? "No teams match the current filters."
              : "No teams found."}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTeamsPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<TeamsSkeleton />}>
      <AdminTeamsInner {...props} />
    </Suspense>
  );
}
