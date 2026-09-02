"use client";

import { useState } from "react";
import { CalendarDays, Dumbbell, Info, Lightbulb, Trophy, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const rules = [
  {
    title: "Join a Team",
    description: "Teams consist of 2 Spartans. Pair up with someone who will push you to hit your goals.",
    icon: UsersRound,
  },
  {
    title: "Weekly Competition",
    description: "The season is divided into weekly matchups (Monday to Monday). Points reset each week.",
    icon: CalendarDays,
  },
  {
    title: "Scoring Points",
    description: "Submit activities daily. Each activity has a point value. Doing activities with your teammate earns bonus points.",
    icon: Dumbbell,
  },
  {
    title: "The Championship",
    description: "Weekly wins and total points determine the ultimate Spartan Games Champions.",
    icon: Trophy,
  },
];

export function RulesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Info aria-hidden="true" />
        Rules
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Rules</DialogTitle>
            <DialogDescription>How to play Spartan Games and win the season.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {rules.map((rule) => {
              const Icon = rule.icon;
              return (
                <div key={rule.title} className="flex gap-3 rounded-control p-3 hover:bg-muted/40">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{rule.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-control border border-achievement/20 bg-achievement/[0.06] p-4">
            <div className="flex items-center gap-2 font-semibold text-achievement">
              <Lightbulb aria-hidden="true" className="h-4 w-4" />
              Pro tips
            </div>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              <li><strong className="text-foreground">Teammate Bonus:</strong> Do activities together for bonus points.</li>
              <li><strong className="text-foreground">Consistency:</strong> Even if you don&apos;t win, points count toward the season.</li>
              <li><strong className="text-foreground">Honesty:</strong> The games rely on the honor system.</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
