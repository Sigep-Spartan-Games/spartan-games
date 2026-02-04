// app/admin/teams/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteTeam } from "./actions";
import TierSelector from "./tier-selector";

const TIER_COLORS: Record<string, string> = {
  gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
  purple: "bg-purple-500/20 text-purple-600 border-purple-500/30 dark:text-purple-300",
  red: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400",
};

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
    .select("id, name, weekly_points, total_points, invite_code, tier")
    .order("name");

  if (error) {
    return (
      <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
        Error loading teams: {error.message}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden">
      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-10 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
        <div className="col-span-3">Team</div>
        <div className="col-span-2">Tier</div>
        <div className="col-span-2">Invite</div>
        <div className="col-span-1 text-right">Weekly</div>
        <div className="col-span-1 text-right">Total</div>
        <div className="col-span-1 text-right"></div>
      </div>

      {(teams ?? []).map((t) => (
        <div key={t.id} className="border-b last:border-b-0">
          {/* Desktop row */}
          <div className="hidden md:grid grid-cols-10 items-center px-4 py-3">
            <div className="col-span-3">
              <div className="text-sm font-medium truncate">{t.name}</div>
            </div>

            <div className="col-span-2 pr-2">
              <TierSelector team={{ id: t.id, name: t.name, tier: t.tier }} />
            </div>

            <div className="col-span-2 text-sm truncate">{t.invite_code ?? "-"}</div>
            <div className="col-span-1 text-sm text-right">{t.weekly_points ?? 0}</div>
            <div className="col-span-1 text-sm text-right">{(t.total_points ?? 0) + (t.weekly_points ?? 0)}</div>
            <div className="col-span-1 flex justify-end">
              <form action={deleteTeam}>
                <input type="hidden" name="id" value={t.id} />
                <button className="h-8 rounded-md border px-2 text-xs text-destructive hover:bg-destructive/10">
                  Delete
                </button>
              </form>
            </div>
          </div>

          {/* Mobile row */}
          <div className="md:hidden px-4 py-3 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground">Invite: {t.invite_code ?? "-"}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium">{t.weekly_points ?? 0} pts</div>
                <div className="text-xs text-muted-foreground">Total: {(t.total_points ?? 0) + (t.weekly_points ?? 0)}</div>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <TierSelector team={{ id: t.id, name: t.name, tier: t.tier }} />
              </div>
              <form action={deleteTeam}>
                <input type="hidden" name="id" value={t.id} />
                <button className="h-8 rounded-md border px-3 text-xs text-destructive hover:bg-destructive/10">
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}

      {(teams ?? []).length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No teams found.
        </div>
      )}
    </div>
  );
}

export default function AdminTeamsPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<TeamsSkeleton />}>
        <AdminTeamsInner />
      </Suspense>
    </div>
  );
}
