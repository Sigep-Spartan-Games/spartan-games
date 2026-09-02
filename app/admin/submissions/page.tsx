// app/admin/submissions/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteSubmission } from "./actions";
import SubmissionFilters from "./submission-filters";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { RejectRequestButton } from "./reject-request-button";
import { ChevronDown, ExternalLink, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";

type SearchParams = { [key: string]: string | string[] | undefined };

function SubmissionsSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Submissions"
        description="Review activity logs, proof, and member edit requests."
      />
      <div className="rounded-lg border bg-card p-4">
        <div className="h-10 w-full rounded bg-muted/20" />
      </div>
      <div className="rounded-2xl border overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-2">
          <div className="h-4 w-64 rounded bg-muted/40" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3">
            <div className="h-4 w-full rounded bg-muted/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function AdminSubmissionsInner({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const teamId = typeof sp.team === "string" ? sp.team : "";
  const dateFilter = typeof sp.date === "string" ? sp.date : "";

  const { supabase } = await requireAdmin("/admin/submissions");
  const adminClient = createAdminClient();

  // Prepare submission query early
  let q = supabase
    .from("submissions")
    .select(
      "id, team_id, submitted_by, created_at, activity_key, activity_date, points_awarded, did_with_teammate, proof_image_path",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (teamId) q = q.eq("team_id", teamId);
  if (dateFilter) q = q.eq("activity_date", dateFilter);

  // Parallelize the primary data fetches
  const [teamsResult, subsResult, pendingRequestsResult] = await Promise.all([
    supabase.from("teams").select("id, name").order("name"),
    q,
    adminClient
      .from("submission_edit_requests")
      .select(
        "*, submissions(activity_key, activity_date, activity_units, points_awarded)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const teams = teamsResult.data;
  const teamsError = teamsResult.error;
  const subs = subsResult.data;
  const error = subsResult.error;
  const pendingRequests = pendingRequestsResult.data;
  const reqError = pendingRequestsResult.error;

  // Create a lookup map for team names
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  // Fetch user names for the submissions
  const userIds = [
    ...new Set((subs ?? []).map((s) => s.submitted_by).filter(Boolean)),
  ];
  let userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    userMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        p.first_name && p.last_name
          ? `${p.first_name} ${p.last_name}`
          : "Unknown",
      ]),
    );
  }

  // Add extra user IDs to userMap if necessary
  const reqUserIds = [
    ...new Set((pendingRequests ?? []).map((r) => r.user_id).filter(Boolean)),
  ];
  const missingUserIds = reqUserIds.filter((id) => !userMap.has(id));
  if (missingUserIds.length > 0) {
    const { data: missingProfiles } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", missingUserIds);
    for (const p of missingProfiles ?? []) {
      userMap.set(
        p.id,
        p.first_name && p.last_name
          ? `${p.first_name} ${p.last_name}`
          : "Unknown",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <SubmissionFilters
          teams={teams ?? []}
          teamId={teamId}
          dateFilter={dateFilter}
        />

        {teamsError ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Error loading teams: {teamsError.message}
          </div>
        ) : null}
      </div>

      {error ? (
        <StatusBanner variant="error" title="Submissions unavailable">
          {error.message}
        </StatusBanner>
      ) : (
        <div className="space-y-4">
          {pendingRequests && pendingRequests.length > 0 && (
            <details className="group mb-6 overflow-hidden rounded-lg border border-warning/25 bg-card">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between border-b bg-warning/[0.06] px-4 py-3 font-medium group-open:border-b">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/15 text-xs font-bold text-warning">
                    {pendingRequests.length}
                  </span>
                  Pending Submission Edits
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="divide-y p-0">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col justify-between gap-4 bg-warning/[0.035] p-4 sm:p-5 md:flex-row md:items-start"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="text-sm font-semibold text-warning">
                        {teamMap.get(req.team_id) ?? "Unknown Team"} ·{" "}
                        {userMap.get(req.user_id) ?? "Unknown User"}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-foreground">
                          Activity:
                        </span>{" "}
                        {req.submissions?.activity_key ?? "Deleted"}
                        <span className="text-muted-foreground ml-2">
                          ({req.submissions?.activity_date})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="rounded-md bg-background/50 border p-3">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {req.suggested_changes?.is_deletion
                              ? "Requested Action"
                              : "Suggested Changes"}
                          </div>
                          <div className="text-sm font-medium space-y-1">
                            {req.suggested_changes?.is_deletion ? (
                              <div className="flex items-center gap-2 font-bold text-destructive">
                                <TriangleAlert aria-hidden="true" className="h-4 w-4" />
                                User requested deletion
                              </div>
                            ) : (
                              <>
                                {req.suggested_changes?.activity_key &&
                                  req.suggested_changes.activity_key !==
                                    req.submissions?.activity_key && (
                                    <div className="text-warning">
                                      New Activity:{" "}
                                      {req.suggested_changes.activity_key}
                                    </div>
                                  )}
                                {req.suggested_changes?.activity_date && (
                                  <div>
                                    Date: {req.suggested_changes.activity_date}
                                  </div>
                                )}
                                {req.suggested_changes?.activity_units !==
                                  undefined && (
                                  <div>
                                    Units:{" "}
                                    {req.suggested_changes.activity_units}
                                  </div>
                                )}
                                {req.suggested_changes?.activity_value_text !==
                                  undefined && (
                                  <div>
                                    Details:{" "}
                                    {req.suggested_changes.activity_value_text}
                                  </div>
                                )}
                                {req.suggested_changes?.activity_value_bool !==
                                  undefined && (
                                  <div>
                                    Completed:{" "}
                                    {req.suggested_changes.activity_value_bool
                                      ? "Yes"
                                      : "No"}
                                  </div>
                                )}
                                {req.suggested_changes?.did_with_teammate !==
                                  undefined && (
                                  <div>
                                    With teammate:{" "}
                                    {req.suggested_changes.did_with_teammate
                                      ? "Yes"
                                      : "No"}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 border-t border-dashed pt-2">
                            Reason: {req.reason}
                          </div>
                        </div>
                        <div className="rounded-md bg-background/50 border p-3">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Current Values
                          </div>
                          <div className="text-sm font-medium">
                            {req.submissions?.activity_units ?? "N/A"} units ·{" "}
                            {req.submissions?.points_awarded ?? "N/A"} pts
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      <Link
                        href={`/admin/submissions/${req.submission_id}?requestId=${req.id}&team=${teamId}`}
                        className="flex min-h-11 flex-1 items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Approve / Edit
                      </Link>
                      <div className="flex-1 flex">
                        <RejectRequestButton
                          requestId={req.id}
                          teamId={teamId}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="overflow-hidden rounded-lg border bg-card">
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-3">When</div>
              <div className="col-span-3">Team / User</div>
              <div className="col-span-3">Activity</div>
              <div className="col-span-1">Pts</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {(subs ?? []).map((s) => {
              const teamName = teamMap.get(s.team_id) ?? "Unknown Team";
              const userName = userMap.get(s.submitted_by) ?? "Unknown User";

              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 md:grid md:grid-cols-12 md:items-center md:gap-0"
                >
                  {/* When Column */}
                  <div className="flex justify-between items-start md:col-span-3 md:block">
                    <div>
                      <div className="hidden md:block text-sm">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                      <div className="md:hidden text-sm font-medium">
                        {new Date(s.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        For: {s.activity_date}
                      </div>
                    </div>
                    {/* Mobile Points Displayed Early */}
                    <div className="md:hidden font-medium text-sm">
                      {s.points_awarded} pts
                    </div>
                  </div>

                  {/* Team/User Column - Desktop */}
                  <div className="hidden md:block md:col-span-3">
                    <div className="text-sm font-medium truncate">
                      {teamName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {userName}
                    </div>
                  </div>

                  {/* Activity Column */}
                  <div className="flex justify-between items-center md:col-span-3 md:block">
                    <div>
                      <div className="text-sm md:font-medium">
                        {s.activity_key}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.did_with_teammate ? "With teammate" : "Solo"}
                      </div>
                      {s.proof_image_path && (
                        <div className="mt-1 md:hidden">
                          <a
                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-proofs/${s.proof_image_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-11 items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                            View proof
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team/User - Mobile only (between activity and actions) */}
                  <div className="md:hidden flex items-center gap-2 text-xs text-muted-foreground border-t border-dashed pt-2">
                    <span className="font-medium text-foreground">
                      {teamName}
                    </span>
                    <span>·</span>
                    <span>{userName}</span>
                  </div>

                  {/* Points - Desktop only */}
                  <div className="hidden md:block md:col-span-1 text-sm font-medium">
                    {s.points_awarded}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 md:col-span-2">
                    {s.proof_image_path && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-proofs/${s.proof_image_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 w-11 items-center justify-center rounded-control border text-primary hover:bg-muted/50"
                        title="View Proof"
                      >
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only">View proof</span>
                      </a>
                    )}

                    <Link
                      href={`/admin/submissions/${encodeURIComponent(
                        s.id,
                      )}?team=${encodeURIComponent(teamId || "")}`}
                      className="flex h-11 items-center rounded-control border px-3 text-xs hover:bg-muted/50"
                    >
                      Edit
                    </Link>

                    <ConfirmDeleteButton
                      action={deleteSubmission}
                      payload={{
                        id: s.id,
                        ...(teamId ? { team: teamId } : {}),
                      }}
                      title="Delete Submission"
                      description="Are you sure you want to delete this submission? This action cannot be undone."
                      className="h-11 rounded-control border px-3 text-xs text-destructive hover:bg-destructive/10"
                      buttonSize="default"
                    />
                  </div>
                </div>
              );
            })}

            {(subs?.length ?? 0) === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">
                No submissions found.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSubmissionsPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<SubmissionsSkeleton />}>
      <AdminSubmissionsInner {...props} />
    </Suspense>
  );
}
