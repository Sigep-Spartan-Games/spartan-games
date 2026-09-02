import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/cached-data";
import SubmitFormClient from "./submit-form-client";
import { createSubmission } from "./actions";
import { RulesModal } from "@/components/rules-modal";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { EmptyState } from "@/components/ui/empty-state";

function SubmitSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading submission form">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded bg-muted" />
        <div className="h-5 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-[34rem] animate-pulse rounded-lg border bg-muted/30" />
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
    return <EmptyState title="Sign in to submit" description="You must be logged in to submit an activity." />;
  }

  const { data: settings, error: settingsError } = await supabase
    .from("game_settings")
    .select("submissions_open")
    .eq("id", true)
    .single();

  if (settingsError) {
    return (
      <StatusBanner variant="error" title="Could not load game settings">
        {settingsError.message}
      </StatusBanner>
    );
  }

  if (!settings?.submissions_open) {
    return <EmptyState title="Submissions are closed" description="Submissions are currently closed." />;
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name")
    .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
    .maybeSingle();

  if (teamError) {
    return (
      <StatusBanner variant="error" title="Could not load your team">
        {teamError.message}
      </StatusBanner>
    );
  }

  if (!team) {
    return (
      <EmptyState
        title="Join a team first"
        description="You're not on a team yet. Create or join a team before logging an activity."
      />
    );
  }

  const { data: rules, error: rulesError } = await supabase
    .from("activity_rules")
    .select("*")
    .eq("active", true)
    .order("activity_key");

  if (rulesError) {
    return (
      <StatusBanner variant="error" title="Could not load activities">
        {rulesError.message}
      </StatusBanner>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Submit activity"
        description="Log an activity for your team and review the scoring rule before submitting."
        actions={<RulesModal />}
      />
      {errorParam ? (
        <StatusBanner variant="error" title="Couldn't submit">
          {errorParam}
        </StatusBanner>
      ) : null}
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
