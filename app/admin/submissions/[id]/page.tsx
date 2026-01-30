// app/admin/submissions/[id]/page.tsx
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import EditSubmissionFormClient from "./edit-submission-form-client";
import { updateSubmission } from "../actions";

export default async function AdminSubmissionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  noStore();
  const { id } = await params;

  const sp = (await searchParams) ?? {};
  const teamFilter = typeof sp.team === "string" ? sp.team : "";

  const { supabase } = await requireAdmin(`/admin/submissions/${id}`);

  const backHref = teamFilter
    ? `/admin/submissions?team=${encodeURIComponent(teamFilter)}`
    : "/admin/submissions";

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name")
    .order("name");

  if (teamsErr) {
    return (
      <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
        Error loading teams: {teamsErr.message}
      </div>
    );
  }

  const { data: sub, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      team_id,
      activity_key,
      activity_date,
      did_with_teammate,
      activity_units,
      activity_value_number,
      activity_value_text,
      activity_value_bool,
      created_at
    `,
    )
    .eq("id", id)
    .single();

  if (error || !sub) {
    return (
      <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
        Submission not found.
      </div>
    );
  }

  // 🔥 IMPORTANT: preload numeric amount from activity_units OR activity_value_number
  const preloadedUnits =
    sub.activity_units ?? sub.activity_value_number ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Submission
          </h1>
          <p className="text-sm text-muted-foreground">
            Created: {new Date(sub.created_at).toLocaleString()}
          </p>
        </div>

        <Link
          className="h-10 rounded-md border px-3 text-sm flex items-center"
          href={backHref}
        >
          Back
        </Link>
      </div>

      <EditSubmissionFormClient
        action={updateSubmission}
        teamFilter={teamFilter}
        teams={teams ?? []}
        initial={{
          id: sub.id,
          team_id: sub.team_id,
          activity_key: sub.activity_key,
          activity_date: sub.activity_date,
          did_with_teammate: sub.did_with_teammate,
          activity_units: preloadedUnits,
          activity_value_text: sub.activity_value_text,
          activity_value_bool: sub.activity_value_bool,
        }}
      />
    </div>
  );
}
