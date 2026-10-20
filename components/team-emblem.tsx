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
    <svg viewBox="-4 -4 108 108" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M39 98 2 73c3-5 4-11 4-18V44c3-2 5-4 5.5-7C15 30 26 24 42 22c2-.3 2.4-1.5.5-2.3-1.8-.8-1.6-2 .4-3L32 10l18-8 18 8-10.9 6.7c2 1 2.2 2.2.4 3-1.9.8-1.5 2 .5 2.3 16 2 27 8 30.5 15 .5 3 2.5 5 5.5 7v11c0 7 1 13 4 18L61 98" />
      <path d="M18 54v6l19 9 2 29" />
      <path d="M18 54c10 5 18 7 27 8l-3 11 8 7 8-7-3-11c9-1 17-3 27-8" />
      <path d="M82 54v6l-19 9-2 29" />
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
          "shrink-0",
          validEmblem === "helmet"
            ? size === "sm" ? "h-[18px] w-[18px]" : size === "md" ? "h-6 w-6" : "h-9 w-9"
            : size === "sm" ? "h-5 w-5" : size === "md" ? "h-7 w-7" : "h-11 w-11",
        )}
      />
    </span>
  );
}
