import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { AchievementCard } from "@/components/achievement-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileSeasonSelector } from "../season-selector";
import { createClient } from "@/lib/supabase/server";
import { parseAchievementProgress, sortAchievements } from "@/lib/achievements";

type SearchParams = Promise<{ season?: string; scope?: string }>;

export default async function AchievementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/login");
  const { data: seasonData } = await supabase.rpc("get_my_profile_seasons_v1");
  const seasons = Array.isArray(seasonData) ? seasonData as { id: string; slug: string; name: string; is_current: boolean }[] : [];
  const season = seasons.find((item) => item.slug === params.season) ?? seasons.find((item) => item.is_current) ?? seasons[0];
  if (!season) return <EmptyState title="No achievement seasons" description="Join a team in a season to begin earning achievements." />;
  const scope = params.scope === "team" ? "team" : "personal";
  const { data } = await supabase.rpc("get_my_achievement_progress_v1", { p_season_id: season.id });
  const progress = parseAchievementProgress(data);
  const cards = sortAchievements(scope === "team" ? progress?.team_achievements ?? [] : progress?.personal ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Achievements" description="Every badge, current tier, and next milestone for the selected season." actions={<Button asChild variant="outline" size="sm"><Link href={`/profile?season=${season.slug}`}><ArrowLeft /> Profile</Link></Button>} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 rounded-lg border bg-card p-1">
          {(["personal", "team"] as const).map((item) => <Link key={item} href={`/profile/achievements?season=${season.slug}&scope=${item}`} className={`rounded-control px-4 py-2 text-center text-sm font-semibold capitalize ${scope === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{item}</Link>)}
        </div>
        <ProfileSeasonSelector seasons={seasons.map(({ slug, name, is_current }) => ({ slug, name, is_current }))} value={season.slug} basePath="/profile/achievements" allowAll={false} queryParams={{ scope }} />
      </div>
      {scope === "team" && !progress?.team ? <EmptyState title="No team achievements" description="Join a team in this season to earn team milestones." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => <div key={card.key} className="relative"><AchievementCard card={card} className="h-full w-full" />{!card.earned ? <LockKeyhole className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" aria-label="Locked" /> : null}</div>)}
        </div>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">Achievements are recalculated from valid season activity. Corrections or voided submissions can change progress. Season thresholds are frozen when that season begins.</p>
    </div>
  );
}
