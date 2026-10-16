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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7.5 20v-7.2A6.5 6.5 0 0 1 14 6.3h2.5V4H14a9 9 0 0 0-9 9v7" />
      <path d="M7.5 12.5H19l-2.4 3.2h-4.1V20" />
      <path d="M8 7.5 5.5 4.8" />
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
      <Icon className={cn(size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-8 w-8")} />
    </span>
  );
}
