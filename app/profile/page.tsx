import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Flame,
  Medal,
  UserRound,
  UsersRound,
} from "lucide-react";

import { RequestEditDialog } from "./request-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;

  if (authError || !user) redirect("/auth/login");

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
    .maybeSingle();

  const { data: activityRules } = await supabase
    .from("activity_rules")
    .select("*");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : `${user.email}`;

  let query = supabase
    .from("submissions")
    .select("*, submission_edit_requests(id, status)");

  if (team) {
    query = query.or(
      `submitted_by.eq.${user.id},and(team_id.eq.${team.id},activity_key.eq.daily_streak_bonus)`,
    );
  } else {
    query = query.eq("submitted_by", user.id);
  }

  const { data: submissions, error: subError } = await query.order(
    "created_at",
    { ascending: false },
  );

  const totalUserPoints = (submissions || []).reduce(
    (total, submission) => total + (submission.points_awarded || 0),
    0,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Your profile"
        description="Review your contributions, team progress, and recent activity."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to leaderboard
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-competition to-achievement" />
          <CardContent className="pt-5 sm:pt-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
                <UserRound aria-hidden="true" className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold tracking-tight">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/25 p-4">
                <dt className="app-label">My contributions</dt>
                <dd className="app-number mt-2 text-2xl text-achievement">
                  {totalUserPoints.toLocaleString()}
                  <span className="ml-1 text-sm font-semibold">pts</span>
                </dd>
              </div>
              <div className="rounded-lg border bg-muted/25 p-4">
                <dt className="app-label">Submissions</dt>
                <dd className="app-number mt-2 text-2xl">
                  {submissions?.length || 0}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersRound aria-hidden="true" className="h-5 w-5" />
            </div>
            <CardTitle>Your team</CardTitle>
          </CardHeader>
          <CardContent>
            {teamError ? (
              <StatusBanner variant="error">Your team could not be loaded.</StatusBanner>
            ) : !team ? (
              <EmptyState
                title="You are not on a team"
                description="Create a team or join one with an invite code to start competing."
                action={
                  <Button size="sm" asChild>
                    <Link href="/teams">Find a team</Link>
                  </Button>
                }
                className="border-0 bg-transparent py-4"
              />
            ) : (
              <dl className="divide-y">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <dt className="text-sm text-muted-foreground">Team name</dt>
                  <dd className="text-right font-semibold">{team.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-muted-foreground">Weekly points</dt>
                  <dd className="app-number font-semibold">{team.weekly_points || 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-muted-foreground">Season points</dt>
                  <dd className="app-number font-semibold">{team.total_points || 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                  <dt className="text-sm text-muted-foreground">Current streak</dt>
                  <dd className="flex items-center gap-1.5 font-semibold text-competition">
                    <Flame aria-hidden="true" className="h-4 w-4" />
                    {team.streak_count || 0} days
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="profile-submissions-heading" className="space-y-4">
        <div>
          <h2 id="profile-submissions-heading" className="app-section-heading">
            My submissions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your activity history and awarded points.
          </p>
        </div>

        {subError ? (
          <StatusBanner variant="error" title="Submissions unavailable">
            Your activity history could not be loaded. Please try again.
          </StatusBanner>
        ) : submissions?.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Log your first activity to begin contributing points."
            action={
              <Button size="sm" variant="competition" asChild>
                <Link href="/submit">Log an activity</Link>
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y">
              {submissions?.map((submission) => {
                const pendingRequest = submission.submission_edit_requests?.find(
                  (request: any) => request.status === "pending",
                );
                const rule = activityRules?.find(
                  (candidate) => candidate.activity_key === submission.activity_key,
                );
                const isStreakBonus = submission.activity_key === "daily_streak_bonus";

                return (
                  <article
                    key={submission.id}
                    className="p-4 transition-colors hover:bg-muted/20 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {isStreakBonus ? "Daily Streak Bonus" : submission.activity_key}
                          </h3>
                          {submission.did_with_teammate ? (
                            <Badge variant="secondary">Teammate bonus</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                          {new Date(submission.activity_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="app-number shrink-0 text-lg font-bold text-achievement">
                        +{submission.points_awarded}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {isStreakBonus ? (
                        <Badge variant="achievement">
                          <Medal aria-hidden="true" className="h-3.5 w-3.5" />
                          Team reward
                        </Badge>
                      ) : pendingRequest ? (
                        <Badge variant="warning">Pending edit</Badge>
                      ) : team && rule ? (
                        <RequestEditDialog
                          submissionId={submission.id}
                          teamId={team.id}
                          activityKey={submission.activity_key}
                          rule={rule}
                          originalSubmission={submission}
                          allRules={activityRules || []}
                        />
                      ) : null}

                      {submission.proof_image_path ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-proofs/${submission.proof_image_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
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
      </section>
    </div>
  );
}
