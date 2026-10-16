import Link from "next/link";
import { Activity, ArrowRight, Crown, Flame, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatWrappedNumber,
  positiveContributionCallout,
  type WrappedReady,
} from "@/lib/wrapped";

export function WrappedRecap({
  data,
  href = `/wrapped/${data.season.slug}`,
  actionLabel = "Replay Wrapped",
}: {
  data: WrappedReady;
  href?: string;
  actionLabel?: string;
}) {
  const callout = positiveContributionCallout(
    data.personal.contribution_rank,
    data.personal.participant_count,
  );

  return (
    <section
      aria-labelledby="wrapped-recap-heading"
      className="relative overflow-hidden rounded-lg border border-primary/20 bg-card"
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary via-competition to-achievement" />
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-center">
        <div className="min-w-0 pl-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            {data.team.is_champion ? (
              <Crown aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Trophy aria-hidden="true" className="h-4 w-4" />
            )}
            {data.season.name} Wrapped
          </div>
          <h2 id="wrapped-recap-heading" className="mt-2 text-2xl font-semibold tracking-tight">
            {data.team.is_champion
              ? `${data.team.name} finished as champions.`
              : `Relive your season with ${data.team.name}.`}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Your personal highlights, favorite activity, strongest week, and team journey are ready.
          </p>
          <div className="mt-5">
            <Button asChild variant="competition">
              <Link href={href}>
                {actionLabel}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Trophy aria-hidden="true" className="h-3.5 w-3.5" />
              Your points
            </dt>
            <dd className="app-number mt-1 text-2xl font-semibold text-achievement">
              {formatWrappedNumber(data.personal.points)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Activity aria-hidden="true" className="h-3.5 w-3.5" />
              Activities
            </dt>
            <dd className="app-number mt-1 text-2xl font-semibold">
              {data.personal.activity_count}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Flame aria-hidden="true" className="h-3.5 w-3.5" />
              Active days
            </dt>
            <dd className="app-number mt-1 text-2xl font-semibold">
              {data.personal.active_days}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              {callout ?? "Team share"}
            </dt>
            <dd className="app-number mt-1 text-2xl font-semibold text-primary">
              {callout ? `#${data.personal.contribution_rank}` : `${formatWrappedNumber(data.personal.team_score_share_percent)}%`}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
