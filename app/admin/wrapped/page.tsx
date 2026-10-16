import Link from "next/link";
import { Eye, ShieldCheck } from "lucide-react";

import { WrappedRecap } from "@/components/wrapped-recap";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { requireAdmin } from "@/lib/admin";
import { parseWrappedResult } from "@/lib/wrapped";
import { isWrappedEnabled } from "@/lib/wrapped-server";

type SearchParams = { season?: string; user?: string };

export default async function AdminWrappedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const { supabase } = await requireAdmin("/admin/wrapped");
  const sp = (await searchParams) ?? {};

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, slug, status, starts_on")
    .order("starts_on", { ascending: false });
  const selectedSeason = seasons?.find((season) => season.id === sp.season)
    ?? seasons?.[0]
    ?? null;

  const { data: membershipRows } = selectedSeason
    ? await supabase
        .from("team_memberships")
        .select("id, user_id, display_name_snapshot, joined_at")
        .eq("season_id", selectedSeason.id)
        .not("user_id", "is", null)
        .order("joined_at", { ascending: false })
    : { data: [] };

  const participants = Array.from(
    new Map(
      (membershipRows ?? [])
        .filter((membership): membership is typeof membership & { user_id: string } => Boolean(membership.user_id))
        .map((membership) => [membership.user_id, {
          id: membership.user_id,
          name: membership.display_name_snapshot,
        }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const selectedParticipant = participants.find((participant) => participant.id === sp.user)
    ?? participants[0]
    ?? null;

  const previewResponse = selectedSeason && selectedParticipant
    ? await supabase.rpc("get_season_wrapped_preview_v1", {
        p_season_id: selectedSeason.id,
        p_user_id: selectedParticipant.id,
      })
    : { data: null, error: null };
  const preview = parseWrappedResult(previewResponse.data);
  const previewHref = selectedSeason && selectedParticipant
    ? `/admin/wrapped/preview?season=${encodeURIComponent(selectedSeason.id)}&user=${encodeURIComponent(selectedParticipant.id)}`
    : "/admin/wrapped";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wrapped preview"
        description="Inspect any player recap using read-only season data before releasing it to players."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">Back to settings</Link>
          </Button>
        }
      />

      <StatusBanner
        variant={isWrappedEnabled() ? "success" : "warning"}
        title={isWrappedEnabled() ? "Player access enabled" : "Player access disabled"}
      >
        {isWrappedEnabled()
          ? "Completed-season Wrapped pages are available to eligible players."
          : "Admin preview remains available. Set WRAPPED_ENABLED=true to release completed-season pages to players."}
      </StatusBanner>

      <section className="app-surface p-5 sm:p-6" aria-labelledby="preview-controls-heading">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 id="preview-controls-heading" className="font-semibold">Private admin controls</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Previewing does not complete a season, change points, or notify a player.
            </p>
          </div>
        </div>

        <form method="get" className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="space-y-2">
            <span className="app-label">Season</span>
            <select
              name="season"
              defaultValue={selectedSeason?.id}
              className="min-h-11 w-full rounded-control border bg-background px-3 text-sm"
            >
              {(seasons ?? []).map((season) => (
                <option key={season.id} value={season.id}>{season.name} ({season.status})</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="app-label">Player</span>
            <select
              name="user"
              defaultValue={selectedParticipant?.id}
              className="min-h-11 w-full rounded-control border bg-background px-3 text-sm"
              disabled={participants.length === 0}
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>{participant.name}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={!selectedSeason || participants.length === 0}>
            Load preview
          </Button>
        </form>
      </section>

      {previewResponse.error ? (
        <StatusBanner variant="error" title="Preview unavailable">
          {previewResponse.error.message}
        </StatusBanner>
      ) : preview.status === "ready" ? (
        <WrappedRecap data={preview} href={previewHref} actionLabel="Open story preview" />
      ) : (
        <EmptyState
          title="No eligible player selected"
          description="Choose a season participant to inspect their private recap."
          action={selectedSeason ? undefined : (
            <Button asChild variant="outline"><Link href="/admin/settings">Return to settings</Link></Button>
          )}
        />
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Eye aria-hidden="true" className="h-3.5 w-3.5" />
        Preview access is restricted to administrators and is not recorded as player activity.
      </p>
    </div>
  );
}
