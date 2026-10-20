import {
  Compass,
  Flame,
  Mountain,
  Shield,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const TEAM_EMBLEMS = [
  { key: "helmet", label: "Spartan helmet" },
  { key: "flame", label: "Flame" },
  { key: "mountain", label: "Mountain" },
  { key: "wings", label: "Wings" },
  { key: "lightning", label: "Lightning" },
  { key: "shield", label: "Shield" },
  { key: "compass", label: "Compass" },
  { key: "trophy", label: "Trophy" },
] as const;

export const TEAM_COLORS = [
  { key: "purple", label: "Purple", className: "bg-violet-700 text-white ring-violet-300/40" },
  { key: "crimson", label: "Crimson", className: "bg-rose-700 text-white ring-rose-300/40" },
  { key: "gold", label: "Gold", className: "bg-amber-500 text-amber-950 ring-amber-200/50" },
  { key: "navy", label: "Navy", className: "bg-blue-950 text-white ring-blue-300/40" },
  { key: "emerald", label: "Emerald", className: "bg-emerald-700 text-white ring-emerald-300/40" },
  { key: "slate", label: "Slate", className: "bg-slate-700 text-white ring-slate-300/40" },
] as const;

export type TeamEmblemKey = (typeof TEAM_EMBLEMS)[number]["key"];
export type TeamColorKey = (typeof TEAM_COLORS)[number]["key"];

function HelmetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-3 -3 70 70" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 60 3 55c1-2.2 1.5-4.5 1.5-7v-6c2.1-1.5 3.4-3.2 3.9-5.4C10.7 26.1 17.6 20 27 18.5c1.4-.2 1.8-1.4.6-2.1L22 7 32 2l10 5-5.6 9.4c-1.2.7-.8 1.9.6 2.1 9.4 1.5 16.3 7.6 18.6 18.1.5 2.2 1.8 3.9 3.9 5.4v6c0 2.5.5 4.8 1.5 7l-18 5" />
      <path d="M12 40.5V47c3.4 2.3 7.2 4.1 11.4 5.3L21 60" />
      <path d="M12 40.5c5 2.7 10.5 4.4 16.5 5.2L28 51l4 5 4-5-.5-5.3c6-.8 11.5-2.5 16.5-5.2" />
      <path d="M52 40.5V47c-3.4 2.3-7.2 4.1-11.4 5.3L43 60" />
    </svg>
  );
}

function WingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11 18c-3.8 0-7.1-2.1-8.7-5.2 3.1.5 5.3-.4 7-2.8" />
      <path d="M13 18c3.8 0 7.1-2.1 8.7-5.2-3.1.5-5.3-.4-7-2.8" />
      <path d="M9.3 10 12 5l2.7 5L12 20z" />
    </svg>
  );
}

const icons: Record<TeamEmblemKey, LucideIcon | typeof HelmetIcon> = {
  helmet: HelmetIcon,
  flame: Flame,
  mountain: Mountain,
  wings: WingsIcon,
  lightning: Zap,
  shield: Shield,
  compass: Compass,
  trophy: Trophy,
};

export function TeamEmblem({
  emblem = "shield",
  color = "purple",
  size = "md",
  className,
}: {
  emblem?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const validEmblem = TEAM_EMBLEMS.some((item) => item.key === emblem) ? emblem as TeamEmblemKey : "shield";
  const colorOption = TEAM_COLORS.find((item) => item.key === color) ?? TEAM_COLORS[0];
  const Icon = icons[validEmblem];
  const label = TEAM_EMBLEMS.find((item) => item.key === validEmblem)?.label ?? "Team emblem";

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[30%] shadow-sm ring-1 ring-inset",
        colorOption.className,
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-16 w-16 rounded-2xl",
        className,
      )}
    >
      <Icon
        className={cn(
          "shrink-0 overflow-visible",
          size === "sm" ? "h-5 w-5" : size === "md" ? "h-7 w-7" : "h-11 w-11",
        )}
      />
    </span>
  );
}
