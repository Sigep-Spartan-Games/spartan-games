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
    <svg viewBox="-4 -4 108 110" preserveAspectRatio="xMidYMid meet" className={className} aria-hidden="true">
      <path fill="currentColor" d="M10 39C12 23 25 13 41 7c4.5-1.7 7.5-4.6 9-7 1.8 2.7 5.1 5.4 9.8 7.2C75 13 86 24 90 39L50 26Z" />
      <path fill="currentColor" fillRule="evenodd" d="M8 42 50 28l42 14-2 11c-9 3.4-20 6.8-33 10l1 10-8 8-8-8 1-10c-13-3.2-24-6.6-33-10Zm8 6c7 3.3 16.2 6.5 27 9.4l-.4 6.2c-7.5-2.8-14.2-5.5-20.2-8.2C18.8 53.8 16.5 51.2 16 48Zm68 0c-7 3.3-16.2 6.5-27 9.4l.4 6.2c7.5-2.8 14.2-5.5 20.2-8.2 3.6-1.6 5.9-4.2 6.4-7.4Z" />
      <path fill="currentColor" d="M17 57c5.6 3.5 12.5 6.5 20.5 9L41 102 22 86c-3.6-10.5-5.3-20.2-5-29Z" />
      <path fill="currentColor" d="M83 57c-5.6 3.5-12.5 6.5-20.5 9L59 102l19-16c3.6-10.5 5.3-20.2 5-29Z" />
      <path fill="currentColor" d="M12 54c1.7 8.6.2 16.2-5 23l11 11-2-20c-.8-5.8-2.1-10.5-4-14Z" />
      <path fill="currentColor" d="M88 54c-1.7 8.6-.2 16.2 5 23L82 88l2-20c.8-5.8 2.1-10.5 4-14Z" />
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
          size === "sm" ? "h-5 w-5" : size === "md" ? "h-7 w-7" : "h-11 w-11",
        )}
      />
    </span>
  );
}
