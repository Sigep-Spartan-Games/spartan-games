// app/admin/history/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { HistoryFilters } from "./history-filters";

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-5">
        <div className="h-6 w-56 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-72 rounded bg-muted/30" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border p-4">
          <div className="h-4 w-full rounded bg-muted/25" />
        </div>
      ))}
    </div>
  );
}

async function AdminHistoryInner() {
  noStore();

  const { supabase } = await requireAdmin("/admin/history");

  // Fetch all weekly history with team names
  const { data: history, error } = await supabase
    .from("weekly_history")
    .select(
      `
            id,
            week_identifier,
            weekly_points,
            tier,
            weekly_goal,
            met_goal,
            weeks_won_count,
            streak_count,
            created_at,
            team_id,
            teams ( name )
        `,
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
        Error loading history: {error.message}
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any\r\n  return <HistoryFilters history={(history || []) as any[]} />;
}

export default function AdminHistoryPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<HistorySkeleton />}>
        <AdminHistoryInner />
      </Suspense>
    </div>
  );
}
