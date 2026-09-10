// app/admin/teams/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteTeam } from "./actions";
import TierSelector from "./tier-selector";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import TeamFilters from "./team-filters";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTeamRosterMap,
  EMPTY_TEAM_ROSTER,
  type CanonicalRosterRow,
} from "@/lib/team-rosters";

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

  await requireAdmin("/admin/teams");
  const supabase = createAdminClient();
  const sp = (await searchParams) ?? {};

  const searchFilter =
    typeof sp.search === "string" ? sp.search.toLowerCase() : "";
  const progressFilter = typeof sp.progress === "string" ? sp.progress : "";
  const tierFilter = typeof sp.tier === "string" ? sp.tier : "";

  const [standingsResult, identitiesResult, rostersResult, tierSettingsResult] =
    await Promise.all([
      supabase
        .from("team_standings")
        .select(
          "id, name, tier, weekly_points, season_points, weeks_won_count, streak_count, last_activity_date, created_at, archived_at",
        )
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("teams")
        .select("id, invite_code")
        .is("archived_at", null),
      supabase
        .from("active_team_rosters")
        .select("team_id, user_id, role, display_name, joined_at"),
      supabase
        .from("current_tier_settings")
        .select("tier, weekly_goal"),
    ]);

  const error =
    standingsResult.error ??
    identitiesResult.error ??
    rostersResult.error ??
    tierSettingsResult.error;
  const inviteCodes = new Map(
    (identitiesResult.data ?? []).map((team) => [team.id, team.invite_code]),
  );
  const rosterMap = buildTeamRosterMap(
    (rostersResult.data ?? []) as CanonicalRosterRow[],
  );
  const teams = standingsResult.data ?? [];
  const tierSettings = tierSettingsResult.data;

  const tierGoals: Record<string, number> = {};
  (tierSettings || []).forEach((ts) => {
    tierGoals[ts.tier] = ts.weekly_goal;
  });

  if (error) {
    return (
      <StatusBanner variant="error" title="Teams unavailable">
        {error.message}
      </StatusBanner>
    );
  }

  // Calculate goal progress for each team
  const teamsWithProgress = (teams ?? []).map((t) => {
    const goal = t.tier ? (tierGoals[t.tier] ?? 100) : 100;
    const weeklyPoints = t.weekly_points ?? 0;
    const totalPoints = t.season_points ?? 0;
    const percentage = goal > 0 ? Math.round((weeklyPoints / goal) * 100) : 0;
    const metGoal = percentage >= 100;
    const roster = rosterMap.get(t.id) ?? EMPTY_TEAM_ROSTER;

    return {
      ...t,
      invite_code: inviteCodes.get(t.id) ?? null,
      captain_name: roster.captain_name,
      teammate_name: roster.teammate_name,
      weekly_points: weeklyPoints,
      total_points: totalPoints,
      weeks_won_count: Number(t.weeks_won_count ?? 0),
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
    <div className="space-y-5">
      <PageHeader
        title="Teams"
        description="Monitor progress, manage tiers, and maintain competition rosters."
      />
      {/* Stats Summary */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg border px-3 py-1.5">
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-medium">{totalTeams}</span>
        </div>
        <div className="rounded-lg border border-success/30 bg-success/[0.06] px-3 py-1.5">
          <span className="text-muted-foreground">Met Goal:</span>{" "}
          <span className="font-medium text-success">
            {teamsMetGoal}
          </span>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-1.5">
          <span className="text-muted-foreground">Below Goal:</span>{" "}
          <span className="font-medium text-warning">
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
      <div className="overflow-hidden rounded-lg border bg-card">
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
          const winsCount = t.weeks_won_count;
          const effectiveTotal = t.total_points;

          return (
            <div key={t.id} className="border-b last:border-b-0">
              {/* Desktop row */}
              <div className="hidden lg:grid grid-cols-12 items-center px-4 py-3">
                {/* Team name & members */}
                <div className="col-span-3">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.captain_name || "—"} · {t.teammate_name || "—"}
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
                        className={`h-full ${t.metGoal ? "bg-success" : "bg-primary"}`}
                        style={{ width: `${Math.min(t.percentage, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`w-10 text-right text-xs tabular-nums ${t.metGoal ? "font-medium text-success" : "text-muted-foreground"}`}
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
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-competition">
                      <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                      {streakCount}
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
                    title="Archive Team"
                    description={`Archive "${t.name}"? Its submissions and history will be preserved.`}
                  />
                </div>
              </div>

              {/* Mobile row */}
              <div className="lg:hidden px-4 py-3 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.captain_name || "—"} · {t.teammate_name || "—"}
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
                      className={`h-full ${t.metGoal ? "bg-success" : "bg-primary"}`}
                      style={{ width: `${Math.min(t.percentage, 100)}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs tabular-nums ${t.metGoal ? "font-medium text-success" : "text-muted-foreground"}`}
                  >
                    {t.percentage}%
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Wins: {winsCount}</span>
                  {streakCount >= 2 && (
                    <span className="inline-flex items-center gap-1 font-bold text-competition">
                      <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                      {streakCount}
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
                    title="Archive Team"
                    description={`Archive "${t.name}"? Its submissions and history will be preserved.`}
                    className="h-11 px-3 text-xs border"
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
