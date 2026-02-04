// app/leaderboard/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/cached-data";

type TeamRow = {
  id: string;
  name: string;
  weekly_points: number | null;
  total_points: number | null;
  weeks_won: string[] | null;
  tier: "gold" | "purple" | "red" | null;
  member1_id: string | null;
  member2_id: string | null;
};

const TIER_LABELS: Record<string, string> = {
  gold: "Gold",
  purple: "Purple",
  red: "Red",
};

const TIER_COLORS: Record<string, string> = {
  gold: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
  purple: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
  red: "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
};

function LeaderboardSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <div className="h-8 w-40 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-64 rounded bg-muted/30" />
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <div className="bg-muted/50 px-4 py-3">
          <div className="h-4 w-56 rounded bg-muted/40" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-t px-4 py-3">
            <div className="h-4 w-full rounded bg-muted/30" />
          </div>
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

  // Fetch all teams (with tier and member IDs)
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,weekly_points,total_points,weeks_won,tier,member1_id,member2_id")
    .order("weekly_points", { ascending: false })
    .order("total_points", { ascending: false })
    .order("name", { ascending: true });

  const teams = (data ?? []) as TeamRow[];

  // Find my team in memory (need ID to identify default tier)
  const myTeam = user
    ? teams.find((t) => t.member1_id === user.id || t.member2_id === user.id) ?? null
    : null;

  // Determine active tier filter
  // Priority: URL Param -> My Team's Tier -> "All"
  const tierParam = sp?.tier?.toLowerCase();
  const isValidTier = tierParam && ["gold", "purple", "red", "all"].includes(tierParam);

  let activeTier = isValidTier ? tierParam : (myTeam?.tier ?? "all");

  // If my team has no tier (legacy), default to 'all' unless param is set
  if (!isValidTier && !myTeam?.tier) {
    activeTier = "all";
  }

  // Filter teams based on active tier
  const filteredTeams = activeTier === "all"
    ? teams
    : teams.filter((t) => t.tier === activeTier);

  // My Rank within the current view
  const myRank = myTeam
    ? filteredTeams.findIndex((t) => t.id === myTeam.id) + 1
    : null;

  const isMyTeamInView = myRank !== null && myRank > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Live standings sorted by points.
          </p>
        </div>

        {/* Tier Tabs */}
        <div className="flex flex-wrap gap-2">
          {["all", "gold", "purple", "red"].map((t) => {
            const isActive = activeTier === t;
            const label = t === "all" ? "All" : TIER_LABELS[t];
            // Style based on tier color if active
            let styleClass = "text-muted-foreground hover:bg-muted/50 hover:text-foreground";
            if (isActive) {
              if (t === "all") styleClass = "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20";
              else styleClass = `${TIER_COLORS[t]} font-semibold ring-1 ring-inset`;
            }

            return (
              <Link
                key={t}
                href={`?tier=${t}`}
                scroll={false}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${styleClass}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Supabase error</div>
          <div className="mt-1 text-muted-foreground">{error.message}</div>
        </div>
      )}

      {/* MOBILE */}
      <div className="overflow-hidden rounded-2xl border md:hidden">
        <div className="grid grid-cols-[48px_1fr_48px_72px] items-center bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground">
          <div>Rank</div>
          <div>Team</div>
          <div className="text-center">Wins</div>
          <div className="text-right">Points</div>
        </div>

        {isMyTeamInView && myTeam && (
          <div className="grid grid-cols-[48px_1fr_48px_72px] items-center border-t border-l-4 border-l-primary bg-background px-4 py-3 dark:bg-primary/20">
            <div className="font-medium">#{myRank}</div>

            <div className="min-w-0 pr-2">
              <div className="flex flex-col gap-0.5">
                <span className="truncate font-semibold">{myTeam.name}</span>
                {myTeam.tier && (
                  <span className={`w-fit inline-flex items-center rounded-sm px-1 py-0 text-[9px] font-medium ring-1 ring-inset ${TIER_COLORS[myTeam.tier]}`}>
                    {TIER_LABELS[myTeam.tier]}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-primary mt-0.5">Your team</div>
            </div>

            <div className="text-center font-semibold tabular-nums">
              {myTeam.weeks_won?.length ?? 0}
            </div>

            <div className="text-right font-semibold tabular-nums">
              {myTeam.weekly_points ?? 0}
              <div className="text-[10px] text-muted-foreground font-normal">
                Total: {(myTeam.total_points ?? 0) + (myTeam.weekly_points ?? 0)}
              </div>
            </div>
          </div>
        )}

        {filteredTeams.map((t, idx) => {
          const rank = idx + 1;
          const isMine = myTeam?.id === t.id;
          const effectiveTotal = (t.total_points ?? 0) + (t.weekly_points ?? 0);

          return (
            <div
              key={t.id}
              className={[
                "grid grid-cols-[48px_1fr_48px_72px] items-center border-t px-4 py-3",
                isMine ? "bg-primary/5 dark:bg-primary/10" : "",
              ].join(" ")}
            >
              <div className={isMine ? "font-medium" : "text-muted-foreground"}>
                #{rank}
              </div>

              <div className="min-w-0 pr-2">
                <div className="flex flex-col gap-0.5">
                  <span className={isMine ? "truncate font-semibold" : "truncate font-medium"}>
                    {t.name}
                  </span>
                  {(t.tier && activeTier === 'all') && (
                    <span className={`w-fit inline-flex items-center rounded-sm px-1 py-0 text-[9px] font-medium ring-1 ring-inset ${TIER_COLORS[t.tier]}`}>
                      {TIER_LABELS[t.tier]}
                    </span>
                  )}
                </div>
                {isMine && (
                  <div className="text-[10px] text-primary mt-0.5">Your team</div>
                )}
              </div>

              <div className={isMine ? "text-center font-semibold tabular-nums" : "text-center tabular-nums text-muted-foreground"}>
                {t.weeks_won?.length ?? 0}
              </div>

              <div
                className={
                  isMine
                    ? "text-right font-semibold tabular-nums"
                    : "text-right tabular-nums"
                }
              >
                {t.weekly_points ?? 0}
                <div className="text-[10px] text-muted-foreground font-normal">
                  Total: {effectiveTotal}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTeams.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No teams in this tier yet.
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden overflow-hidden rounded-2xl border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left w-16">Rank</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-center w-24">Weeks Won</th>
              <th className="px-4 py-3 text-right w-32">Weekly Pts</th>
              <th className="px-4 py-3 text-right w-32">Total Pts</th>
            </tr>
          </thead>
          <tbody>
            {isMyTeamInView && myTeam && (
              <tr className="border-t bg-background border-l-4 border-l-primary/50">
                <td className="px-4 py-3 font-medium">#{myRank}</td>
                <td className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    {myTeam.name}
                    {myTeam.tier && (
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[myTeam.tier]}`}>
                        {TIER_LABELS[myTeam.tier]}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-primary font-normal">(Your team)</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold tabular-nums">
                  {myTeam.weeks_won?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {myTeam.weekly_points ?? 0}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {(myTeam.total_points ?? 0) + (myTeam.weekly_points ?? 0)}
                </td>
              </tr>
            )}

            {filteredTeams.map((t, idx) => (
              <tr key={t.id} className={`border-t ${myTeam?.id === t.id ? "bg-primary/5" : ""}`}>
                <td className="px-4 py-3">{idx + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {t.name}
                    {(t.tier && activeTier === "all") && (
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_COLORS[t.tier]}`}>
                        {TIER_LABELS[t.tier]}
                      </span>
                    )}
                    {myTeam?.id === t.id && <span className="text-xs text-primary">(You)</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                  {t.weeks_won?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {t.weekly_points ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {(t.total_points ?? 0) + (t.weekly_points ?? 0)}
                </td>
              </tr>
            ))}

            {filteredTeams.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No teams found in this tier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaderboardPage(props: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardInner searchParams={props.searchParams} />
    </Suspense>
  );
}
