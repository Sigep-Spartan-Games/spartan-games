"use client";

import * as React from "react";
import { TeamEmblem, TEAM_COLORS, TEAM_EMBLEMS } from "@/components/team-emblem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateTeamStyleAction } from "../actions";

export function TeamStyleForm({
  team,
}: {
  team: { id: string; name: string; emblem_key: string; color_key: string; motto: string | null };
}) {
  const [emblem, setEmblem] = React.useState(team.emblem_key);
  const [color, setColor] = React.useState(team.color_key);
  const [motto, setMotto] = React.useState(team.motto ?? "");
  const [name, setName] = React.useState(team.name);

  return (
    <form action={updateTeamStyleAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <input type="hidden" name="teamId" value={team.id} />
      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="newName" className="app-section-heading">Team name</label>
          <input
            id="newName"
            name="newName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={40}
            required
            className="h-11 w-full rounded-control border border-input bg-card px-3 text-base shadow-sm focus:ring-2 focus:ring-ring/30"
          />
          <p className="text-sm text-muted-foreground">Use between 2 and 40 characters.</p>
        </div>

        <fieldset>
          <legend className="app-section-heading">Choose an emblem</legend>
          <p className="mt-1 text-sm text-muted-foreground">A compact mark that appears beside your team everywhere.</p>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {TEAM_EMBLEMS.map((option) => (
              <label key={option.key} className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-2.5 text-center text-[11px] font-medium transition-colors", emblem === option.key ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/40")}>
                <input className="sr-only" type="radio" name="emblem" value={option.key} checked={emblem === option.key} onChange={() => setEmblem(option.key)} />
                <TeamEmblem emblem={option.key} color={color} size="md" />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="app-section-heading">Choose a color</legend>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {TEAM_COLORS.map((option) => (
              <label key={option.key} className={cn("cursor-pointer rounded-xl border p-2 text-center text-xs font-semibold transition-colors", color === option.key ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/40")}>
                <input className="sr-only" type="radio" name="color" value={option.key} checked={color === option.key} onChange={() => setColor(option.key)} />
                <span className={cn("mx-auto mb-2 block h-7 w-7 rounded-full ring-1 ring-inset", option.className)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="motto" className="app-section-heading">Team motto</label>
            <span className="app-number text-xs text-muted-foreground">{motto.length}/40</span>
          </div>
          <input id="motto" name="motto" value={motto} onChange={(event) => setMotto(event.target.value)} maxLength={40} placeholder="Two players. One relentless team." className="h-11 w-full rounded-control border border-input bg-card px-3 text-base shadow-sm focus:ring-2 focus:ring-ring/30" />
          <p className="text-sm text-muted-foreground">Optional. Your motto is visible to signed-in players.</p>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="app-surface-elevated overflow-hidden">
          <div className="h-2 bg-primary" />
          <div className="p-5 text-center">
            <TeamEmblem emblem={emblem} color={color} size="lg" />
            <h2 className="mt-4 text-xl font-semibold">{name.trim() || team.name}</h2>
            <p className="mt-1 min-h-5 text-sm italic text-muted-foreground">{motto || "Your motto will appear here"}</p>
            <Button className="mt-6 w-full" type="submit">Save team customization</Button>
          </div>
        </div>
      </aside>
    </form>
  );
}
