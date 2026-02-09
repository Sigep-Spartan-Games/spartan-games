// app/admin/teams/team-filters.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface TeamFiltersProps {
    currentSearch: string;
    currentProgress: string;
    currentTier: string;
}

export default function TeamFilters({
    currentSearch,
    currentProgress,
    currentTier,
}: TeamFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        startTransition(() => {
            router.push(`/admin/teams?${params.toString()}`);
        });
    };

    return (
        <div className="rounded-2xl border p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* Search by name */}
                <div className="flex-1 space-y-1">
                    <label htmlFor="search" className="text-xs font-medium text-muted-foreground">
                        Search Team
                    </label>
                    <input
                        id="search"
                        type="text"
                        placeholder="Search by name..."
                        defaultValue={currentSearch}
                        onChange={(e) => updateFilters("search", e.target.value)}
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                </div>

                {/* Filter by progress */}
                <div className="space-y-1">
                    <label htmlFor="progress" className="text-xs font-medium text-muted-foreground">
                        Progress
                    </label>
                    <select
                        id="progress"
                        value={currentProgress}
                        onChange={(e) => updateFilters("progress", e.target.value)}
                        className="h-9 rounded-md border bg-background px-3 text-sm min-w-[140px]"
                    >
                        <option value="">All Teams</option>
                        <option value="below">Below Goal</option>
                        <option value="met">Met Goal</option>
                    </select>
                </div>

                {/* Filter by tier */}
                <div className="space-y-1">
                    <label htmlFor="tier" className="text-xs font-medium text-muted-foreground">
                        Tier
                    </label>
                    <select
                        id="tier"
                        value={currentTier}
                        onChange={(e) => updateFilters("tier", e.target.value)}
                        className="h-9 rounded-md border bg-background px-3 text-sm min-w-[120px]"
                    >
                        <option value="">All Tiers</option>
                        <option value="gold">🥇 Gold</option>
                        <option value="purple">🟣 Purple</option>
                        <option value="red">🔴 Red</option>
                    </select>
                </div>
            </div>

            {isPending && (
                <div className="text-xs text-muted-foreground">Filtering...</div>
            )}
        </div>
    );
}
