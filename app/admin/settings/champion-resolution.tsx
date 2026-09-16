import { AlertTriangle, Trophy } from "lucide-react";

import type { ChampionTieGroup } from "@/lib/champions";
import { TIER_LABELS, TierBadge } from "@/components/competition-badges";
import { Button } from "@/components/ui/button";

export default function ChampionResolution({
  ties,
  action,
}: {
  ties: ChampionTieGroup[];
  action: (formData: FormData) => Promise<void>;
}) {
  if (ties.length === 0) return null;

  return (
    <section className="rounded-lg border border-achievement/30 bg-achievement/[0.05] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-achievement/15 text-achievement">
          <AlertTriangle aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Champion selection required</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scoring is frozen. Choose one champion for each tier that remains tied after wins, points, and goals met.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-6">
        {ties.map((tie) => {
          const tier = tie.tier_key as keyof typeof TIER_LABELS;
          return (
            <fieldset key={tie.tier_key} className="space-y-3">
              <legend className="flex items-center gap-2 font-semibold">
                {tier in TIER_LABELS ? <TierBadge tier={tier} /> : tie.tier_key}
                <span>tiebreak</span>
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                {tie.candidates.map((candidate) => (
                  <label
                    key={candidate.team_id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/35"
                  >
                    <input
                      type="radio"
                      name={`winner:${tie.tier_key}`}
                      value={candidate.team_id}
                      required
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        <Trophy aria-hidden="true" className="h-4 w-4 text-achievement" />
                        <span className="truncate">{candidate.team_name}</span>
                      </span>
                      <span className="mt-2 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                        <span><strong className="app-number text-foreground">{candidate.weekly_wins}</strong> wins</span>
                        <span><strong className="app-number text-foreground">{candidate.season_points}</strong> points</span>
                        <span><strong className="app-number text-foreground">{candidate.goals_met}</strong> goals</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}

        <label className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
          <input type="checkbox" name="sendEmail" defaultChecked className="h-4 w-4 accent-primary" />
          Send the games-ended notification after champions are locked
        </label>

        <Button type="submit" variant="competition">
          <Trophy aria-hidden="true" />
          Lock champions and complete season
        </Button>
      </form>
    </section>
  );
}
