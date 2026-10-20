"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type TierOption = {
  value: string;
  label: string;
  description: string;
};

function UpdateTierButton({ unchanged }: { unchanged: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={unchanged || pending}
      className="h-11 rounded-control border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-muted/45 disabled:text-muted-foreground disabled:opacity-65 md:h-10"
    >
      {pending ? "Updating…" : "Update tier"}
    </button>
  );
}

export function TeamTierForm({
  action,
  teamId,
  currentTier,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  teamId: string;
  currentTier: string | null;
  options: readonly TierOption[];
}) {
  const initialTier = currentTier ?? "";
  const [selectedTier, setSelectedTier] = useState(initialTier);

  return (
    <form action={action} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="teamId" value={teamId} />
      <label className="flex-1 space-y-2">
        <span className="app-label">Change tier</span>
        <select
          name="tier"
          value={selectedTier}
          onChange={(event) => setSelectedTier(event.target.value)}
          className="h-11 w-full rounded-control border border-input bg-card px-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted disabled:opacity-70 md:h-10 md:text-sm"
        >
          {!initialTier ? <option value="" disabled>Select a tier</option> : null}
          {options.map((tier) => (
            <option key={tier.value} value={tier.value}>
              {tier.label} ({tier.description})
            </option>
          ))}
        </select>
      </label>
      <UpdateTierButton unchanged={selectedTier === initialTier} />
    </form>
  );
}
