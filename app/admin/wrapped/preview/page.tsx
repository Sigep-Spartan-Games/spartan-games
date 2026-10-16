import { notFound } from "next/navigation";

import { WrappedStory } from "@/components/wrapped-story";
import { requireAdmin } from "@/lib/admin";
import { parseWrappedResult } from "@/lib/wrapped";

export default async function AdminWrappedStoryPreview({
  searchParams,
}: {
  searchParams?: Promise<{ season?: string; user?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/wrapped/preview");
  const sp = (await searchParams) ?? {};
  if (!sp.season || !sp.user) notFound();

  const { data, error } = await supabase.rpc("get_season_wrapped_preview_v1", {
    p_season_id: sp.season,
    p_user_id: sp.user,
  });
  if (error) throw new Error("Wrapped preview could not be loaded.");

  const result = parseWrappedResult(data);
  if (result.status !== "ready") notFound();

  return (
    <WrappedStory
      data={result}
      closeHref={`/admin/wrapped?season=${encodeURIComponent(sp.season)}&user=${encodeURIComponent(sp.user)}`}
    />
  );
}
