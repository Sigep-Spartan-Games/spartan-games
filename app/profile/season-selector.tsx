"use client";

import { useRouter } from "next/navigation";

type SeasonOption = {
  slug: string;
  name: string;
  is_current: boolean;
};

export function ProfileSeasonSelector({
  seasons,
  value,
}: {
  seasons: SeasonOption[];
  value: string;
}) {
  const router = useRouter();

  return (
    <label className="flex min-w-0 flex-col gap-1.5 sm:min-w-64">
      <span className="app-label">Profile season</span>
      <select
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams();
          params.set("season", event.target.value);
          router.push(`/profile?${params.toString()}`);
        }}
        className="h-11 w-full rounded-control border border-input bg-card px-3 text-base text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30 md:h-10 md:text-sm"
        aria-label="Select profile season"
      >
        {seasons.map((season) => (
          <option key={season.slug} value={season.slug}>
            {season.name}{season.is_current ? " (Current)" : ""}
          </option>
        ))}
        <option value="all">All Seasons</option>
      </select>
    </label>
  );
}
