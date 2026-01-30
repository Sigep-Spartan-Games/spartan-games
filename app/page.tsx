import { createClient } from "../lib/supabase/server";
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

      {/* MOBILE */}
      <div className="space-y-3 md:hidden">
        {myTeam && myRank && (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-primary">Your Team</div>
                <div className="font-semibold">{myTeam.name}</div>
                <div className="text-xs text-muted-foreground">
                  Rank #{myRank}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Points</div>
                <div className="text-lg font-semibold tabular-nums">
                  {myTeam.points ?? 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {teams.map((t, idx) => (
          <div key={t.id} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  Rank #{idx + 1}
                </div>
                <div className="font-semibold">{t.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Points</div>
                <div className="text-lg font-semibold tabular-nums">
                  {t.points ?? 0}
                </div>
              </div>
            </div>
          </div>
        ))}
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
              <tr className="border-t bg-primary/5">
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
