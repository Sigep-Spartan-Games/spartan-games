import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { WrappedStory } from "@/components/wrapped-story";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { createClient } from "@/lib/supabase/server";
import { parseWrappedResult } from "@/lib/wrapped";
import { isWrappedEnabled } from "@/lib/wrapped-server";

export default async function SeasonWrappedPage({
  params,
}: {
  params: Promise<{ seasonSlug: string }>;
}) {
  if (!isWrappedEnabled()) notFound();

  const { seasonSlug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/wrapped/${seasonSlug}`)}`);
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, slug, status")
    .eq("slug", seasonSlug)
    .maybeSingle();

  if (!season) notFound();

  const { data, error } = await supabase.rpc("get_my_season_wrapped_v1", {
    p_season_id: season.id,
  });

  if (error) {
    return (
      <div className="space-y-5">
        <StatusBanner variant="error" title="Wrapped is unavailable">
          Your recap could not be loaded. Please try again later.
        </StatusBanner>
        <Button asChild variant="outline"><Link href="/profile">Back to profile</Link></Button>
      </div>
    );
  }

  const result = parseWrappedResult(data);
  if (result.status === "ready") {
    return <WrappedStory data={result} closeHref={`/profile?season=${encodeURIComponent(season.slug)}`} />;
  }

  if (result.status === "locked") {
    return (
      <EmptyState
        title="Wrapped is still locked"
        description={`${season.name} must be completed before player recaps are available.`}
        action={<Button asChild variant="outline"><Link href="/leaderboard">View leaderboard</Link></Button>}
      />
    );
  }

  return (
    <EmptyState
      title="No recap for this season"
      description="Wrapped is available to players who finished the season on a team or recorded an activity."
      action={<Button asChild variant="outline"><Link href="/profile">Back to profile</Link></Button>}
    />
  );
}
