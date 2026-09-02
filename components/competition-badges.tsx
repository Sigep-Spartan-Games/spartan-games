import { Flame, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export const TIER_LABELS = {
  gold: "Gold",
  purple: "Purple",
  red: "Red",
} as const;

const tierStyles = {
  gold: "border-achievement/25 bg-achievement/10 text-achievement",
  purple: "border-primary/20 bg-primary/10 text-primary",
  red: "border-competition/20 bg-competition/10 text-competition",
};

export function TierBadge({ tier, className }: {
  tier: keyof typeof TIER_LABELS;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
      tierStyles[tier],
      className,
    )}>
      <Medal aria-hidden="true" className="h-3.5 w-3.5" />
      {TIER_LABELS[tier]}
    </span>
  );
}

export function StreakBadge({ count, className }: { count: number; className?: string }) {
  if (count < 2) return null;

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-full border border-competition/20 bg-competition/10 px-2.5 py-0.5 text-xs font-semibold text-competition",
        className,
      )}
      title="Active streak"
    >
      <Flame aria-hidden="true" className="h-3.5 w-3.5" />
      {count} day streak
    </span>
  );
}
