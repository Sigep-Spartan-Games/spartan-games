// app/admin/submissions/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteSubmission } from "./actions";
import SubmissionFilters from "./submission-filters";

type SearchParams = { [key: string]: string | string[] | undefined };

function SubmissionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <div className="h-10 w-full rounded bg-muted/20" />
      </div>
      <div className="rounded-2xl border overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-2">
          <div className="h-4 w-64 rounded bg-muted/40" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3">
            <div className="h-4 w-full rounded bg-muted/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function AdminSubmissionsInner({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const teamId = typeof sp.team === "string" ? sp.team : "";
  const dateFilter = typeof sp.date === "string" ? sp.date : "";

  const { supabase } = await requireAdmin("/admin/submissions");

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .order("name");

  // Create a lookup map for team names
  const teamMap = new Map((teams ?? []).map(t => [t.id, t.name]));

  // Fetch submissions with submitted_by
  let q = supabase
    .from("submissions")
    .select(
      "id, team_id, submitted_by, created_at, activity_key, activity_date, points_awarded, did_with_teammate",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (teamId) q = q.eq("team_id", teamId);
  if (dateFilter) q = q.eq("activity_date", dateFilter);

  const { data: subs, error } = await q;

  // Fetch user names for the submissions
  const userIds = [...new Set((subs ?? []).map(s => s.submitted_by).filter(Boolean))];
  let userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    userMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? "Unknown"]));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <SubmissionFilters teams={teams ?? []} teamId={teamId} dateFilter={dateFilter} />

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
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-3">When</div>
            <div className="col-span-3">Team / User</div>
            <div className="col-span-3">Activity</div>
            <div className="col-span-1">Pts</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {(subs ?? []).map((s) => {
            const teamName = teamMap.get(s.team_id) ?? "Unknown Team";
            const userName = userMap.get(s.submitted_by) ?? "Unknown User";

            return (
              <div
                key={s.id}
                className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 md:grid md:grid-cols-12 md:items-center md:gap-0"
              >
                {/* When Column */}
                <div className="flex justify-between items-start md:col-span-3 md:block">
                  <div>
                    <div className="hidden md:block text-sm">
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                    <div className="md:hidden text-sm font-medium">
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      For: {s.activity_date}
                    </div>
                  </div>
                  {/* Mobile Points Displayed Early */}
                  <div className="md:hidden font-medium text-sm">
                    {s.points_awarded} pts
                  </div>
                </div>

                {/* Team/User Column - Desktop */}
                <div className="hidden md:block md:col-span-3">
                  <div className="text-sm font-medium truncate">{teamName}</div>
                  <div className="text-xs text-muted-foreground truncate">{userName}</div>
                </div>

                {/* Activity Column */}
                <div className="flex justify-between items-center md:col-span-3 md:block">
                  <div>
                    <div className="text-sm md:font-medium">{s.activity_key}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.did_with_teammate ? "With teammate" : "Solo"}
                    </div>
                  </div>
                </div>

                {/* Team/User - Mobile only (between activity and actions) */}
                <div className="md:hidden flex items-center gap-2 text-xs text-muted-foreground border-t border-dashed pt-2">
                  <span className="font-medium text-foreground">{teamName}</span>
                  <span>•</span>
                  <span>{userName}</span>
                </div>

                {/* Points - Desktop only */}
                <div className="hidden md:block md:col-span-1 text-sm font-medium">
                  {s.points_awarded}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 md:col-span-2">
                  <Link
                    href={`/admin/submissions/${encodeURIComponent(
                      s.id,
                    )}?team=${encodeURIComponent(teamId || "")}`}
                    className="h-8 rounded-md border px-3 text-xs flex items-center hover:bg-muted/50"
                  >
                    Edit
                  </Link>

                  <form action={deleteSubmission}>
                    <input type="hidden" name="id" value={s.id} />
                    {teamId && <input type="hidden" name="team" value={teamId} />}
                    <button className="h-8 rounded-md border px-3 text-xs text-destructive hover:bg-destructive/10">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

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

export default function AdminSubmissionsPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<SubmissionsSkeleton />}>
      <AdminSubmissionsInner {...props} />
    </Suspense>
  );
}
