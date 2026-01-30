import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteSubmission } from "./actions";
import TeamFilter from "./team-filter";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const teamId = typeof sp.team === "string" ? sp.team : "";

  const { supabase } = await requireAdmin("/admin/submissions");

  // Teams for the filter dropdown
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .order("name");

  // Submissions list
  let q = supabase
    .from("submissions")
    .select(
      "id, team_id, created_at, activity_key, activity_date, points_awarded, did_with_teammate",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (teamId) q = q.eq("team_id", teamId);

  const { data: subs, error } = await q;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        {/* Client component handles onChange + router.replace */}
        <TeamFilter teams={teams ?? []} teamId={teamId} />

        {teamsError ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Error loading teams: {teamsError.message}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
          Error loading submissions: {error.message}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">When</div>
            <div className="col-span-4">Activity</div>
            <div className="col-span-2">Points</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {(subs ?? []).map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-12 items-center px-4 py-3 border-b last:border-b-0"
            >
              <div className="col-span-4">
                <div className="text-sm">
                  {new Date(s.created_at).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Activity date: {s.activity_date}
                </div>
              </div>

              <div className="col-span-4">
                <div className="text-sm font-medium">{s.activity_key}</div>
                <div className="text-xs text-muted-foreground">
                  With teammate: {s.did_with_teammate ? "yes" : "no"}
                </div>
              </div>

              <div className="col-span-2 text-sm font-medium">
                {s.points_awarded}
              </div>

              <div className="col-span-2 flex justify-end gap-2">
                <Link
                  href={`/admin/submissions/${encodeURIComponent(
                    s.id,
                  )}?team=${encodeURIComponent(teamId || "")}`}
                  className="h-9 rounded-md border px-3 text-sm flex items-center"
                >
                  Edit
                </Link>

                <form action={deleteSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  {teamId && <input type="hidden" name="team" value={teamId} />}
                  <button className="h-9 rounded-md border px-3 text-sm">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}

          {(subs?.length ?? 0) === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              No submissions found.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
