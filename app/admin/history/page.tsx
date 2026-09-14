// app/admin/history/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  HistoryFilters,
  type HistoryEntry,
  type HistoryWeek,
} from "./history-filters";

const HISTORY_PAGE_SIZE = 1000;

type QueryError = { message: string };

type CompetitionWeek = {
  id: string;
  label: string;
  starts_on: string;
};

type HistoryRow = {
  id: string;
  week_id: string;
  points: number;
  tier_key: string;
  goal_points: number;
  won: boolean;
  streak_count: number;
  finalized_at: string;
  team_id: string;
  teams: { name: string } | { name: string }[] | null;
};

type PageResult<T> = {
  data: T[] | null;
  error: QueryError | null;
};

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
): Promise<{ data: T[]; error: QueryError | null }> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(
      from,
      from + HISTORY_PAGE_SIZE - 1,
    );

    if (error) return { data: [], error };

    const page = data ?? [];
    if (page.length === 0) break;

    allRows.push(...page);
    if (page.length < HISTORY_PAGE_SIZE) break;

    from += page.length;
  }

  return { data: allRows, error: null };
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

  const seasonId =
    season?.id ?? "00000000-0000-0000-0000-000000000000";

  const [weeksResult, historyResult, teamsResult] = await Promise.all([
    fetchAllPages<CompetitionWeek>(async (from, to) => {
      const { data, error } = await supabase
        .from("competition_weeks")
        .select("id, label, starts_on")
        .eq("season_id", seasonId)
        .eq("status", "finalized")
        .order("starts_on", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);

      return { data: data as CompetitionWeek[] | null, error };
    }),
    fetchAllPages<HistoryRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("team_week_results")
        .select(
          `
              id,
              week_id,
              points,
              tier_key,
              goal_points,
              won,
              streak_count,
              finalized_at,
              team_id,
              teams ( name )
          `,
        )
        .eq("season_id", seasonId)
        .order("id", { ascending: true })
        .range(from, to);

      return { data: data as HistoryRow[] | null, error };
    }),
    supabase
      .from("team_standings")
      .select("id, name, tier, season_points, weekly_points")
      .eq("season_id", seasonId)
      .is("archived_at", null),
  ]);

  const rowsByWeek = new Map<string, HistoryRow[]>();
  historyResult.data.forEach((row) => {
    const rows = rowsByWeek.get(row.week_id) ?? [];
    rows.push(row);
    rowsByWeek.set(row.week_id, rows);
  });

  const resultsByWeek = new Map<string, HistoryEntry[]>();
  const winsByTeam = new Map<string, number>();

  [...weeksResult.data].reverse().forEach((week) => {
    const entries = (rowsByWeek.get(week.id) ?? []).map((row) => {
      const wins = (winsByTeam.get(row.team_id) ?? 0) + (row.won ? 1 : 0);
      winsByTeam.set(row.team_id, wins);

      return {
        id: row.id,
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
    });

    resultsByWeek.set(week.id, entries);
  });

  const weeks: HistoryWeek[] = weeksResult.data.map((week) => ({
    id: week.id,
    label: week.label,
    starts_on: week.starts_on,
    results: resultsByWeek.get(week.id) ?? [],
  }));

  const teams = (teamsResult.data ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    tier: team.tier,
    total_points: Number(team.season_points ?? 0),
    weekly_points: 0,
  }));

  const loadError =
    seasonError || weeksResult.error || historyResult.error || teamsResult.error;

  if (loadError) {
    return (
      <div className="rounded-lg border p-5 text-sm text-muted-foreground">
        Error loading history: {loadError.message}
      </div>
    );
  }

  return (
    <HistoryFilters
      weeks={weeks}
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
