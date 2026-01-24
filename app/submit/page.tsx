import { createClient } from "../../lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import SubmitFormClient from "./submit-form-client";
import { createSubmission } from "./actions";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const errorParam = typeof sp.error === "string" ? sp.error : null;

  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

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
      />
    </div>
  );
}
