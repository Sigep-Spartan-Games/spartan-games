"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Team = { id: string; name: string };

export default function SubmissionFilters({
    teams,
    teamId,
    dateFilter,
}: {
    teams: Team[];
    teamId: string;
    dateFilter: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    function updateParams(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());

        if (value) params.set(key, value);
        else params.delete(key);

        router.replace(`/admin/submissions?${params.toString()}`);
    }

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1 flex-1">
                <div className="text-sm font-medium">Filter by team</div>
                <select
                    value={teamId}
                    onChange={(e) => updateParams("team", e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                    <option value="">All teams</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-1 flex-1 min-w-0">
                <div className="text-sm font-medium">Filter by activity date</div>
                <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => updateParams("date", e.target.value)}
                    className="h-10 w-full max-w-full rounded-md border bg-background px-3 text-sm cursor-pointer"
                    onClick={(e) => e.currentTarget.showPicker()}
                />
            </div>

            {(teamId || dateFilter) && (
                <button
                    type="button"
                    onClick={() => router.replace("/admin/submissions")}
                    className="h-10 rounded-md border px-4 text-sm hover:bg-muted/50"
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}
