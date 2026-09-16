// app/admin/settings/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  completeChampionSelection,
  resetSpartanGames,
  resendSeasonNotification,
  startGames,
  endGames,
} from "./actions";
import TierGoalsSection from "./tier-goals-section";
import StreakSettingsSection from "./streak-settings-section";
import CollapsibleSection from "./collapsible-section";
import GameControls from "./game-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/ui/status-banner";
import AdminAccessSection, {
  type AdminAccessProfile,
} from "./admin-access-section";
import {
  grantAdminAccess,
  revokeAdminAccess,
  transferAdminOwnership,
} from "./admin-access-actions";
import ChampionResolution from "./champion-resolution";
import { ChampionCards } from "@/components/champion-cards";
import { parseSeasonCompletionResult } from "@/lib/champions";
import ExportLinks from "./export-links";

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
  const { supabase, user } = await requireAdmin("/admin/settings");

  const sp = (await searchParams) ?? {};
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const warning = typeof sp.warning === "string" ? sp.warning : null;
  const err = typeof sp.error === "string" ? sp.error : null;

  const [
    { data: settings },
    { data: completionData },
    { data: profileData, error: profilesError },
  ] =
    await Promise.all([
      supabase
        .from("current_season_settings")
        .select("id, status")
        .maybeSingle(),
      supabase.rpc("get_pending_champion_ties_v2"),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, is_admin, is_owner"),
    ]);

  const seasonStatus = settings?.status ?? "registration";
  const completion = parseSeasonCompletionResult(completionData);
  const scoringLocked = seasonStatus === "finalizing" || seasonStatus === "completed";
  const allProfiles = ((profileData ?? []) as AdminAccessProfile[]).sort((a, b) => {
    const aName = [a.first_name, a.last_name, a.email].filter(Boolean).join(" ");
    const bName = [b.first_name, b.last_name, b.email].filter(Boolean).join(" ");
    return aName.localeCompare(bName) || a.id.localeCompare(b.id);
  });
  const currentProfile = allProfiles.find((profile) => profile.id === user.id);
  const profiles = currentProfile?.is_owner
    ? allProfiles
    : allProfiles.filter((profile) => profile.is_admin);

  return (
    <div className="space-y-4">
      {err && <StatusBanner variant="error" title="Settings error">{err}</StatusBanner>}

      {ok && <StatusBanner variant="success" title="Done">{ok}</StatusBanner>}

      {warning && (
        <StatusBanner variant="warning" title="Season updated; check email delivery">
          {warning}
        </StatusBanner>
      )}

      {profilesError && (
        <StatusBanner variant="error" title="Administrator access unavailable">
          {profilesError.message}
        </StatusBanner>
      )}

      {seasonStatus === "finalizing" ? (
        <ChampionResolution
          ties={completion.ties}
          action={completeChampionSelection}
        />
      ) : null}

      {seasonStatus === "completed" ? (
        <ChampionCards champions={completion.champions} />
      ) : null}

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
            resendNotificationAction={resendSeasonNotification}
            seasonStatus={seasonStatus}
          />

        </div>
      </CollapsibleSection>

      {/* Administrator access */}
      {!profilesError && (
        <CollapsibleSection
          title="Administrator Access"
          description="Manage administrators and application ownership"
        >
          <AdminAccessSection
            currentUserId={user.id}
            profiles={profiles}
            grantAction={grantAdminAccess}
            revokeAction={revokeAdminAccess}
            transferAction={transferAdminOwnership}
          />
        </CollapsibleSection>
      )}

      {/* Tier Weekly Goals */}
      <CollapsibleSection
        title="Weekly Point Goals"
        description="Set target weekly points for each tier"
      >
        {scoringLocked ? (
          <p className="text-sm text-muted-foreground">
            Weekly goals are frozen after the games end.
          </p>
        ) : (
          <TierGoalsSection />
        )}
      </CollapsibleSection>

      {/* Streak Bonus Settings */}
      <CollapsibleSection
        title="Streak Bonus"
        description="Configure streak bonus rewards"
      >
        {scoringLocked ? (
          <p className="text-sm text-muted-foreground">
            Streak settings are frozen after the games end.
          </p>
        ) : (
          <StreakSettingsSection />
        )}
      </CollapsibleSection>

      {/* Export */}
      <CollapsibleSection
        title="Export Data"
        description="Download current Spartan Games data"
      >
        <ExportLinks />
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

          {seasonStatus === "finalizing" ? (
            <p className="text-sm font-medium text-achievement">
              Resolve champion ties before starting a new season.
            </p>
          ) : null}

          <Button
            type="submit"
            variant="destructive"
            disabled={seasonStatus === "finalizing"}
          >
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
