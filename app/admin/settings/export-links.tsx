"use client";

import { useState } from "react";

export default function ExportLinks() {
  const [scope, setScope] = useState<"current" | "all">("current");
  const suffix = `?scope=${scope}`;

  return (
    <div className="space-y-4">
      <label className="block max-w-xs space-y-1">
        <span className="text-sm font-medium">Export scope</span>
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value === "all" ? "all" : "current")}
          className="h-11 w-full rounded-control border bg-background px-3 text-sm text-foreground"
        >
          <option value="current">Current season</option>
          <option value="all">All seasons archive</option>
        </select>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          href={`/admin/settings/export/spartan-games.xlsx${suffix}`}
        >
          Download Excel (.xlsx)
        </a>
        <a
          className="inline-flex min-h-11 items-center justify-center rounded-control border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          href={`/admin/settings/export/submissions.csv${suffix}`}
        >
          Download Submissions CSV
        </a>
        <a
          className="inline-flex min-h-11 items-center justify-center rounded-control border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          href={`/admin/settings/export/teams.csv${suffix}`}
        >
          Download Teams CSV
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        Current season is the default. Archive exports include season identifiers and retained historical rows.
      </p>
    </div>
  );
}
