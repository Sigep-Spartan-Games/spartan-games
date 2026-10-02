import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  Flame,
  Medal,
  UserRound,
  UsersRound,
} from "lucide-react";

import { RequestEditDialog } from "./request-edit-dialog";
import { ProfileSeasonSelector } from "./season-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { createClient } from "@/lib/supabase/server";
import type { ActivityRule } from "@/lib/types";

type SearchParams = { [key: string]: string | string[] | undefined };

type ProfileSeason = {
  id: string;
  slug: string;
  name: string;
  status: string;
  starts_on: string;
  ends_on: string | null;
  is_current: boolean;
};

type ProfileTeam = {
  team_id: string;
  season_id: string;
  season_slug: string;
  season_name: string;
  season_status: string;
  team_name: string;
  tier: string | null;
  role: "captain" | "member";
  is_active_membership: boolean;
  season_points: number;
  weekly_points: number;
  weeks_won_count: number;
  goals_met_count: number;
  streak_count: number;
  is_champion: boolean;
};

type ProfileSummary = {
  contribution_points: number;
  activity_count: number;
  seasons_played: number;
  teams: ProfileTeam[];
};

type SubmissionScoreEvent = {
  event_type: string;
  points: number | null;
};

type ProfileSubmission = {
  id: string;
  season_id: string;
  activity_date: string;
  activity_key: string;
  activity_value_number: number | null;
  activity_value_text: string | null;
  activity_value_bool: boolean | null;
  created_at: string;
  did_with_teammate: boolean;
  proof_image_path: string | null;
  submission_kind: string;
  submission_edit_requests: { id: string; status: string }[] | null;
  score_events: SubmissionScoreEvent[] | null;
  activities: { label: string; unit_label: string | null } | null;
  seasons: { name: string; slug: string; status: string } | null;
  proof_url: string | null;
};

const PROFILE_PAGE_SIZE = 25;

function positivePage(value: string | string[] | undefined) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function profileHref(season: string, page?: number) {
  const params = new URLSearchParams();
  params.set("season", season);
  if (page && page > 1) params.set("page", String(page));
  return `/profile?${params.toString()}`;
}

function parseSeasons(value: unknown): ProfileSeason[] {
  return Array.isArray(value) ? (value as ProfileSeason[]) : [];
}

function parseSummary(value: unknown): ProfileSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { contribution_points: 0, activity_count: 0, seasons_played: 0, teams: [] };
  }

  const summary = value as Partial<ProfileSummary>;
  return {
    contribution_points: Number(summary.contribution_points ?? 0),
    activity_count: Number(summary.activity_count ?? 0),
    seasons_played: Number(summary.seasons_played ?? 0),
    teams: Array.isArray(summary.teams) ? summary.teams : [],
  };
}

function humanizeActivityKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function TeamSummary({ team, historical }: { team: ProfileTeam; historical: boolean }) {
  const completed = team.season_status === "completed";

  return (
    <div className="rounded-lg border bg-muted/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{team.team_name}</p>
          {historical ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{team.season_name}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {team.is_champion ? (
            <Badge variant="achievement">
              <Crown aria-hidden="true" className="h-3.5 w-3.5" />
              Champion
            </Badge>
          ) : null}
          {team.tier ? <Badge variant="secondary">{humanizeActivityKey(team.tier)} tier</Badge> : null}
          <Badge variant="outline">{humanizeActivityKey(team.role)}</Badge>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {!completed ? (
          <div>
            <dt className="text-muted-foreground">Weekly points</dt>
            <dd className="app-number mt-0.5 font-semibold">{team.weekly_points.toLocaleString()}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Season points</dt>
          <dd className="app-number mt-0.5 font-semibold">{team.season_points.toLocaleString()}</dd>
        </div>
        {completed ? (
          <>
            <div>
              <dt className="text-muted-foreground">Weeks won</dt>
              <dd className="app-number mt-0.5 font-semibold">{team.weeks_won_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Weekly goals met</dt>
              <dd className="app-number mt-0.5 font-semibold">{team.goals_met_count}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt className="text-muted-foreground">Current streak</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-semibold text-competition">
              <Flame aria-hidden="true" className="h-4 w-4" />
              {team.streak_count} days
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const requestedSeason = typeof sp.season === "string" ? sp.season : "";
  const requestedPage = positivePage(sp.page);
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;

  if (authError || !user) redirect("/auth/login");

  const [{ data: seasonsData, error: seasonsError }, { data: profile }] = await Promise.all([
    supabase.rpc("get_my_profile_seasons_v1"),
    supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single(),
  ]);

  const seasons = parseSeasons(seasonsData);
  const currentSeason = seasons.find((season) => season.is_current) ?? null;
  const fallbackSeasonKey = currentSeason?.slug ?? "all";
  const selectedSeason = requestedSeason === "all"
    ? null
    : seasons.find((season) => season.slug === (requestedSeason || fallbackSeasonKey)) ?? null;
  const selectedSeasonKey = requestedSeason === "all"
    ? "all"
    : selectedSeason?.slug ?? fallbackSeasonKey;

  if (requestedSeason && requestedSeason !== "all" && !selectedSeason) {
    redirect(profileHref(fallbackSeasonKey));
  }

  const isAllSeasons = selectedSeasonKey === "all";
  const from = (requestedPage - 1) * PROFILE_PAGE_SIZE;
  const to = from + PROFILE_PAGE_SIZE - 1;

  let submissionsQuery = supabase
    .from("submissions")
    .select(
      "id, season_id, activity_date, activity_key, activity_value_number, activity_value_text, activity_value_bool, created_at, did_with_teammate, proof_image_path, submission_kind, submission_edit_requests(id, status), score_events(event_type, points), activities(label, unit_label), seasons(name, slug, status)",
      { count: "exact" },
    )
    .eq("submitted_by", user.id)
    .is("voided_at", null)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (selectedSeason) {
    submissionsQuery = submissionsQuery.eq("season_id", selectedSeason.id);
  }

  const summaryRequest = selectedSeason
    ? supabase.rpc("get_my_profile_summary_v1", { p_season_id: selectedSeason.id })
    : supabase.rpc("get_my_profile_summary_v1");

  const [summaryResult, rulesResult, submissionsResult] = await Promise.all([
    summaryRequest,
    supabase.from("current_activity_rules").select("*"),
    submissionsQuery,
  ]);

  const summary = parseSummary(summaryResult.data);
  const totalEntries = submissionsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PROFILE_PAGE_SIZE));

  if (!submissionsResult.error && requestedPage > totalPages) {
    redirect(profileHref(selectedSeasonKey, totalPages));
  }

  const activityRules = (rulesResult.data ?? []) as ActivityRule[];
  const rawSubmissions = (submissionsResult.data ?? []) as unknown as Omit<
    ProfileSubmission,
    "proof_url"
  >[];
  const submissions: ProfileSubmission[] = await Promise.all(
    rawSubmissions.map(async (submission) => {
      if (!submission.proof_image_path) return { ...submission, proof_url: null };
      const { data } = await supabase.storage
        .from("submission-proofs")
        .createSignedUrl(submission.proof_image_path, 60 * 15);
      return { ...submission, proof_url: data?.signedUrl ?? null };
    }),
  );

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : `${user.email}`;
  const selectedLabel = isAllSeasons ? "All Seasons" : selectedSeason?.name ?? "Current season";
  const canSubmitNow = Boolean(
    selectedSeason?.is_current && selectedSeason.status === "active",
  );
  const profileError = seasonsError ?? summaryResult.error ?? submissionsResult.error;
  const currentPage = Math.min(requestedPage, totalPages);
  const firstResult = totalEntries === 0 ? 0 : from + 1;
  const lastResult = Math.min(from + PROFILE_PAGE_SIZE, totalEntries);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Your profile"
        description="Review your contributions, team progress, and point history by season."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to leaderboard
            </Link>
          </Button>
        }
      />

      <div className="flex justify-end">
        <ProfileSeasonSelector
          seasons={seasons.map(({ slug, name, is_current }) => ({ slug, name, is_current }))}
          value={selectedSeasonKey}
        />
      </div>

      {profileError ? (
        <StatusBanner variant="error" title="Profile history unavailable">
          Your season history could not be fully loaded. Please try again.
        </StatusBanner>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-competition to-achievement" />
          <CardContent className="pt-5 sm:pt-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
                <UserRound aria-hidden="true" className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold tracking-tight">{displayName}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs font-medium text-primary">{selectedLabel}</p>
              </div>
            </div>

            <dl className={`mt-6 grid gap-3 ${isAllSeasons ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="rounded-lg border bg-muted/25 p-3 sm:p-4">
                <dt className="app-label">My contributions</dt>
                <dd className="app-number mt-2 text-xl text-achievement sm:text-2xl">
                  {summary.contribution_points.toLocaleString()}
                  <span className="ml-1 text-xs font-semibold sm:text-sm">pts</span>
                </dd>
              </div>
              <div className="rounded-lg border bg-muted/25 p-3 sm:p-4">
                <dt className="app-label">Activities logged</dt>
                <dd className="app-number mt-2 text-xl sm:text-2xl">{summary.activity_count}</dd>
              </div>
              {isAllSeasons ? (
                <div className="rounded-lg border bg-muted/25 p-3 sm:p-4">
                  <dt className="app-label">Seasons played</dt>
                  <dd className="app-number mt-2 text-xl sm:text-2xl">{summary.seasons_played}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersRound aria-hidden="true" className="h-5 w-5" />
            </div>
            <CardTitle>{isAllSeasons ? "Teams by season" : "Your team"}</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.teams.length === 0 ? (
              <EmptyState
                title={isAllSeasons ? "No team history" : "You are not on a team"}
                description={isAllSeasons
                  ? "Teams will appear here after you join a season."
                  : "Create a team or join one with an invite code to start competing."}
                action={selectedSeason?.is_current ? (
                  <Button size="sm" asChild><Link href="/teams">Find a team</Link></Button>
                ) : undefined}
                className="border-0 bg-transparent py-4"
              />
            ) : (
              <div className="space-y-3">
                {summary.teams.map((team) => (
                  <TeamSummary key={team.team_id} team={team} historical={isAllSeasons} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="profile-submissions-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="profile-submissions-heading" className="app-section-heading">Point history</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Activities and rewards credited to you for {selectedLabel.toLowerCase()}.
            </p>
          </div>
          {totalEntries > 0 ? (
            <p className="text-sm text-muted-foreground">
              Showing {firstResult}–{lastResult} of {totalEntries}
            </p>
          ) : null}
        </div>

        {submissionsResult.error ? (
          <StatusBanner variant="error" title="Point history unavailable">
            Your activity history could not be loaded. Please try again.
          </StatusBanner>
        ) : submissions.length === 0 ? (
          <EmptyState
            title={isAllSeasons ? "No point history yet" : "No activity this season"}
            description={canSubmitNow
              ? "Log your first activity to begin contributing points this season."
              : "There are no activities or rewards credited to you in this view."}
            action={canSubmitNow ? (
              <Button size="sm" variant="competition" asChild>
                <Link href="/submit">Log an activity</Link>
              </Button>
            ) : undefined}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y">
              {submissions.map((submission) => {
                const pendingRequest = submission.submission_edit_requests?.find(
                  (request) => request.status === "pending",
                );
                const rule = activityRules.find(
                  (candidate) => candidate.activity_key === submission.activity_key,
                );
                const isStreakReward = submission.submission_kind === "streak_bonus"
                  || submission.activity_key === "daily_streak_bonus";
                const events = submission.score_events ?? [];
                const awardedPoints = events.reduce(
                  (sum, event) => sum + Number(event.points ?? 0),
                  0,
                );
                const streakBonus = isStreakReward ? 0 : events
                  .filter((event) => event.event_type === "streak_bonus")
                  .reduce((sum, event) => sum + Number(event.points ?? 0), 0);
                const canEdit = Boolean(
                  currentSeason?.status === "active"
                  && submission.season_id === currentSeason.id
                  && submission.submission_kind === "activity"
                  && rule,
                );
                const activityLabel = isStreakReward
                  ? "Streak reward"
                  : submission.activities?.label ?? humanizeActivityKey(submission.activity_key);

                return (
                  <article key={submission.id} className="p-4 transition-colors hover:bg-muted/20 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{activityLabel}</h3>
                          {isAllSeasons && submission.seasons?.name ? (
                            <Badge variant="outline">{submission.seasons.name}</Badge>
                          ) : null}
                          {submission.did_with_teammate ? (
                            <Badge variant="secondary">Teammate bonus</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                          {new Date(`${submission.activity_date}T12:00:00`).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="app-number shrink-0 text-lg font-bold text-achievement">
                        {awardedPoints >= 0 ? "+" : ""}{awardedPoints.toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {isStreakReward ? (
                        <Badge variant="achievement">
                          <Medal aria-hidden="true" className="h-3.5 w-3.5" />
                          Streak reward
                        </Badge>
                      ) : null}
                      {!isStreakReward && streakBonus > 0 ? (
                        <Badge variant="achievement">
                          <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                          Streak +{streakBonus}
                        </Badge>
                      ) : null}
                      {!isStreakReward && pendingRequest ? (
                        <Badge variant="warning">Pending edit</Badge>
                      ) : null}
                      {!isStreakReward && !pendingRequest && canEdit && rule ? (
                        <RequestEditDialog
                          submissionId={submission.id}
                          activityKey={submission.activity_key}
                          rule={rule}
                          originalSubmission={{
                            activity_date: submission.activity_date,
                            activity_value_number: submission.activity_value_number,
                            activity_value_text: submission.activity_value_text,
                            activity_value_bool: submission.activity_value_bool,
                            did_with_teammate: submission.did_with_teammate,
                          }}
                          allRules={activityRules}
                        />
                      ) : null}

                      {submission.proof_url ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={submission.proof_url} target="_blank" rel="noopener noreferrer">
                            View proof
                            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>
        )}

        {totalPages > 1 ? (
          <nav className="flex items-center justify-between gap-3" aria-label="Point history pages">
            <Button variant="outline" size="sm" asChild={currentPage > 1} disabled={currentPage <= 1}>
              {currentPage > 1 ? (
                <Link href={profileHref(selectedSeasonKey, currentPage - 1)}>
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Previous
                </Link>
              ) : <span><ChevronLeft aria-hidden="true" className="h-4 w-4" /> Previous</span>}
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" asChild={currentPage < totalPages} disabled={currentPage >= totalPages}>
              {currentPage < totalPages ? (
                <Link href={profileHref(selectedSeasonKey, currentPage + 1)}>
                  Next <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : <span>Next <ChevronRight aria-hidden="true" className="h-4 w-4" /></span>}
            </Button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
