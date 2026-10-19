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
        "relative inline-flex h-7 w-7 shrink-0 items-center justify-center",
        className,
      )}
      title={`${count} day scoring streak`}
      aria-label={`${count} day scoring streak`}
    >
      <Flame aria-hidden="true" className="absolute inset-0 h-7 w-7 fill-competition text-competition drop-shadow-sm" />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2 text-[9px] font-black leading-none tracking-[-0.08em] text-competition-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_1px_1px_rgba(255,255,255,0.25)]"
      >
        {count}
      </span>
    </span>
  );
}
