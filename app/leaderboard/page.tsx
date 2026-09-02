import { Suspense } from "react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/cached-data";
import WeeklyProgressBar from "@/components/weekly-progress-bar";
import PullToRefresh from "@/components/pull-to-refresh";
import { StreakBadge, TierBadge, TIER_LABELS } from "@/components/competition-badges";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type TeamRow = {
  id: string;
  name: string;
  weekly_points: number | null;
  total_points: number | null;
  weeks_won: string[] | null;
  tier: "gold" | "purple" | "red" | null;
  member1_id: string | null;
  member2_id: string | null;
  member1_name: string | null;
  member2_name: string | null;
  streak_count: number | null;
};

const tierTabStyles = {
  all: "border-primary bg-primary text-primary-foreground",
  gold: "border-achievement/30 bg-achievement/10 text-achievement",
  purple: "border-primary/30 bg-primary/10 text-primary",
  red: "border-competition/30 bg-competition/10 text-competition",
};

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading leaderboard">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded bg-muted" />
        <div className="h-5 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />
      <div className="overflow-hidden rounded-lg border bg-card">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse border-b border-border/70 bg-muted/20 last:border-0" />
        ))}
      </div>
    </div>
  );
}

type SearchParams = Promise<{ tier?: string }>;

async function LeaderboardInner({ searchParams }: { searchParams: SearchParams }) {
  noStore();

  const supabase = await createClient();
  const user = await getCachedUser();
  const sp = await searchParams;

  const { data, error } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      weekly_points,
      total_points,
      weeks_won,
      tier,
      member1_id,
      member2_id,
      streak_count,
      member1:profiles!member1_id(first_name, last_name, email),
      member2:profiles!member2_id(first_name, last_name, email)
    `)
    .order("weekly_points", { ascending: false })
    .order("total_points", { ascending: false })
    .order("name", { ascending: true });

  const teams = (data ?? []).map((team: any) => {
    const member1 = team.member1;
    const member2 = team.member2;
    const member1Name = member1
      ? member1.first_name || member1.last_name
        ? `${member1.first_name || ""} ${member1.last_name || ""}`.trim()
        : member1.email
      : null;
    const member2Name = member2
      ? member2.first_name || member2.last_name
        ? `${member2.first_name || ""} ${member2.last_name || ""}`.trim()
        : member2.email
      : null;

    return { ...team, member1_name: member1Name, member2_name: member2Name };
  }) as TeamRow[];

  const myTeam = user
    ? teams.find((team) => team.member1_id === user.id || team.member2_id === user.id) ?? null
    : null;
  const tierParam = sp?.tier?.toLowerCase();
  const isValidTier = tierParam && ["gold", "purple", "red", "all"].includes(tierParam);
  let activeTier = isValidTier ? tierParam : myTeam?.tier ?? "all";
  if (!isValidTier && !myTeam?.tier) activeTier = "all";

  const filteredTeams = activeTier === "all"
    ? teams
    : teams.filter((team) => team.tier === activeTier);
  const myRankIndex = myTeam ? filteredTeams.findIndex((team) => team.id === myTeam.id) : -1;
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

  return (
    <PullToRefresh>
      <div className="space-y-6">
        <PageHeader
          title="Leaderboard"
          description="Live weekly standings, season totals, wins, and team goal progress."
          actions={
            <div className="grid grid-cols-4 rounded-lg border bg-card p-1" aria-label="Filter leaderboard by tier">
              {(["all", "gold", "purple", "red"] as const).map((tier) => {
                const active = activeTier === tier;
                return (
                  <Link
                    key={tier}
                    href={`?tier=${tier}`}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center justify-center rounded-control border border-transparent px-2 text-xs font-semibold transition-colors sm:min-w-16",
                      active ? tierTabStyles[tier] : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tier === "all" ? "All" : TIER_LABELS[tier]}
                  </Link>
                );
              })}
            </div>
          }
        />

        {error ? (
          <StatusBanner variant="error" title="Could not load the leaderboard">
            {error.message}
          </StatusBanner>
        ) : null}

        {myTeam ? (
          <section className="app-surface-elevated overflow-hidden" aria-labelledby="your-team-heading">
            <div className="border-l-4 border-primary p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p id="your-team-heading" className="text-sm font-semibold text-primary">Your team</p>
                  <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight">{myTeam.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {myTeam.member1_name || "Open spot"} / {myTeam.member2_name || "Open spot"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {myTeam.tier ? <TierBadge tier={myTeam.tier} /> : null}
                    <StreakBadge count={myTeam.streak_count ?? 0} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5 border-t pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Rank</p>
                    <p className="app-number mt-1 text-2xl font-semibold text-primary">{myRank ? `#${myRank}` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Weekly</p>
                    <p className="app-number mt-1 text-2xl font-semibold">{myTeam.weekly_points ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Season</p>
                    <p className="app-number mt-1 text-2xl font-semibold text-achievement">
                      {(myTeam.total_points ?? 0) + (myTeam.weekly_points ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
              <WeeklyProgressBar
                weeklyPoints={myTeam.weekly_points ?? 0}
                tier={myTeam.tier}
                className="mt-5 max-w-2xl"
              />
            </div>
          </section>
        ) : null}

        {filteredTeams.length === 0 ? (
          <EmptyState
            title="No teams in this tier yet"
            description="Teams will appear here after they register for the selected tier."
          />
        ) : (
          <section className="app-surface overflow-hidden" aria-label="Team standings">
            <div className="hidden grid-cols-[5rem_minmax(0,1fr)_8rem_8rem_7rem] items-center border-b bg-muted/45 px-5 py-3 text-xs font-semibold text-muted-foreground lg:grid">
              <div>Rank</div>
              <div>Team</div>
              <div className="text-right">Weekly</div>
              <div className="text-right">Season</div>
              <div className="text-right">Wins</div>
            </div>
            <div className="divide-y divide-border/70">
              {filteredTeams.map((team, index) => {
                const rank = index + 1;
                const isMine = myTeam?.id === team.id;
                const seasonTotal = (team.total_points ?? 0) + (team.weekly_points ?? 0);

                return (
                  <div
                    key={team.id}
                    className={cn(
                      "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-3 px-4 py-4 lg:grid-cols-[5rem_minmax(0,1fr)_8rem_8rem_7rem] lg:items-center lg:px-5",
                      isMine && "bg-primary/[0.055]",
                    )}
                  >
                    <div
                      className={cn(
                        "app-number flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold lg:h-auto lg:w-auto lg:justify-start lg:rounded-none",
                        rank === 1
                          ? "bg-achievement/10 text-achievement"
                          : rank <= 3
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground lg:bg-transparent",
                      )}
                    >
                      #{rank}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{team.name}</p>
                        {isMine ? <span className="text-xs font-semibold text-primary">Your team</span> : null}
                        {team.tier && activeTier === "all" ? <TierBadge tier={team.tier} /> : null}
                        <StreakBadge count={team.streak_count ?? 0} />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
                        {team.member1_name || "Open spot"} / {team.member2_name || "Open spot"}
                      </p>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground lg:hidden">
                        <span>Season <strong className="app-number text-foreground">{seasonTotal}</strong></span>
                        <span>Wins <strong className="app-number text-foreground">{team.weeks_won?.length ?? 0}</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="app-number text-xl font-semibold">{team.weekly_points ?? 0}</p>
                      <p className="text-[11px] text-muted-foreground lg:hidden">weekly pts</p>
                    </div>
                    <div className="hidden text-right lg:block">
                      <span className="app-number font-semibold text-achievement">{seasonTotal}</span>
                    </div>
                    <div className="hidden text-right lg:block">
                      <span className="app-number text-muted-foreground">{team.weeks_won?.length ?? 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PullToRefresh>
  );
}

export default function LeaderboardPage(props: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardInner searchParams={props.searchParams} />
    </Suspense>
  );
}
