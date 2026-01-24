import { Suspense } from "react";
import { createClient } from "../../lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  createTeamAction,
  joinByCodeAction,
  leaveTeamAction,
  renameTeamAction,
} from "./actions";

type TeamRow = {
  id: string;
  name: string;
  points: number;
  member1_name?: string | null;
  member2_name?: string | null;
  member1_id?: string | null;
  member2_id?: string | null;
  invite_code?: string | null;
};

type SP = { success?: string; error?: string };

function TeamsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-24 rounded bg-muted" />
        <div className="mt-2 h-4 w-60 rounded bg-muted" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-40 rounded-2xl border bg-muted/20" />
        <div className="h-40 rounded-2xl border bg-muted/20" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-28 rounded-2xl border bg-muted/20" />
        <div className="h-28 rounded-2xl border bg-muted/20" />
      </div>
    </div>
  );
}

// NOTE: Next (v15+) makes searchParams a Promise in some setups.
// So we unwrap it here.
export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  return (
    <Suspense fallback={<TeamsSkeleton />}>
      <TeamsContent sp={sp} />
    </Suspense>
  );
}

async function TeamsContent({ sp }: { sp?: SP }) {
  noStore();

  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user;

  const { data, error } = await supabase
    .from("teams")
    .select(
      "id,name,points,member1_name,member2_name,member1_id,member2_id,invite_code",
    )
    .order("name", { ascending: true });

  const teams = (data ?? []) as TeamRow[];

  const success = sp?.success ? decodeURIComponent(sp.success) : null;
  const errorMsg = sp?.error ? decodeURIComponent(sp.error) : null;

  const myTeam = me
    ? (teams.find((t) => t.member1_id === me.id || t.member2_id === me.id) ??
      null)
    : null;

  return (
    <div className="space-y-6">
      {(success || errorMsg) && (
        <div
          className={[
            "rounded-xl border p-3 text-sm",
            errorMsg ? "border-destructive/40 bg-destructive/5" : "bg-muted/30",
          ].join(" ")}
        >
          {errorMsg ?? success}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-sm text-muted-foreground">
          Create a team, invite your teammate, and track points.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Create */}
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-medium">Register a team</div>
          {myTeam ? (
            ""
          ) : (
            <form action={createTeamAction} className="mt-3 flex gap-2">
              <input
                name="teamName"
                placeholder="Team name"
                className="h-10 w-full rounded-xl border bg-transparent px-3 text-sm outline-none"
                maxLength={40}
                required
                disabled={!me || Boolean(myTeam)}
              />
              <button
                className="h-10 shrink-0 rounded-xl border px-4 text-sm font-medium disabled:opacity-50"
                type="submit"
                disabled={!me || Boolean(myTeam)}
              >
                Create
              </button>{" "}
            </form>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            {me
              ? myTeam
                ? "You’re already on a team. Leave it to create a new one."
                : "Creating a team auto-joins you and generates an invite code."
              : "Sign in to create a team."}
          </p>
        </div>

        {/* Join */}
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-medium">Join a team</div>
          {myTeam ? (
            ""
          ) : (
            <form action={joinByCodeAction} className="mt-3 flex gap-2">
              <input
                name="inviteCode"
                placeholder="Invite code"
                className="h-10 w-full rounded-xl border bg-transparent px-3 text-sm uppercase tracking-wider outline-none"
                maxLength={16}
                required
                disabled={!me || Boolean(myTeam)}
              />
              <button
                className="h-10 shrink-0 rounded-xl border px-4 text-sm font-medium disabled:opacity-50"
                type="submit"
                disabled={!me || Boolean(myTeam)}
              >
                Join
              </button>
            </form>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            {me
              ? myTeam
                ? "Leave your current team to join another."
                : "Enter an invite code your teammate gives you."
              : "Sign in to join a team."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Supabase error</div>
          <div className="mt-1 text-muted-foreground">{error.message}</div>
        </div>
      )}

      {/* My team */}
      {me && myTeam && (
        <div className="rounded-2xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">Your team</div>
              <div className="mt-1 truncate text-base font-semibold">
                {myTeam.name}
              </div>
              <div className="mt-1 truncate text-sm text-muted-foreground">
                {myTeam.member1_name ?? "—"} &nbsp;•&nbsp;{" "}
                {myTeam.member2_name ?? "—"}
              </div>

              {myTeam.invite_code && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Invite code:{" "}
                  <span className="rounded-md border px-2 py-1 font-mono text-xs tracking-widest">
                    {myTeam.invite_code}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {myTeam.member1_id === me.id && (
                <form action={renameTeamAction} className="flex gap-2">
                  <input type="hidden" name="teamId" value={myTeam.id} />
                  <input
                    name="newName"
                    placeholder="New team name"
                    className="h-9 w-44 rounded-xl border bg-transparent px-3 text-sm outline-none"
                    maxLength={40}
                    required
                  />
                  <button className="h-9 rounded-xl border px-3 text-sm font-medium">
                    Rename
                  </button>
                </form>
              )}

              <form
                action={async () => {
                  "use server";
                  await leaveTeamAction(myTeam.id);
                }}
              >
                <button className="h-9 w-full rounded-xl border px-3 text-sm font-medium">
                  Leave team
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Teams list */}
      <div className="grid gap-3 md:grid-cols-2">
        {teams.length === 0 ? (
          <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
            No teams yet.
          </div>
        ) : (
          teams.map((t) => {
            const isFull = Boolean(t.member2_id);
            return (
              <div key={t.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">
                      {t.name}
                    </div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {t.member1_name ?? "—"} &nbsp;•&nbsp;{" "}
                      {t.member2_name ?? "—"}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {isFull ? "Full" : "Open spot (invite-only)"}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">Points</div>
                    <div className="text-base font-semibold tabular-nums">
                      {t.points ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
