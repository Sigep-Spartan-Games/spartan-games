import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Flame, Settings, Trophy, UsersRound } from "lucide-react";
import { AchievementRail } from "@/components/achievement-card";
import { TeamEmblem } from "@/components/team-emblem";
import { TierBadge } from "@/components/competition-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { parseTeamProfile, sortAchievements } from "@/lib/achievements";
import { getMyTeam } from "@/lib/team-data";

export default async function TeamProfilePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/login");

  const [profileResult, myTeamResult] = await Promise.all([
    supabase.rpc("get_team_profile_v1", { p_team_id: teamId }),
    getMyTeam(supabase),
  ]);
  const team = parseTeamProfile(profileResult.data);
  if (!team || profileResult.error) notFound();
  const canCustomize = myTeamResult.team?.id === team.id && myTeamResult.team.role === "captain";

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader title="Team profile" description="Identity, roster, season performance, and team achievements." actions={<Button asChild variant="outline" size="sm"><Link href="/leaderboard"><ArrowLeft /> Leaderboard</Link></Button>} />

      <section className="app-surface-elevated overflow-hidden">
        <div className="h-2 bg-primary" />
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <TeamEmblem emblem={team.emblem_key} color={team.color_key} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{team.name}</h1>
                {team.tier ? <TierBadge tier={team.tier} /> : null}
              </div>
              <p className="mt-2 text-sm italic text-muted-foreground">{team.motto || "No team motto yet."}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {team.roster.map((member) => (
                  <span
                    key={`${member.role}-${member.display_name}`}
                    className="min-w-0 truncate rounded-full border bg-muted/25 px-2 py-1 text-center text-xs sm:px-3 sm:text-left sm:text-sm"
                    title={`${member.display_name} · ${member.role}`}
                  >
                    <strong>{member.display_name}</strong>
                    <span className="hidden capitalize text-muted-foreground sm:inline"> · {member.role}</span>
                  </span>
                ))}
                {team.roster.length < 2 ? <span className="min-w-0 truncate rounded-full border border-dashed px-2 py-1 text-center text-xs text-muted-foreground sm:px-3 sm:text-left sm:text-sm">Open spot</span> : null}
              </div>
            </div>
            {canCustomize ? <Button asChild variant="outline"><Link href="/teams/customize"><Settings /> Customize team</Link></Button> : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Weekly points", value: team.weekly_points, icon: Flame },
          { label: "Season points", value: team.season_points, icon: Trophy },
          { label: "Weekly wins", value: team.weeks_won_count, icon: Trophy },
          { label: "Scoring streak", value: `${team.streak_count} days`, icon: UsersRound },
        ].map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="p-4 pt-4 sm:p-5 sm:pt-5"><Icon className="h-4 w-4 text-primary" /><p className="app-number mt-3 text-xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}
      </div>

      <AchievementRail title="Team achievements" cards={sortAchievements(team.achievements)} />
    </div>
  );
}
