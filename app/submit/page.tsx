// app/submit/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/cached-data";
import SubmitFormClient from "./submit-form-client";
import { createSubmission } from "./actions";

function SubmitSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <div className="h-8 w-32 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-64 rounded bg-muted/30" />
      </div>
      <div className="rounded-2xl border p-5">
        <div className="h-10 w-full rounded bg-muted/20" />
        <div className="mt-3 h-10 w-2/3 rounded bg-muted/20" />
        <div className="mt-3 h-10 w-1/2 rounded bg-muted/20" />
      </div>
    </div>
  );
}

async function SubmitInner({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const errorParam = typeof sp.error === "string" ? sp.error : null;

  const supabase = await createClient();

  const user = await getCachedUser();

  if (!user) {
    return (
      <div className="rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">Submit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You must be logged in to submit an activity.
        </p>
      </div>
    );
  }

  // ✅ Check if submissions are open
  const { data: settings, error: settingsError } = await supabase
    .from("game_settings")
    .select("submissions_open")
    .eq("id", true)
    .single();

  if (settingsError) {
    return (
      <div className="rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">Submit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Error loading game settings: {settingsError.message}
        </p>
      </div>
    );
  }

  if (!settings?.submissions_open) {
    return (
      <div className="rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">Submit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submissions are currently closed.
        </p>
      </div>
    );
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name")
    .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
    .maybeSingle();

  if (teamError) {
    return (
      <div className="rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">Submit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Error loading your team: {teamError.message}
        </p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">Submit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You’re not on a team yet. Create or join a team first.
        </p>
      </div>
    );
  }

  const { data: rules, error: rulesError } = await supabase
    .from("activity_rules")
    .select("*")
    .eq("active", true)
    .order("activity_key");

  if (rulesError) {
    return (
      <div className="rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">Submit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Error loading activities: {rulesError.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit</h1>
        <p className="text-sm text-muted-foreground">
          Log an activity for your team.
        </p>
      </div>

      {errorParam && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Couldn’t submit</div>
          <div className="mt-1 text-muted-foreground">{errorParam}</div>
        </div>
      )}

      <SubmitFormClient
        action={createSubmission}
        teamId={team.id}
        teamName={team.name}
        activityRules={rules ?? []}
      />
    </div>
  );
}

export default function SubmitPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<SubmitSkeleton />}>
      <SubmitInner {...props} />
    </Suspense>
  );
}
