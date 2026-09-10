// app/admin/history/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { HistoryFilters } from "./history-filters";

type WeekRelation = { label: string; starts_on: string };

function oneRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-5">
        <div className="h-6 w-56 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-72 rounded bg-muted/30" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="h-4 w-full rounded bg-muted/25" />
        </div>
      ))}
    </div>
  );
}

async function AdminHistoryInner() {
  noStore();

  const { supabase } = await requireAdmin("/admin/history");

  const { data: season, error: seasonError } = await supabase
    .from("current_season_settings")
    .select("id")
    .maybeSingle();

  // Canonical finalized results joined to their competition-week labels.
  const { data: rawHistory, error } = await supabase
    .from("team_week_results")
    .select(
      `
            id,
            points,
            tier_key,
            goal_points,
            won,
            streak_count,
            finalized_at,
            team_id,
            teams ( name ),
            competition_weeks ( label, starts_on )
        `,
    )
    .eq("season_id", season?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("finalized_at", { ascending: false })
    .limit(500);

  const winsByTeam = new Map<string, number>();
  const history = [...(rawHistory ?? [])]
    .sort((a, b) => {
      const aWeek = oneRelation(a.competition_weeks as WeekRelation | WeekRelation[] | null);
      const bWeek = oneRelation(b.competition_weeks as WeekRelation | WeekRelation[] | null);
      return String(aWeek?.starts_on ?? "").localeCompare(String(bWeek?.starts_on ?? ""));
    })
    .map((row) => {
      const week = oneRelation(row.competition_weeks as WeekRelation | WeekRelation[] | null);
      const wins = (winsByTeam.get(row.team_id) ?? 0) + (row.won ? 1 : 0);
      winsByTeam.set(row.team_id, wins);
      return {
        id: row.id,
        week_identifier: week?.label ?? "Unknown week",
        weekly_points: row.points,
        tier: row.tier_key,
        weekly_goal: row.goal_points,
        met_goal: row.points >= row.goal_points,
        weeks_won_count: wins,
        streak_count: row.streak_count,
        created_at: row.finalized_at,
        team_id: row.team_id,
        teams: row.teams,
      };
    })
    .reverse();

  const { data: teamsData, error: teamsError } = await supabase
    .from("team_standings")
    .select("id, name, tier, season_points, weekly_points")
    .eq("season_id", season?.id ?? "00000000-0000-0000-0000-000000000000")
    .is("archived_at", null);

  const teams = (teamsData ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    tier: team.tier,
    total_points: Number(team.season_points ?? 0),
    weekly_points: 0,
  }));

  if (seasonError || error || teamsError) {
    return (
      <div className="rounded-lg border p-5 text-sm text-muted-foreground">
        Error loading history: {seasonError?.message || error?.message || teamsError?.message}
      </div>
    );
  }

  return (
    <HistoryFilters
      history={history}
      teams={teams}
    />
  );
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
