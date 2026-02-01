// app/leaderboard/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type TeamRow = {
  id: string;
  name: string;
  weekly_points: number | null;
  total_points: number | null;
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

import { getCachedUser } from "@/lib/cached-data";

async function LeaderboardInner() {
  // This is the Cache Components-compatible way to opt out of caching for this render.
  noStore();

  const supabase = await createClient();

  // Auth (request-time / cookie-based)
  const user = await getCachedUser();

  // Leaderboard
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,weekly_points,total_points")
    .order("weekly_points", { ascending: false })
    .order("total_points", { ascending: false })
    .order("name", { ascending: true });

  const teams = (data ?? []) as TeamRow[];

  // Find user's team + rank
  let myTeam: TeamRow | null = null;
  let myRank: number | null = null;

  if (user) {
    const { data: myTeamData } = await supabase
      .from("teams")
      .select("id,name,weekly_points,total_points")
      .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
      .maybeSingle();

    if (myTeamData) {
      myTeam = myTeamData as TeamRow;
      const idx = teams.findIndex((t) => t.id === myTeamData.id);
      myRank = idx >= 0 ? idx + 1 : null;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Live standings sorted by points.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Supabase error</div>
          <div className="mt-1 text-muted-foreground">{error.message}</div>
        </div>
      )}

      {/* MOBILE */}
      <div className="overflow-hidden rounded-2xl border md:hidden">
        <div className="grid grid-cols-[72px_1fr_84px] items-center bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground">
          <div>Rank</div>
          <div>Team</div>
          <div className="text-right">Points</div>
        </div>

        {myTeam && myRank && (
          <div className="grid grid-cols-[72px_1fr_84px] items-center border-t border-l-4 border-l-primary bg-background px-4 py-3 dark:bg-primary/20">
            <div className="font-medium">#{myRank}</div>

            <div className="min-w-0">
              <div className="truncate font-semibold">{myTeam.name}</div>
              <div className="text-xs text-primary">Your team</div>
            </div>

            <div className="text-right font-semibold tabular-nums">
              {myTeam.weekly_points ?? 0}
              <div className="text-[10px] text-muted-foreground font-normal">Week</div>
            </div>
          </div>
        )}

        {teams.map((t, idx) => {
          const rank = idx + 1;
          const isMine = myTeam?.id === t.id;

          return (
            <div
              key={t.id}
              className={[
                "grid grid-cols-[72px_1fr_84px] items-center border-t px-4 py-3",
                isMine ? "bg-primary/5 dark:bg-primary/10" : "",
              ].join(" ")}
            >
              <div className={isMine ? "font-medium" : "text-muted-foreground"}>
                #{rank}
              </div>

              <div className="min-w-0">
                <div
                  className={
                    isMine ? "truncate font-semibold" : "truncate font-medium"
                  }
                >
                  {t.name}
                </div>
                {isMine && (
                  <div className="text-xs text-primary">Your team</div>
                )}
              </div>

              <div
                className={
                  isMine
                    ? "text-right font-semibold tabular-nums"
                    : "text-right tabular-nums"
                }
              >
                {t.weekly_points ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP */}
      <div className="hidden overflow-hidden rounded-2xl border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-right">Weekly Pts</th>
              <th className="px-4 py-3 text-right text-muted-foreground">Total Pts</th>
            </tr>
          </thead>
          <tbody>
            {myTeam && myRank && (
              <tr className="border-t bg-background">
                <td className="px-4 py-3 font-medium">#{myRank}</td>
                <td className="px-4 py-3 font-semibold">
                  {myTeam.name}
                  <span className="ml-2 text-xs text-primary">(Your team)</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {myTeam.weekly_points ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {myTeam.total_points ?? 0}
                </td>
              </tr>
            )}

            {teams.map((t, idx) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-3">{idx + 1}</td>
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {t.weekly_points ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {t.total_points ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardInner />
    </Suspense>
  );
}
