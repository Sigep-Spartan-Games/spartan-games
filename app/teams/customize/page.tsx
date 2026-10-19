import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TeamStyleForm } from "./team-style-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { createClient } from "@/lib/supabase/server";
import { getMyTeam } from "@/lib/team-data";

export default async function CustomizeTeamPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const supabase = await createClient();
  const [{ data: auth }, result, feedback] = await Promise.all([supabase.auth.getUser(), getMyTeam(supabase), searchParams]);
  if (!auth.user) redirect("/auth/login");
  if (!result.team) redirect("/teams?error=Join%20a%20team%20before%20customizing");
  if (result.team.role !== "captain") redirect(`/teams/${result.team.id}`);

  const { data: season } = await supabase.from("seasons").select("status").eq("id", result.team.season_id).single();
  const locked = !season || !["registration", "active"].includes(season.status);

  return (
    <div className="space-y-6">
      <PageHeader title="Customize team" description="Update your team name, emblem, color, and motto." actions={<Button asChild variant="outline" size="sm"><Link href={`/teams/${result.team.id}`}><ArrowLeft /> Team profile</Link></Button>} />
      {feedback.error ? <StatusBanner variant="error" title="Team customization failed">{decodeURIComponent(feedback.error)}</StatusBanner> : null}
      {feedback.success ? <StatusBanner variant="success" title="Team customization saved">Your new identity is live across Spartan Games.</StatusBanner> : null}
      {locked ? <StatusBanner variant="warning" title="Team customization is locked">Team names and styles freeze when a season begins finalizing.</StatusBanner> : (
        <TeamStyleForm team={result.team} />
      )}
    </div>
  );
}
