import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { KeyRound, UsersRound } from "lucide-react";
import { createClient } from "../../lib/supabase/server";
import {
  createTeamAction,
  joinByCodeAction,
  renameTeamAction,
  changeTierAction,
  leaveTeamActionFormData,
} from "./actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { TierBadge } from "@/components/competition-badges";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyTeam, getTeamDirectory } from "@/lib/team-data";

const tierOptions = [
  { value: "gold", label: "Gold", description: "Competitive" },
  { value: "purple", label: "Purple", description: "Intermediate" },
  { value: "red", label: "Red", description: "Casual" },
] as const;

const tierRadioStyles = {
  gold: "border-achievement/25 has-[:checked]:bg-achievement/10 has-[:checked]:text-achievement",
  purple: "border-primary/25 has-[:checked]:bg-primary/10 has-[:checked]:text-primary",
  red: "border-competition/25 has-[:checked]:bg-competition/10 has-[:checked]:text-competition",
};

type SearchFeedback = { success?: string; error?: string };

function TeamsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading teams">
      <div className="space-y-2">
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="h-5 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-64 animate-pulse rounded-lg border bg-muted/30" />
      </div>
    </div>
  );
}

async function TeamsInner({ searchParams }: { searchParams: Promise<SearchFeedback> }) {
  noStore();
  const feedback = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user;

  const { data: settings, error: settingsError } = await supabase
    .from("current_season_settings")
    .select("id, registration_open, status")
    .maybeSingle();
  const registrationOpen = !settingsError && Boolean(settings?.registration_open);
  const seasonStatus = settings?.status ?? "registration";

  const [{ teams, error }, myTeamResult] = await Promise.all([
    getTeamDirectory(supabase),
    getMyTeam(supabase),
  ]);

  const success = feedback?.success ? decodeURIComponent(feedback.success) : null;
  const errorMessage = feedback?.error ? decodeURIComponent(feedback.error) : null;
  const myDirectoryTeam = myTeamResult.team
    ? teams.find((team) => team.id === myTeamResult.team?.id) ?? null
    : null;
  const myTeam = myDirectoryTeam && myTeamResult.team
    ? { ...myDirectoryTeam, invite_code: myTeamResult.team.invite_code, role: myTeamResult.team.role }
    : null;
  const { count: submittedActivityCount } = me && myTeam && settings?.id
    ? await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("season_id", settings.id)
        .eq("submitted_by", me.id)
        .eq("submission_kind", "activity")
        .is("voided_at", null)
    : { count: 0 };
  const hasSubmittedActivity = (submittedActivityCount ?? 0) > 0;
  const canRegister = Boolean(me) && !myTeam && registrationOpen;
  const canLeaveTeam = registrationOpen && !hasSubmittedActivity;
  const fieldClass =
    "h-11 w-full rounded-control border border-input bg-card px-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted disabled:opacity-70 md:h-10 md:text-sm";

  return (
    <div className="space-y-6">
      <PageHeader title="Teams" description="Create a team, invite your teammate, and track the competition." />

      {success || errorMessage ? (
        <StatusBanner variant={errorMessage ? "error" : "success"} title={errorMessage ? "Team update failed" : "Team updated"}>
          {errorMessage ?? success}
        </StatusBanner>
      ) : null}
      {!registrationOpen ? (
        <StatusBanner variant="warning" title="Team registration is closed">
          You can still view teams, but roster changes are unavailable for this season.
        </StatusBanner>
      ) : null}
      {settingsError ? (
        <StatusBanner variant="warning" title="Settings warning">
          Could not load game settings: {settingsError.message}. Registration controls are hidden for safety.
        </StatusBanner>
      ) : null}
      {error ? (
        <StatusBanner variant="error" title="Could not load teams">{error.message}</StatusBanner>
      ) : null}

      {registrationOpen && !myTeam ? (
        <section className="grid gap-4 md:grid-cols-2" aria-label="Join or create a team">
          <div className="app-surface p-5 sm:p-6">
            <h2 className="app-section-heading">Register a team</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose a name and competition tier.</p>
            <form action={createTeamAction} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label htmlFor="teamName" className="app-label">Team name</label>
                <input id="teamName" name="teamName" className={fieldClass} maxLength={40} required disabled={!canRegister} />
              </div>
              <fieldset className="space-y-2">
                <legend className="app-label">Team tier</legend>
                <div className="grid gap-2">
                  {tierOptions.map((tier) => (
                    <label
                      key={tier.value}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-3 py-2 transition-colors ${tierRadioStyles[tier.value]}`}
                    >
                      <input type="radio" name="tier" value={tier.value} required disabled={!canRegister} className="h-5 w-5 accent-primary" />
                      <span className="text-sm font-semibold">{tier.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{tier.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="h-11 w-full rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50" type="submit" disabled={!canRegister}>
                Create team
              </button>
            </form>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {!me ? "Sign in to create a team." : "Creating a team auto-joins you and generates an invite code."}
            </p>
          </div>

          <div className="app-surface p-5 sm:p-6">
            <h2 className="app-section-heading">Join a team</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use the invite code from your teammate.</p>
            <form action={joinByCodeAction} className="mt-5 space-y-3">
              <div className="space-y-2">
                <label htmlFor="inviteCode" className="app-label">Invite code</label>
                <input id="inviteCode" name="inviteCode" className={`${fieldClass} uppercase tracking-wider`} maxLength={16} required disabled={!canRegister} />
              </div>
              <button className="h-11 w-full rounded-control border border-primary bg-primary/5 px-4 text-sm font-semibold text-primary disabled:opacity-50" type="submit" disabled={!canRegister}>
                Join team
              </button>
            </form>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {!me ? "Sign in to join a team." : "Enter the private invite code your teammate gives you."}
            </p>
          </div>
        </section>
      ) : null}

      {me && myTeam ? (
        <section className="app-surface-elevated overflow-hidden" aria-labelledby="my-team-heading">
          <div className="border-l-4 border-primary p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary">Your team</p>
                <h2 id="my-team-heading" className="mt-1 truncate text-2xl font-semibold tracking-tight">{myTeam.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {myTeam.captain_name ?? "Open spot"} / {myTeam.member_name ?? "Open spot"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {myTeam.tier ? <TierBadge tier={myTeam.tier} /> : null}
                  {myTeam.invite_code ? (
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-control border bg-muted/35 px-2.5 font-mono text-xs tracking-wider">
                      <KeyRound aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                      {myTeam.invite_code}
                    </span>
                  ) : null}
                </div>
                {myTeam.role === "captain" && seasonStatus === "registration" ? (
                  <form action={changeTierAction} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input type="hidden" name="teamId" value={myTeam.id} />
                    <label className="flex-1 space-y-2">
                      <span className="app-label">Change tier</span>
                      <select name="tier" defaultValue={myTeam.tier ?? ""} className={fieldClass}>
                        {tierOptions.map((tier) => <option key={tier.value} value={tier.value}>{tier.label} ({tier.description})</option>)}
                      </select>
                    </label>
                    <button type="submit" className="h-11 rounded-control border px-4 text-sm font-semibold md:h-10">Update tier</button>
                  </form>
                ) : null}
              </div>
              <div className="w-full space-y-3 border-t pt-5 lg:w-auto lg:min-w-72 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                {myTeam.role === "captain" ? (
                  <form action={renameTeamAction} className="space-y-2">
                    <input type="hidden" name="teamId" value={myTeam.id} />
                    <label htmlFor="newName" className="app-label">Rename team</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input id="newName" name="newName" className={fieldClass} maxLength={40} required />
                      <button className="h-11 shrink-0 rounded-control border px-4 text-sm font-semibold md:h-10">Rename</button>
                    </div>
                  </form>
                ) : null}
                <ConfirmDeleteButton
                  action={leaveTeamActionFormData}
                  payload={{ teamId: myTeam.id }}
                  title="Leave Team"
                  description="Are you sure you want to leave your team? If you are the last member, the team will be archived. You cannot leave after submitting an activity."
                  buttonText="Leave team"
                  disabled={!canLeaveTeam}
                  disabledReason={hasSubmittedActivity ? "You cannot leave after submitting an activity this season." : "Team registration is closed."}
                  className="h-11 w-full rounded-control border px-4 text-sm font-semibold md:h-10"
                  buttonSize="default"
                />
                {hasSubmittedActivity ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Your roster is locked because you have submitted an activity this season.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="all-teams-heading">
        <div className="flex items-center gap-2">
          <UsersRound aria-hidden="true" className="h-5 w-5 text-primary" />
          <h2 id="all-teams-heading" className="app-section-heading">All teams</h2>
          <span className="ml-auto text-sm text-muted-foreground">{teams.length} total</span>
        </div>
        {teams.length === 0 ? (
          <EmptyState title="No teams yet" description="Registered teams will appear here." />
        ) : (
          <div className="app-surface grid divide-y overflow-hidden md:grid-cols-2 md:divide-x md:divide-y-0">
            {teams.map((team) => (
              <div key={team.id} className="flex min-w-0 items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{team.name}</h3>
                    {team.tier ? <TierBadge tier={team.tier} /> : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {team.captain_name ?? "Open spot"} / {team.member_name ?? "Open spot"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {team.member_id ? "Team full" : "Open spot (invite-only)"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="app-number text-xl font-semibold">{team.weekly_points ?? 0}</p>
                  <p className="text-xs text-muted-foreground">weekly pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function TeamsPage(props: { searchParams: Promise<SearchFeedback> }) {
  return (
    <Suspense fallback={<TeamsSkeleton />}>
      <TeamsInner {...props} />
    </Suspense>
  );
}
