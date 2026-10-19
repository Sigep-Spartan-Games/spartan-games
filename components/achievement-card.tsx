import {
  CalendarCheck,
  Compass,
  Crown,
  Flag,
  Flame,
  Footprints,
  Handshake,
  Medal,
  Scale,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AchievementCardData, AchievementLevel } from "@/lib/achievements";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  footprints: Footprints, medal: Medal, zap: Zap, flame: Flame, compass: Compass,
  "calendar-check": CalendarCheck, users: UsersRound, flag: Flag, handshake: Handshake,
  trophy: Trophy, target: Target, crown: Crown, scale: Scale, "trending-up": TrendingUp,
  laurel: Medal, helmet: Shield,
};

const levelStyles: Record<AchievementLevel, string> = {
  bronze: "border-orange-700/25 bg-orange-700/10 text-orange-800 dark:text-orange-300",
  silver: "border-slate-400/35 bg-slate-400/10 text-slate-700 dark:text-slate-200",
  gold: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  platinum: "border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
};

function levelLabel(level: AchievementLevel | null, standalone: boolean, earned: boolean) {
  if (standalone) return earned ? "Earned" : "Locked";
  return level ? level.charAt(0).toUpperCase() + level.slice(1) : "In progress";
}

export function AchievementCard({ card, compact = false, className }: { card: AchievementCardData; compact?: boolean; className?: string }) {
  const Icon = icons[card.icon_key] ?? Shield;
  const standalone = card.kind === "standalone";
  const progressMax = card.next_threshold ?? card.current_threshold ?? Math.max(card.value, 1);
  const progress = card.earned && (!card.next_threshold || standalone)
    ? 100
    : Math.min(100, Math.round((card.value / Math.max(progressMax, 1)) * 100));
  const tone = card.level ? levelStyles[card.level] : card.earned ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted/25 text-muted-foreground";

  return (
    <article className={cn("flex shrink-0 snap-start flex-col rounded-xl border p-3 sm:p-3.5", tone, compact ? "w-[12.5rem]" : "w-[calc((100%-0.5rem)/2)] sm:w-[15rem]", className)}>
      <div className="flex items-start gap-2 sm:gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70 shadow-sm sm:h-9 sm:w-9">
          <Icon aria-hidden="true" className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{card.name}</p>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide">{levelLabel(card.level, standalone, card.earned)}</p>
        </div>
      </div>
      {!compact ? <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{card.description}</p> : null}
      {card.detail ? <p className="mt-2 text-xs font-semibold text-foreground">{card.detail}</p> : null}
      {!compact && card.tier_history?.length ? (
        <div className="mt-3 flex flex-wrap gap-1" aria-label="Tier history">
          {card.tier_history.map((tier) => (
            <span key={tier.level} title={tier.earned_at ? `Earned ${new Date(tier.earned_at).toLocaleDateString()}` : `${tier.threshold} ${card.unit}`} className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", tier.earned ? "border-current bg-background/55" : "border-border/70 text-muted-foreground opacity-60")}>
              {tier.level.slice(0, 1)} · {tier.threshold}
            </span>
          ))}
        </div>
      ) : null}
      {!compact && standalone && card.earned_at ? <p className="mt-3 text-[11px] text-muted-foreground">Earned {new Date(card.earned_at).toLocaleDateString()}</p> : null}
      {!standalone ? (
        <div className="mt-auto pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-1 text-[10px] font-medium text-muted-foreground sm:gap-2 sm:text-[11px]">
            <span>{card.value.toLocaleString()} {card.unit}</span>
            <span>{card.next_threshold ? `${card.next_threshold.toLocaleString()} next` : "Max tier"}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-label={`${progress}% progress`}>
            <div className="h-full rounded-full bg-current transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function AchievementRail({ title, cards, compact = false }: { title: string; cards: AchievementCardData[]; compact?: boolean }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="app-section-heading">{title}</h2>
        <span className="text-xs text-muted-foreground">Swipe to explore</span>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:gap-3 sm:px-0">
        {cards.map((card) => <AchievementCard key={card.key} card={card} compact={compact} />)}
      </div>
    </section>
  );
}
