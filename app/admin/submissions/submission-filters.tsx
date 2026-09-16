"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Team = { id: string; name: string; season_id: string };
type Season = { id: string; name: string; status: string };

export default function SubmissionFilters({
  teams,
  seasons,
  teamId,
  seasonId,
  dateFilter,
  statusFilter,
}: {
  teams: Team[];
  seasons: Season[];
  teamId: string;
  seasonId: string;
  dateFilter: string;
  statusFilter: "all" | "active" | "voided";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visibleTeams = seasonId
    ? teams.filter((team) => team.season_id === seasonId)
    : teams;

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "all") params.set(key, value);
    else params.delete(key);

    if (key === "season") params.delete("team");
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `/admin/submissions?${query}` : "/admin/submissions");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
      <label className="min-w-0 space-y-1">
        <span className="block text-sm font-medium">Season</span>
        <select
          value={seasonId}
          onChange={(event) => updateParams("season", event.target.value)}
          className="h-11 w-full rounded-control border bg-background px-3 text-sm"
        >
          <option value="">All seasons</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name} ({season.status})
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 space-y-1">
        <span className="block text-sm font-medium">Team</span>
        <select
          value={teamId}
          onChange={(event) => updateParams("team", event.target.value)}
          className="h-11 w-full rounded-control border bg-background px-3 text-sm"
        >
          <option value="">All teams</option>
          {visibleTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 space-y-1">
        <span className="block text-sm font-medium">Activity date</span>
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => updateParams("date", event.target.value)}
          className="box-border h-11 w-full cursor-pointer rounded-control border bg-background px-3 text-sm"
          onClick={(event) => event.currentTarget.showPicker()}
        />
      </label>

      <label className="min-w-0 space-y-1">
        <span className="block text-sm font-medium">Record status</span>
        <select
          value={statusFilter}
          onChange={(event) => updateParams("status", event.target.value)}
          className="h-11 w-full rounded-control border bg-background px-3 text-sm"
        >
          <option value="all">Active and voided</option>
          <option value="active">Active only</option>
          <option value="voided">Voided only</option>
        </select>
      </label>

      {teamId || seasonId || dateFilter || statusFilter !== "all" ? (
        <button
          type="button"
          onClick={() => router.replace("/admin/submissions")}
          className="h-11 rounded-control border px-4 text-sm hover:bg-muted/50 xl:col-start-4"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
