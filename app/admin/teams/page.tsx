// app/admin/teams/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteTeam } from "./actions";

function TeamsSkeleton() {
  return (
    <div className="space-y-4">
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

async function AdminTeamsInner() {
  noStore();

  const { supabase } = await requireAdmin("/admin/teams");

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, weekly_points, total_points, invite_code")
    .order("name");

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
          Error loading teams: {error.message}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Team</div>
            <div className="col-span-3">Invite</div>
            <div className="col-span-2 text-right">Weekly</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1 text-right"></div>
          </div>

          {/* Mobile header */}
          <div className="sm:hidden grid grid-cols-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div>Team</div>
            <div className="text-right">Points</div>
            <div className="text-right">Action</div>
          </div>

          {(teams ?? []).map((t) => (
            <div
              key={t.id}
              className="border-b last:border-b-0"
            >
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-12 items-center px-4 py-3">
                <div className="col-span-4">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.id}</div>
                </div>
                <div className="col-span-3 text-sm">{t.invite_code ?? "-"}</div>
                <div className="col-span-2 text-sm text-right">{t.weekly_points ?? 0}</div>
                <div className="col-span-2 text-sm text-right">{(t.total_points ?? 0) + (t.weekly_points ?? 0)}</div>
                <div className="col-span-1 flex justify-end gap-2">
                  <form action={deleteTeam}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="h-9 rounded-md border px-3 text-sm text-destructive hover:bg-destructive/10">
                      X
                    </button>
                  </form>
                </div>
              </div>

              {/* Mobile row */}
              <div className="sm:hidden grid grid-cols-3 items-center px-4 py-3 gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.invite_code ?? "-"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{t.weekly_points ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total: {(t.total_points ?? 0) + (t.weekly_points ?? 0)}</div>
                </div>
                <div className="flex justify-end">
                  <form action={deleteTeam}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="h-8 w-8 rounded-md border text-sm text-destructive hover:bg-destructive/10">
                      X
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminTeamsPage() {
  return (
    <Suspense fallback={<TeamsSkeleton />}>
      <AdminTeamsInner />
    </Suspense>
  );
}
