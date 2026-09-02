import {
  CalendarDays,
  Dumbbell,
  Handshake,
  Lightbulb,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const gameRules = [
  {
    title: "Join a Team",
    description:
      "Teams consist of 2 Spartans. You can create a new team or join an existing one using an invite code. Pair up with someone who will push you to hit your goals.",
    icon: UsersRound,
    accent: "bg-primary/10 text-primary",
  },
  {
    title: "Weekly Competition",
    description:
      "The season is divided into weekly matchups (Monday to Monday). Points accumulate during the week to determine the weekly winner. At the end of the week, points reset, and a new battle begins.",
    icon: CalendarDays,
    accent: "bg-competition/10 text-competition",
  },
  {
    title: "Scoring Points",
    description:
      'Submit your activities daily via the "Submit" tab. Activities vary from gym workouts and running to mental challenges. Each activity has a point value, and some have caps on how often you can do them.',
    icon: Dumbbell,
    accent: "bg-primary/10 text-primary",
  },
  {
    title: "The Championship",
    description:
      "While every week has its own winner, your consistent performance counts. Weekly wins and total points accumulated throughout the season determine the ultimate Spartan Games Champions.",
    icon: Trophy,
    accent: "bg-achievement/10 text-achievement",
  },
];

const tips = [
  {
    title: "Teammate Bonus",
    description: "Do activities together with your teammate to earn bonus points per submission.",
    icon: Handshake,
  },
  {
    title: "Consistency is Key",
    description: "Even if you don't win the week, your points contribute to your season total.",
    icon: CalendarDays,
  },
  {
    title: "Honesty Policy",
    description: "The games rely on the honor system. Be true to yourself and your brothers.",
    icon: ShieldCheck,
  },
];

export default function RulesPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Game rules"
        description="How to play Spartan Games and compete throughout the season."
      />

      <section aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className="sr-only">How it works</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {gameRules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <Card key={rule.title} className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${rule.accent}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="app-label">Step {index + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight">{rule.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="pro-tips-heading"
        className="rounded-lg border border-achievement/20 bg-achievement/[0.05] p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 text-achievement">
          <Lightbulb aria-hidden="true" className="h-5 w-5" />
          <h2 id="pro-tips-heading" className="text-lg font-semibold text-foreground">
            Pro tips
          </h2>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.title} className="flex gap-3">
                <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-achievement" />
                <div>
                  <h3 className="text-sm font-semibold">{tip.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
