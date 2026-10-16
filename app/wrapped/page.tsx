import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { parseWrappedResult } from "@/lib/wrapped";
import { isWrappedEnabled } from "@/lib/wrapped-server";

type ProfileSeason = {
  id: string;
  slug: string;
  status: string;
};

export default async function LatestWrappedPage() {
  if (!isWrappedEnabled()) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/login?next=/wrapped");

  const { data } = await supabase.rpc("get_my_profile_seasons_v1");
  const seasons = Array.isArray(data) ? data as unknown as ProfileSeason[] : [];

  for (const season of seasons.filter((candidate) => candidate.status === "completed")) {
    const result = await supabase.rpc("get_my_season_wrapped_v1", {
      p_season_id: season.id,
    });
    if (!result.error && parseWrappedResult(result.data).status === "ready") {
      redirect(`/wrapped/${encodeURIComponent(season.slug)}`);
    }
  }

  return (
    <EmptyState
      title="No Wrapped season yet"
      description="Your recap will appear here after a season you played in is completed."
      action={
        <Button asChild variant="outline">
          <Link href="/profile">Back to profile</Link>
        </Button>
      }
    />
  );
}
