import { Trophy } from "lucide-react";

import type { SeasonChampion } from "@/lib/champions";
import { TierBadge, TIER_LABELS } from "@/components/competition-badges";

export function ChampionCards({
  champions,
  title = "Season champions",
  description = "Final winners ranked by weekly wins, season points, and goals met.",
}: {
  champions: SeasonChampion[];
  title?: string;
  description?: string;
}) {
  if (champions.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="season-champions-heading">
      <div>
        <p className="text-sm font-semibold text-achievement">Final results</p>
        <h2 id="season-champions-heading" className="mt-1 text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {champions.map((champion) => {
          const tier = champion.tier_key as keyof typeof TIER_LABELS;
          return (
            <article
              key={`${champion.tier_key}:${champion.team_id}`}
              className="rounded-lg border border-achievement/25 bg-achievement/[0.06] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-achievement/15 text-achievement">
                  <Trophy aria-hidden="true" className="h-5 w-5" />
                </div>
                {tier in TIER_LABELS ? <TierBadge tier={tier} /> : null}
              </div>
              <h3 className="mt-4 truncate text-lg font-semibold">{champion.team_name}</h3>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Wins</dt>
                  <dd className="app-number mt-1 font-semibold">{champion.weekly_wins}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Points</dt>
                  <dd className="app-number mt-1 font-semibold">{champion.season_points}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Goals</dt>
                  <dd className="app-number mt-1 font-semibold">{champion.goals_met}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
