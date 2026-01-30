import { createClient } from "../lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

type TeamRow = {
  id: string;
  name: string;
  points: number;
};

// export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  noStore(); //for dynamic loading

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id,name,points")
    .order("points", { ascending: false });

  const teams = (data ?? []) as TeamRow[];

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

      {/* MOBILE: cards */}
      <div className="space-y-3 md:hidden">
        {teams.length === 0 ? (
          <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
            No teams yet.
          </div>
        ) : (
          teams.map((t, idx) => (
            <div key={t.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    Rank #{idx + 1}
                  </div>
                  <div className="truncate text-base font-semibold">
                    {t.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Points</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {t.points ?? 0}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP: table */}
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
            {teams.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-muted-foreground" colSpan={3}>
                  No teams yet.
                </td>
              </tr>
            ) : (
              teams.map((t, idx) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {t.points ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
