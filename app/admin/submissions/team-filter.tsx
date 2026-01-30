"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Team = { id: string; name: string };

export default function TeamFilter({
  teams,
  teamId,
}: {
  teams: Team[];
  teamId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">Filter by team</div>
      <select
        value={teamId}
        onChange={(e) => {
          const next = e.target.value;
          const params = new URLSearchParams(searchParams.toString());

          if (next) params.set("team", next);
          else params.delete("team");

          router.replace(`/admin/submissions?${params.toString()}`);
        }}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-80"
      >
        <option value="">All teams</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
