"use client";

import * as React from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { AchievementRail } from "@/components/achievement-card";
import { TeamEmblem } from "@/components/team-emblem";
import { TierBadge } from "@/components/competition-badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { parseTeamProfile, type TeamProfile } from "@/lib/achievements";
import type { TeamDirectoryRow } from "@/lib/team-data";

export function TeamDetailsDialog({ team }: { team: TeamDirectoryRow }) {
  const [open, setOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<TeamProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || profile || error) return;
    let active = true;
    const supabase = createClient();
    supabase.rpc("get_team_profile_v1", { p_team_id: team.id }).then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) setError(rpcError.message);
      else setProfile(parseTeamProfile(data));
    });
    return () => { active = false; };
  }, [error, open, profile, team.id]);

  const shown = profile ?? {
    ...team,
    roster: [
      team.captain_name ? { display_name: team.captain_name, role: "captain" as const } : null,
      team.member_name ? { display_name: team.member_name, role: "member" as const } : null,
    ].filter(Boolean) as TeamProfile["roster"],
    achievements: [],
  };

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-10 rounded-none text-left focus-visible:outline-offset-[-3px]"
        aria-label={`View ${team.name} details`}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <TeamEmblem emblem={shown.emblem_key} color={shown.color_key} size="md" />
              <div className="min-w-0">
                <DialogTitle className="truncate">{shown.name}</DialogTitle>
                <DialogDescription>{shown.motto ?? ""}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            {shown.tier ? <TierBadge tier={shown.tier} /> : null}
            <span className="text-sm text-muted-foreground">{shown.roster.length}/2 members</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["Weekly", shown.weekly_points], ["Season", shown.season_points],
              ["Wins", shown.weeks_won_count], ["Streak", shown.streak_count],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border bg-muted/25 p-2.5 text-center">
                <p className="app-number text-lg font-semibold">{Number(value).toLocaleString()}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <p className="app-label">Roster</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {shown.roster.map((member) => (
                <div key={`${member.role}-${member.display_name}`} className="rounded-lg border px-3 py-2.5">
                  <p className="truncate text-sm font-semibold">{member.display_name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{member.role}</p>
                </div>
              ))}
              {shown.roster.length < 2 ? <div className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">Open spot</div> : null}
            </div>
          </div>

          {!profile && !error ? <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading achievements…</div> : null}
          {error ? <p className="mt-5 text-sm text-destructive">Team achievements could not be loaded.</p> : null}
          {profile?.achievements.length ? <div className="mt-6"><AchievementRail title="Team achievements" cards={profile.achievements} compact /></div> : null}

          <Button asChild className="mt-6 w-full">
            <Link href={`/teams/${encodeURIComponent(team.id)}`}>View team profile</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
