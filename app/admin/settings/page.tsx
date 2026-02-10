// app/admin/settings/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { resetSpartanGames, startGames, endGames, toggleSubmissions, toggleRegistration } from "./actions";
import TierGoalsSection from "./tier-goals-section";
import StreakSettingsSection from "./streak-settings-section";
import CollapsibleSection from "./collapsible-section";

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border p-5">
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
    .from("game_settings")
    .select("submissions_open, registration_open")
    .eq("id", true)
    .single();

  const submissionsOpen = settings?.submissions_open ?? false;
  const registrationOpen = settings?.registration_open ?? true;

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Settings error</div>
          <div className="mt-1 text-muted-foreground">{err}</div>
        </div>
      )}

      {ok && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <div className="font-medium">Done</div>
          <div className="mt-1 text-muted-foreground">{ok}</div>
        </div>
      )}

      {/* Game Controls - Always visible */}
      <CollapsibleSection
        title="🎮 Game Controls"
        description="Start or end the games, and toggle submissions & registration"
        defaultOpen={true}
      >
        <div className="space-y-5">
          {/* Start / End Games buttons */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Quick Actions</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={startGames}>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Start Games
                </button>
              </form>

              <form action={endGames}>
                <button
                  type="submit"
                  className="h-10 rounded-md border px-4 text-sm font-medium"
                >
                  End Games
                </button>
              </form>
            </div>

            <p className="text-xs text-muted-foreground">
              Start Games closes team registration and opens submissions. End Games does the opposite.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Independent Toggles */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Independent Toggles</div>

            {/* Submissions Toggle */}
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Submissions</div>
                <div className="text-xs text-muted-foreground">
                  Allow teams to submit activities
                </div>
              </div>
              <form action={toggleSubmissions} className="shrink-0">
                <input type="hidden" name="value" value={submissionsOpen ? "false" : "true"} />
                <button
                  type="submit"
                  className={[
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                    submissionsOpen
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30",
                  ].join(" ")}
                  title={submissionsOpen ? "Turn off submissions" : "Turn on submissions"}
                >
                  <span
                    className={[
                      "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      submissionsOpen ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </form>
            </div>

            {/* Registration Toggle */}
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Team Registration</div>
                <div className="text-xs text-muted-foreground">
                  Allow users to create or join teams
                </div>
              </div>
              <form action={toggleRegistration} className="shrink-0">
                <input type="hidden" name="value" value={registrationOpen ? "false" : "true"} />
                <button
                  type="submit"
                  className={[
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                    registrationOpen
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30",
                  ].join(" ")}
                  title={registrationOpen ? "Turn off registration" : "Turn on registration"}
                >
                  <span
                    className={[
                      "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      registrationOpen ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </form>
            </div>

            <p className="text-xs text-muted-foreground">
              Use these toggles to independently control submissions and registration.
              Useful for beta testing when you want both open at the same time.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Tier Weekly Goals */}
      <CollapsibleSection
        title="🎯 Weekly Point Goals"
        description="Set target weekly points for each tier"
      >
        <TierGoalsSection />
      </CollapsibleSection>

      {/* Streak Bonus Settings */}
      <CollapsibleSection
        title="🔥 Streak Bonus"
        description="Configure streak bonus rewards"
      >
        <StreakSettingsSection />
      </CollapsibleSection>

      {/* Export */}
      <CollapsibleSection
        title="📤 Export Data"
        description="Download current Spartan Games data"
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground inline-flex items-center justify-center"
              href="/admin/settings/export/spartan-games.xlsx"
            >
              Download Excel (.xlsx)
            </a>

            <a
              className="h-10 rounded-md border px-4 text-sm font-medium inline-flex items-center justify-center"
              href="/admin/settings/export/submissions.csv"
            >
              Download Submissions CSV
            </a>

            <a
              className="h-10 rounded-md border px-4 text-sm font-medium inline-flex items-center justify-center"
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

      {/* Reset - Danger Zone */}
      <CollapsibleSection
        title="⚠️ Reset Spartan Games"
        description="Permanently delete all teams and submissions"
        variant="danger"
      >
        <form action={resetSpartanGames} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This permanently deletes{" "}
            <span className="font-medium">all teams</span> and{" "}
            <span className="font-medium">all submissions</span>.
          </p>

          <label className="space-y-1 block">
            <div className="text-sm font-medium">
              Type <span className="font-mono">RESET</span> to confirm
            </div>
            <input
              name="confirm"
              placeholder="RESET"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm max-w-xs"
              required
            />
          </label>

          <button
            type="submit"
            className="h-10 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground"
          >
            Reset Spartan Games
          </button>
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
