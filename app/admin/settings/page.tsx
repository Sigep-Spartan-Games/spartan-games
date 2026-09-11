// app/admin/settings/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { resetSpartanGames, startGames, endGames } from "./actions";
import TierGoalsSection from "./tier-goals-section";
import StreakSettingsSection from "./streak-settings-section";
import CollapsibleSection from "./collapsible-section";
import GameControls from "./game-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/ui/status-banner";

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-5">
          <div className="h-5 w-40 rounded bg-muted/35" />
          <div className="mt-2 h-4 w-64 rounded bg-muted/25" />
        </div>
      ))}
    </div>
  );
}

async function AdminSettingsInner({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  noStore();
  const { supabase } = await requireAdmin("/admin/settings");

  const sp = (await searchParams) ?? {};
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const err = typeof sp.error === "string" ? sp.error : null;

  // Fetch current game settings
  const { data: settings } = await supabase
    .from("current_season_settings")
    .select("status")
    .maybeSingle();

  const seasonStatus = settings?.status ?? "registration";

  return (
    <div className="space-y-4">
      {err && <StatusBanner variant="error" title="Settings error">{err}</StatusBanner>}

      {ok && <StatusBanner variant="success" title="Done">{ok}</StatusBanner>}

      {/* Game Controls - Always visible */}
      <CollapsibleSection
        title="Game Controls"
        description="Move the current season through registration, active play, and completion"
        defaultOpen={true}
      >
        <div className="space-y-5">
          {/* Start / End Games buttons with confirmation + email toggle */}
          <GameControls
            startGamesAction={startGames}
            endGamesAction={endGames}
            seasonStatus={seasonStatus}
          />

        </div>
      </CollapsibleSection>

      {/* Tier Weekly Goals */}
      <CollapsibleSection
        title="Weekly Point Goals"
        description="Set target weekly points for each tier"
      >
        <TierGoalsSection />
      </CollapsibleSection>

      {/* Streak Bonus Settings */}
      <CollapsibleSection
        title="Streak Bonus"
        description="Configure streak bonus rewards"
      >
        <StreakSettingsSection />
      </CollapsibleSection>

      {/* Export */}
      <CollapsibleSection
        title="Export Data"
        description="Download current Spartan Games data"
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              href="/admin/settings/export/spartan-games.xlsx"
            >
              Download Excel (.xlsx)
            </a>

            <a
              className="inline-flex min-h-11 items-center justify-center rounded-control border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
              href="/admin/settings/export/submissions.csv"
            >
              Download Submissions CSV
            </a>

            <a
              className="inline-flex min-h-11 items-center justify-center rounded-control border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
              href="/admin/settings/export/teams.csv"
            >
              Download Teams CSV
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: Submissions export includes team name + all scoring-related columns.
          </p>
        </div>
      </CollapsibleSection>

      {/* Season rollover */}
      <CollapsibleSection
        title="Start a New Season"
        description="Archive the current season and preserve its history"
        variant="danger"
      >
        <form action={resetSpartanGames} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This closes the current season and archives its teams. Submissions,
            results, audit history, and proof metadata are retained. Current
            scoring rules and tier goals are copied into the new season.
          </p>

          <label className="space-y-1 block">
            <div className="text-sm font-medium">New season name</div>
            <Input
              name="seasonName"
              placeholder="2027 Spartan Games"
              className="max-w-xs"
              minLength={3}
              maxLength={80}
              required
            />
          </label>

          <label className="space-y-1 block">
            <div className="text-sm font-medium">
              Type <span className="font-mono">RESET</span> to confirm
            </div>
            <Input
              name="confirm"
              placeholder="RESET"
              className="max-w-xs"
              required
            />
          </label>

          <Button type="submit" variant="destructive">
            Archive and Start New Season
          </Button>
        </form>
      </CollapsibleSection>
    </div>
  );
}

export default function AdminSettingsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <AdminSettingsInner {...props} />
    </Suspense>
  );
}
