// app/admin/submissions/[id]/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import EditSubmissionFormClient from "./edit-submission-form-client";
import { updateSubmission } from "../actions";

function EditSubmissionSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="h-7 w-48 rounded bg-muted/40" />
          <div className="mt-2 h-4 w-64 rounded bg-muted/30" />
        </div>
        <div className="h-10 w-24 rounded-md border bg-muted/10" />
      </div>

      <div className="rounded-2xl border p-5">
        <div className="h-10 w-full rounded bg-muted/20" />
        <div className="mt-3 h-10 w-full rounded bg-muted/20" />
        <div className="mt-3 h-10 w-2/3 rounded bg-muted/20" />
      </div>
    </div>
  );
}

async function AdminSubmissionEditInner({
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

  // preload numeric amount from activity_units OR activity_value_number
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

export default function AdminSubmissionEditPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<EditSubmissionSkeleton />}>
      <AdminSubmissionEditInner {...props} />
    </Suspense>
  );
}
