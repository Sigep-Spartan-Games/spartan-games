"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Crown,
  Flame,
  Medal,
  RefreshCcw,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  Zap,
} from "lucide-react";

import Spartan from "@/app/assets/spartan.png";
import { Button } from "@/components/ui/button";
import { getWrappedStoryCopy } from "@/lib/wrapped-copy";
import {
  contributionRankCallouts,
  formatWrappedDate,
  formatWrappedNumber,
  titleCaseTier,
  type WrappedReady,
} from "@/lib/wrapped";

type StorySlide = {
  id: string;
  content: React.ReactNode;
};

function BigNumber({ children }: { children: React.ReactNode }) {
  return (
    <p className="app-number text-5xl font-semibold leading-none tracking-[-0.055em] text-[#f2cf76] sm:text-7xl lg:text-8xl">
      {children}
    </p>
  );
}

function SlideHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#fbf7fc] sm:text-6xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#c5b8ca] sm:text-lg">
        {subtitle}
      </p>
    </div>
  );
}

function StatPair({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Trophy;
}) {
  return (
    <div className="border-l border-[#d9cce1]/25 pl-4">
      <Icon aria-hidden="true" className="mb-3 h-5 w-5 text-[#d4a4d9]" strokeWidth={1.8} />
      <p className="app-number text-2xl font-semibold text-[#fbf7fc] sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-[#c5b8ca]">{label}</p>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-snug text-[#9f90a6]">{label}</dt>
      <dd className="app-number mt-1 break-words text-base font-semibold leading-tight text-[#fbf7fc] sm:text-lg">
        {value}
      </dd>
    </div>
  );
}

function activityTotal(activity: WrappedReady["personal"]["top_activity"]) {
  if (!activity) return null;
  if (activity.measurement_type === "number" && activity.numeric_total !== null) {
    return `${formatWrappedNumber(activity.numeric_total)}${activity.unit_label ? ` ${activity.unit_label}` : " units"}`;
  }
  return `${activity.submission_count} ${activity.submission_count === 1 ? "submission" : "submissions"}`;
}

function teammateNames(data: WrappedReady) {
  return data.team.members
    .filter((member) => !member.is_current_user)
    .map((member) => member.name)
    .join(" and ");
}

export function WrappedStory({
  data,
  closeHref = "/profile",
}: {
  data: WrappedReady;
  closeHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const pointerStart = useRef<number | null>(null);
  const copy = useMemo(() => getWrappedStoryCopy(data), [data]);
  const rankCallouts = useMemo(() => contributionRankCallouts(data.personal), [data.personal]);
  const tier = titleCaseTier(data.team.tier);
  const teammates = teammateNames(data);
  const teamFinish = data.team.is_champion
    ? "Champions"
    : data.team.tier_rank
      ? `#${data.team.tier_rank} of ${data.team.tier_team_count ?? "?"}`
      : "Completed";

  const slides = useMemo<StorySlide[]>(() => {
    const items: StorySlide[] = [
      {
        id: "cover",
        content: (
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#d4a4d9]/25 bg-[#d4a4d9]/10">
                  <Image src={Spartan} alt="" className="h-10 w-10 object-contain invert" priority />
                </span>
                <p className="text-sm font-semibold text-[#d4a4d9]">Spartan Games</p>
              </div>
              <h1 className="mt-8 max-w-4xl [font-family:var(--font-cinzel)] text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#fbf7fc] sm:text-6xl lg:text-7xl">
                {copy.cover.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#c5b8ca]">{copy.cover.subtitle}</p>
            </div>
            <div className="border-t border-[#d9cce1]/20 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-sm text-[#c5b8ca]">You competed with</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#fbf7fc]">{data.team.name}</p>
              <p className="mt-2 text-[#d4a4d9]">{data.season.name}</p>
            </div>
          </div>
        ),
      },
      {
        id: "contribution",
        content: (
          <div className="w-full max-w-5xl">
            <Trophy aria-hidden="true" className="mb-7 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
            <BigNumber>{formatWrappedNumber(data.personal.points)}</BigNumber>
            <h2 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-[#fbf7fc] sm:text-5xl">
              {copy.contribution.title}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#c5b8ca]">
              You contributed {formatWrappedNumber(data.personal.team_score_share_percent)}% of {data.team.name}&apos;s final score.
            </p>
            <p className="mt-2 max-w-2xl text-sm text-[#9f90a6]">{copy.contribution.subtitle}</p>
            {rankCallouts.length > 0 ? (
              <div className="mt-7 grid max-w-3xl gap-3 sm:grid-cols-2">
                {rankCallouts.map((callout) => (
                  <div
                    key={callout}
                    className="flex items-start gap-2 rounded-lg border border-[#f2cf76]/30 bg-[#f2cf76]/10 px-4 py-3 font-semibold text-[#f2cf76]"
                  >
                    <Medal aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{callout}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ),
      },
    ];

    if (data.personal.top_activity) {
      items.push({
        id: "favorite",
        content: (
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
            <div>
              <Activity aria-hidden="true" className="mb-6 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
              <SlideHeading title={copy.favorite.title} subtitle={copy.favorite.subtitle} />
              <p className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#f2cf76] sm:text-6xl">
                {data.personal.top_activity.label}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6 border-t border-[#d9cce1]/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <StatPair icon={Zap} value={activityTotal(data.personal.top_activity)} label="Total logged" />
              <StatPair icon={Trophy} value={formatWrappedNumber(data.personal.top_activity.points)} label="Points earned" />
            </div>
          </div>
        ),
      });
    }

    items.push(
      {
        id: "consistency",
        content: (
          <div className="w-full max-w-6xl">
            <CalendarCheck2 aria-hidden="true" className="mb-6 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
            <SlideHeading title={copy.consistency.title} subtitle={copy.consistency.subtitle} />
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3">
              <StatPair icon={Activity} value={data.personal.activity_count} label="Submissions logged" />
              <StatPair icon={Flame} value={data.personal.longest_active_day_run} label="Your longest activity streak" />
              <StatPair icon={Target} value={data.personal.active_weeks} label="Active weeks" />
            </div>
            <div className="mt-8 grid gap-5 border-t border-[#d9cce1]/20 pt-5 sm:grid-cols-2">
              {data.personal.best_day ? (
                <div>
                  <p className="text-sm text-[#9f90a6]">Your best day</p>
                  <p className="mt-1 text-xl font-semibold text-[#fbf7fc]">{formatWrappedDate(data.personal.best_day.date)}</p>
                  <p className="mt-1 text-sm text-[#c5b8ca]">
                    {formatWrappedNumber(data.personal.best_day.points)} points from {data.personal.best_day.submission_count} {data.personal.best_day.submission_count === 1 ? "submission" : "submissions"}
                  </p>
                </div>
              ) : null}
              {data.personal.best_week ? (
                <div>
                  <p className="text-sm text-[#9f90a6]">Your best week</p>
                  <p className="mt-1 text-xl font-semibold text-[#fbf7fc]">{data.personal.best_week.label}</p>
                  <p className="mt-1 text-sm text-[#c5b8ca]">{formatWrappedNumber(data.personal.best_week.points)} points</p>
                </div>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "teamwork",
        content: (
          <div className="grid w-full gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)] lg:items-center">
            <div>
              <UsersRound aria-hidden="true" className="mb-6 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
              <SlideHeading title={copy.teamwork.title} subtitle={copy.teamwork.subtitle} />
              {teammates ? (
                <p className="mt-5 text-sm text-[#9f90a6]">Your team included {teammates}.</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-6 border-t border-[#d9cce1]/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <StatPair icon={UsersRound} value={data.personal.teammate_activities} label="Teammate submissions" />
              <StatPair icon={Zap} value={formatWrappedNumber(data.personal.teammate_bonus_points)} label="Teammate bonus points" />
            </div>
          </div>
        ),
      },
      {
        id: "team-result",
        content: (
          <div className="w-full max-w-6xl">
            {data.team.is_champion ? (
              <Crown aria-hidden="true" className="mb-6 h-12 w-12 text-[#f2cf76]" strokeWidth={1.6} />
            ) : (
              <Trophy aria-hidden="true" className="mb-6 h-12 w-12 text-[#d4a4d9]" strokeWidth={1.6} />
            )}
            <SlideHeading title={copy.teamResult.title} subtitle={copy.teamResult.subtitle} />
            <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
              <StatPair icon={Trophy} value={formatWrappedNumber(data.team.points)} label="Team points" />
              <StatPair icon={Medal} value={data.team.weeks_won} label="Weekly wins" />
              <StatPair icon={Target} value={`${data.team.goals_met}/${data.team.finalized_weeks}`} label="Goals met" />
              <StatPair icon={Flame} value={data.team.longest_streak} label="Team's longest scoring streak" />
            </div>
          </div>
        ),
      },
      {
        id: "team-highlights",
        content: (
          <div className="w-full max-w-6xl">
            <Sparkles aria-hidden="true" className="mb-6 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
            <SlideHeading title={copy.highlights.title} subtitle={copy.highlights.subtitle} />
            <div className="mt-8 grid gap-7 border-t border-[#d9cce1]/20 pt-6 sm:grid-cols-3">
              {data.team.top_activity ? (
                <div>
                  <p className="text-sm text-[#9f90a6]">Team&apos;s favorite activity</p>
                  <p className="mt-2 text-2xl font-semibold text-[#fbf7fc]">{data.team.top_activity.label}</p>
                  <p className="mt-1 text-sm text-[#c5b8ca]">{activityTotal(data.team.top_activity)}</p>
                </div>
              ) : null}
              {data.team.best_week ? (
                <div>
                  <p className="text-sm text-[#9f90a6]">Team&apos;s best week</p>
                  <p className="mt-2 text-2xl font-semibold text-[#fbf7fc]">{data.team.best_week.label}</p>
                  <p className="app-number mt-1 text-sm text-[#f2cf76]">{formatWrappedNumber(data.team.best_week.points)} points</p>
                </div>
              ) : null}
              {data.team.best_comeback ? (
                <div>
                  <p className="text-sm text-[#9f90a6]">Team&apos;s biggest comeback</p>
                  <p className="app-number mt-2 text-3xl font-semibold text-[#f2cf76]">
                    +{data.team.best_comeback.places_gained} places
                  </p>
                  <p className="mt-1 text-sm text-[#c5b8ca]">
                    From #{data.team.best_comeback.previous_rank} to #{data.team.best_comeback.rank}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "summary",
        content: (
          <div className="w-full max-w-6xl py-2">
            <SlideHeading title={copy.summary.title} subtitle={copy.summary.subtitle} />
            <div className="mt-7 grid gap-7 lg:grid-cols-2">
              <section aria-labelledby="personal-summary-heading" className="rounded-lg border border-[#d9cce1]/20 bg-[#fbf7fc]/[0.035] p-5">
                <h3 id="personal-summary-heading" className="text-lg font-semibold text-[#d4a4d9]">Your statistics</h3>
                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
                  <SummaryMetric label="Individual contribution" value={`${formatWrappedNumber(data.personal.points)} pts`} />
                  <SummaryMetric label="Team score share" value={`${formatWrappedNumber(data.personal.team_score_share_percent)}%`} />
                  <SummaryMetric label="Submissions logged" value={data.personal.activity_count} />
                  <SummaryMetric label="Longest activity streak" value={`${data.personal.longest_active_day_run} days`} />
                  <SummaryMetric label="Active weeks" value={data.personal.active_weeks} />
                  <SummaryMetric label="Favorite activity" value={data.personal.top_activity?.label ?? "None"} />
                  <SummaryMetric label="Best day" value={data.personal.best_day ? `${formatWrappedDate(data.personal.best_day.date)}, ${formatWrappedNumber(data.personal.best_day.points)} pts` : "None"} />
                  <SummaryMetric label="Best week" value={data.personal.best_week ? `${data.personal.best_week.label}, ${formatWrappedNumber(data.personal.best_week.points)} pts` : "None"} />
                  <SummaryMetric label="Teammate submissions" value={data.personal.teammate_activities} />
                  <SummaryMetric label="Teammate bonus" value={`${formatWrappedNumber(data.personal.teammate_bonus_points)} pts`} />
                </dl>
                {rankCallouts.length > 0 ? (
                  <div className="mt-5 space-y-1 border-t border-[#d9cce1]/15 pt-4 text-xs font-semibold text-[#f2cf76]">
                    {rankCallouts.map((callout) => <p key={callout}>{callout}</p>)}
                  </div>
                ) : null}
              </section>

              <section aria-labelledby="team-summary-heading" className="rounded-lg border border-[#d9cce1]/20 bg-[#fbf7fc]/[0.035] p-5">
                <h3 id="team-summary-heading" className="text-lg font-semibold text-[#d4a4d9]">{data.team.name} statistics</h3>
                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
                  <SummaryMetric label="Tier" value={tier} />
                  <SummaryMetric label="Tier finish" value={teamFinish} />
                  <SummaryMetric label="Team points" value={`${formatWrappedNumber(data.team.points)} pts`} />
                  <SummaryMetric label="Submissions logged" value={data.team.activity_count} />
                  <SummaryMetric label="Weekly wins" value={data.team.weeks_won} />
                  <SummaryMetric label="Goals met" value={`${data.team.goals_met}/${data.team.finalized_weeks}`} />
                  <SummaryMetric label="Team's longest scoring streak" value={`${data.team.longest_streak} days`} />
                  <SummaryMetric label="Team's favorite activity" value={data.team.top_activity?.label ?? "None"} />
                  <SummaryMetric label="Team's best week" value={data.team.best_week ? `${data.team.best_week.label}, ${formatWrappedNumber(data.team.best_week.points)} pts` : "None"} />
                  <SummaryMetric label="Team's biggest comeback" value={data.team.best_comeback ? `+${data.team.best_comeback.places_gained} places` : "None"} />
                </dl>
              </section>
            </div>
          </div>
        ),
      },
      {
        id: "finale",
        content: (
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-end">
            <div>
              <Image src={Spartan} alt="" className="mb-7 h-16 w-16 object-contain invert" />
              <h2 className="max-w-4xl [font-family:var(--font-cinzel)] text-4xl font-semibold leading-[1.06] tracking-[-0.04em] text-[#fbf7fc] sm:text-6xl">
                {copy.finale.title}
              </h2>
              <p className="mt-5 text-lg text-[#c5b8ca]">{copy.finale.subtitle}</p>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#d9cce1]/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <Button asChild className="bg-[#f2cf76] text-[#211923] hover:bg-[#f7dc98]">
                <Link href={`/profile?season=${encodeURIComponent(data.season.slug)}`}>
                  View season profile
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#d9cce1]/30 bg-transparent text-[#fbf7fc] hover:bg-[#fbf7fc]/10 hover:text-[#fbf7fc]"
                onClick={() => {
                  setDirection("back");
                  setIndex(0);
                }}
              >
                <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                Replay
              </Button>
            </div>
          </div>
        ),
      },
    );

    return items;
  }, [copy, data, rankCallouts, teamFinish, teammates, tier]);

  const goTo = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    setDirection(nextIndex > index ? "forward" : "back");
    setIndex(nextIndex);
  }, [index, slides.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goTo(Math.min(index + 1, slides.length - 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(Math.max(index - 1, 0));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goTo, index, slides.length]);

  return (
    <main
      className="fixed inset-0 z-50 min-h-[100dvh] overflow-hidden bg-[#17121b] text-[#fbf7fc]"
      aria-label={`${data.season.name} Wrapped`}
      onPointerDown={(event) => {
        pointerStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStart.current === null) return;
        const distance = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(distance) < 60) return;
        goTo(distance < 0 ? Math.min(index + 1, slides.length - 1) : Math.max(index - 1, 0));
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#8d2854]/25 blur-3xl" />
        <div className="absolute -bottom-52 -left-40 h-[38rem] w-[38rem] rounded-full bg-[#6d3a7b]/20 blur-3xl" />
        <div className="wrapped-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative mx-auto flex h-full max-h-[100dvh] max-w-7xl flex-col px-4 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-label={`Slide ${index + 1} of ${slides.length}`}>
            {slides.map((slide, slideIndex) => (
              <span
                key={slide.id}
                className={`h-1 flex-1 rounded-full transition-colors ${slideIndex <= index ? "bg-[#f2cf76]" : "bg-[#d9cce1]/20"}`}
              />
            ))}
          </div>
          <Link
            href={closeHref}
            aria-label="Close Wrapped"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-[#d9cce1]/25 bg-[#fbf7fc]/5 text-[#fbf7fc] transition-colors hover:bg-[#fbf7fc]/10"
          >
            <CircleX aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
          </Link>
        </div>

        <section
          key={slides[index].id}
          aria-live="polite"
          className={`wrapped-slide-enter flex min-h-0 flex-1 items-start overflow-y-auto py-7 md:items-center md:py-10 ${direction === "back" ? "wrapped-slide-back" : ""}`}
        >
          {slides[index].content}
        </section>

        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="border-[#d9cce1]/25 bg-transparent text-[#fbf7fc] hover:bg-[#fbf7fc]/10 hover:text-[#fbf7fc] disabled:border-[#d9cce1]/10 disabled:text-[#9f90a6]"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Button>
          <p className="app-number text-xs text-[#9f90a6]">{index + 1} / {slides.length}</p>
          {index < slides.length - 1 ? (
            <Button
              type="button"
              onClick={() => goTo(index + 1)}
              className="bg-[#f2cf76] text-[#211923] hover:bg-[#f7dc98]"
            >
              Next
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild className="bg-[#f2cf76] text-[#211923] hover:bg-[#f7dc98]">
              <Link href={closeHref}>
                Done
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
