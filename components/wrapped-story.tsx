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
import {
  formatWrappedNumber,
  positiveContributionCallout,
  positiveTeamFinishCallout,
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

function activityTotal(activity: WrappedReady["personal"]["top_activity"]) {
  if (!activity) return null;
  if (activity.measurement_type === "number" && activity.numeric_total !== null) {
    return `${formatWrappedNumber(activity.numeric_total)}${activity.unit_label ? ` ${activity.unit_label}` : " units"}`;
  }
  return `${activity.submission_count} ${activity.submission_count === 1 ? "entry" : "entries"}`;
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
  const callout = positiveContributionCallout(
    data.personal.contribution_rank,
    data.personal.participant_count,
  );
  const teamFinishCallout = positiveTeamFinishCallout(
    data.team.tier_rank,
    data.team.tier_team_count,
  );

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
              <h1 className="mt-8 max-w-3xl [font-family:var(--font-cinzel)] text-5xl font-semibold leading-[0.96] tracking-[-0.045em] text-[#fbf7fc] sm:text-6xl lg:text-7xl">
                {data.player.name}, this was your season.
              </h1>
              <p className="mt-5 text-lg text-[#c5b8ca]">{data.season.name}</p>
            </div>
            <div className="border-t border-[#d9cce1]/20 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-sm text-[#c5b8ca]">You competed with</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#fbf7fc]">{data.team.name}</p>
              <p className="mt-2 capitalize text-[#d4a4d9]">{data.team.tier ?? "Open"} tier</p>
            </div>
          </div>
        ),
      },
      {
        id: "contribution",
        content: (
          <div className="max-w-4xl">
            <Trophy aria-hidden="true" className="mb-8 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
            <BigNumber>{formatWrappedNumber(data.personal.points)}</BigNumber>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#fbf7fc] sm:text-5xl">
              points powered your team.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#c5b8ca]">
              That was {formatWrappedNumber(data.personal.team_score_share_percent)}% of {data.team.name}&apos;s final score.
            </p>
            {callout ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-control border border-[#f2cf76]/30 bg-[#f2cf76]/10 px-4 py-2 font-semibold text-[#f2cf76]">
                <Medal aria-hidden="true" className="h-4 w-4" />
                {callout}
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
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
            <div>
              <Activity aria-hidden="true" className="mb-6 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
              <p className="text-lg text-[#c5b8ca]">Your signature activity</p>
              <h2 className="mt-3 text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#fbf7fc] sm:text-6xl">
                {data.personal.top_activity.label}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-6 border-t border-[#d9cce1]/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <StatPair icon={Zap} value={activityTotal(data.personal.top_activity)} label="total logged" />
              <StatPair icon={Trophy} value={formatWrappedNumber(data.personal.top_activity.points)} label="points earned" />
            </div>
          </div>
        ),
      });
    }

    items.push(
      {
        id: "consistency",
        content: (
          <div className="w-full max-w-5xl">
            <CalendarCheck2 aria-hidden="true" className="mb-7 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#fbf7fc] sm:text-6xl">
              You kept showing up.
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
              <StatPair icon={Activity} value={data.personal.activity_count} label="activities" />
              <StatPair icon={CalendarCheck2} value={data.personal.active_days} label="active days" />
              <StatPair icon={Flame} value={data.personal.longest_active_day_run} label="longest day run" />
              <StatPair icon={Target} value={data.personal.active_weeks} label="active weeks" />
            </div>
            {data.personal.best_week ? (
              <p className="mt-10 text-base text-[#c5b8ca]">
                Your strongest week was <strong className="text-[#fbf7fc]">{data.personal.best_week.label}</strong> with {formatWrappedNumber(data.personal.best_week.points)} points.
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "teamwork",
        content: (
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)] lg:items-center">
            <div>
              <UsersRound aria-hidden="true" className="mb-7 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
              <h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#fbf7fc] sm:text-6xl">
                Better together.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#c5b8ca]">
                You logged {data.personal.teammate_activities} activities with a teammate and earned {formatWrappedNumber(data.personal.teammate_bonus_points)} extra points.
              </p>
            </div>
            <div className="space-y-5 border-t border-[#d9cce1]/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {data.team.members.map((member) => (
                <div key={`${member.name}-${member.role}`}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-semibold text-[#fbf7fc]">
                      {member.name}{member.is_current_user ? " (you)" : ""}
                    </p>
                    <p className="app-number text-[#f2cf76]">{formatWrappedNumber(member.contribution_points)} pts</p>
                  </div>
                  <p className="mt-1 text-sm capitalize text-[#9f90a6]">{member.role}</p>
                </div>
              ))}
              {data.team.adjustment_points !== 0 ? (
                <p className="border-t border-[#d9cce1]/20 pt-4 text-sm text-[#c5b8ca]">
                  Team adjustments: {data.team.adjustment_points > 0 ? "+" : ""}{formatWrappedNumber(data.team.adjustment_points)} points
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "team-result",
        content: (
          <div className="w-full max-w-5xl">
            {data.team.is_champion ? (
              <Crown aria-hidden="true" className="mb-7 h-12 w-12 text-[#f2cf76]" strokeWidth={1.6} />
            ) : (
              <Trophy aria-hidden="true" className="mb-7 h-12 w-12 text-[#d4a4d9]" strokeWidth={1.6} />
            )}
            <h2 className="max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#fbf7fc] sm:text-6xl">
              {data.team.is_champion
                ? `${data.team.name} are champions.`
                : teamFinishCallout
                  ? `${data.team.name} earned ${teamFinishCallout}.`
                  : `${data.team.name} made this season count.`}
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
              <StatPair icon={Trophy} value={formatWrappedNumber(data.team.points)} label="team points" />
              <StatPair icon={Medal} value={data.team.weeks_won} label="weeks won" />
              <StatPair icon={Target} value={`${data.team.goals_met}/${data.team.finalized_weeks}`} label="goals met" />
              <StatPair icon={Flame} value={data.team.longest_streak} label="longest streak" />
            </div>
          </div>
        ),
      },
      {
        id: "journey",
        content: (
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end">
            <div>
              <Sparkles aria-hidden="true" className="mb-7 h-10 w-10 text-[#d4a4d9]" strokeWidth={1.6} />
              <h2 className="text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#fbf7fc] sm:text-6xl">
                The team&apos;s defining moments.
              </h2>
              {data.team.best_week ? (
                <div className="mt-8">
                  <p className="text-sm text-[#c5b8ca]">Best week</p>
                  <p className="mt-2 text-2xl font-semibold text-[#fbf7fc]">{data.team.best_week.label}</p>
                  <p className="app-number mt-1 text-[#f2cf76]">{formatWrappedNumber(data.team.best_week.points)} points</p>
                </div>
              ) : null}
            </div>
            <div className="space-y-6 border-t border-[#d9cce1]/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {data.team.top_activity ? (
                <div>
                  <p className="text-sm text-[#c5b8ca]">Team favorite</p>
                  <p className="mt-1 text-2xl font-semibold text-[#fbf7fc]">{data.team.top_activity.label}</p>
                  <p className="mt-1 text-sm text-[#9f90a6]">{activityTotal(data.team.top_activity)}</p>
                </div>
              ) : null}
              {data.team.best_comeback ? (
                <div>
                  <p className="text-sm text-[#c5b8ca]">Biggest climb</p>
                  <p className="app-number mt-1 text-3xl font-semibold text-[#f2cf76]">
                    +{data.team.best_comeback.places_gained} places
                  </p>
                  <p className="mt-1 text-sm text-[#9f90a6]">Finished at #{data.team.best_comeback.rank}</p>
                </div>
              ) : null}
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
              <h2 className="max-w-4xl [font-family:var(--font-cinzel)] text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-[#fbf7fc] sm:text-6xl">
                {data.player.name}, you answered the challenge.
              </h2>
              <p className="mt-5 text-lg text-[#c5b8ca]">{data.season.name} is in the books.</p>
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
  }, [callout, data, teamFinishCallout]);

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

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
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

        {data.preview ? (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#f2cf76]">
            <span className="rounded-control border border-[#f2cf76]/30 bg-[#f2cf76]/10 px-2.5 py-1">Admin preview</span>
            <span className="text-[#c5b8ca]">Live data may change before completion.</span>
          </div>
        ) : null}

        <section
          key={slides[index].id}
          aria-live="polite"
          className={`wrapped-slide-enter flex min-h-0 flex-1 items-center py-8 sm:py-12 ${direction === "back" ? "wrapped-slide-back" : ""}`}
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
