import { createClient } from "../../lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

type TeamRow = {
  id: string;
  name: string;
  points: number | null;
};

export default async function LeaderboardPage() {
  noStore();

  const supabase = await createClient();

  // Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  // Leaderboard
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,points")
    .order("points", { ascending: false })
    .order("name", { ascending: true });

  const teams = (data ?? []) as TeamRow[];

  // Find user's team
  let myTeam: TeamRow | null = null;
  let myRank: number | null = null;

  if (user) {
    const { data: myTeamData } = await supabase
      .from("teams")
      .select("id,name,points")
      .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
      .maybeSingle();

    if (myTeamData) {
      myTeam = myTeamData as TeamRow;
      myRank = teams.findIndex((t) => t.id === myTeam!.id) + 1 || null;
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

      {/* MOBILE (table-like, with pinned "Your team" + full list below) */}
      <div className="md:hidden overflow-hidden rounded-2xl border">
        {/* Header */}
        <div className="grid grid-cols-[72px_1fr_84px] items-center bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground">
          <div>Rank</div>
          <div>Team</div>
          <div className="text-right">Points</div>
        </div>

        {/* Pinned "Your team" row */}
        {myTeam && myRank && (
          <div className="grid grid-cols-[72px_1fr_84px] items-center border-t border-l-4 border-l-primary bg-background px-4 py-3 dark:bg-primary/20">
            <div className="font-medium">#{myRank}</div>

            <div className="min-w-0">
              <div className="truncate font-semibold">{myTeam.name}</div>
              <div className="text-xs text-primary">Your team</div>
            </div>

            <div className="text-right font-semibold tabular-nums">
              {myTeam.points ?? 0}
            </div>
          </div>
        )}

        {/* Full leaderboard list (including your team at its real rank) */}
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
                {t.points ?? 0}
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
              <th className="px-4 py-3 text-right">Points</th>
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
                  {myTeam.points ?? 0}
                </td>
              </tr>
            )}

            {teams.map((t, idx) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-3">{idx + 1}</td>
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {t.points ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
