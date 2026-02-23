import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestEditDialog } from "./request-edit-dialog";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Fetch Team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
    .maybeSingle();

  // Fetch Profile Name
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : `${user.email}`;

  // Fetch user's individual submissions
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("*, submission_edit_requests(id, status)")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false });

  // Calculate user-specific total points from these submissions
  const totalUserPoints = (submissions || []).reduce(
    (acc, sub) => acc + (sub.points_awarded || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                My Total Contributions
              </span>
              <span className="font-bold text-base">{totalUserPoints} pts</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-muted-foreground">Total Submissions</span>
              <span className="font-medium">{submissions?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Team Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-primary text-center">
            Your Team
          </h3>
          {teamError || !team ? (
            <div className="text-center text-muted-foreground pt-4">
              You are not currently on a team.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Team Name</span>
                <span className="font-bold text-lg">{team.name}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">
                  Team Weekly Points
                </span>
                <span className="font-medium">{team.weekly_points || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Team Total Points</span>
                <span className="font-medium">{team.total_points || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Current Streak</span>
                <span className="font-medium text-amber-500">
                  {team.streak_count || 0} 🔥
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Section */}
      <h3 className="text-2xl font-bold tracking-tight mt-10">
        My Submissions
      </h3>
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        {subError ? (
          <div className="p-6 text-muted-foreground text-center">
            Error loading submissions.
          </div>
        ) : submissions?.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            You haven't made any submissions yet. Let's get to work!
          </div>
        ) : (
          <div className="divide-y">
            {submissions?.map((s) => {
              const pendingRequest = s.submission_edit_requests?.find(
                (r: any) => r.status === "pending",
              );

              return (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-muted/10 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-lg flex items-center gap-2">
                      {s.activity_key}
                      {s.did_with_teammate && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Teammate Bonus
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>
                        {new Date(s.activity_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex items-center gap-4">
                    {pendingRequest ? (
                      <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full font-medium">
                        Pending Edit
                      </span>
                    ) : (
                      team && (
                        <RequestEditDialog
                          submissionId={s.id}
                          teamId={team.id}
                          activityKey={s.activity_key}
                        />
                      )
                    )}
                    {s.proof_image_path && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-proofs/${s.proof_image_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
                      >
                        📷 Proof
                      </a>
                    )}
                    <div className="font-mono text-xl font-bold text-amber-400">
                      +{s.points_awarded}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
