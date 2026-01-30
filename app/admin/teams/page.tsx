// app/admin/teams/page.tsx
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { deleteTeam } from "./actions";

export default async function AdminTeamsPage() {
  noStore();
  const { supabase } = await requireAdmin("/admin/teams");

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, points, invite_code")
    .order("name");

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
          Error loading teams: {error.message}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-5">Team</div>
            <div className="col-span-3">Invite</div>
            <div className="col-span-2">Points</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {(teams ?? []).map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-12 items-center px-4 py-3 border-b last:border-b-0"
            >
              <div className="col-span-5">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.id}</div>
              </div>
              <div className="col-span-3 text-sm">{t.invite_code ?? "-"}</div>
              <div className="col-span-2 text-sm">{t.points ?? 0}</div>
              <div className="col-span-2 flex justify-end gap-2">
                {/* TODO: add edit UI later */}
                <form action={deleteTeam}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="h-9 rounded-md border px-3 text-sm">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
