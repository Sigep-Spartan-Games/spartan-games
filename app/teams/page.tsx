// app/teams/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "../../lib/supabase/server";
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

async function TeamsInner({ searchParams }: { searchParams: Promise<SP> }) {
  // IMPORTANT: keep uncached work inside Suspense
  noStore();

  const sp = await searchParams;

  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user;

  // ✅ registration gate
  const { data: settings, error: settingsError } = await supabase
    .from("game_settings")
    .select("registration_open")
    .eq("id", true)
    .single();

  const registrationOpen = settingsError
    ? true
    : Boolean(settings?.registration_open);

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

  const canRegister = Boolean(me) && !myTeam && registrationOpen;

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

      {!registrationOpen && (
        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="font-medium">Team registration is closed</div>
          <div className="mt-1 text-muted-foreground">
            You can still view teams. Registration will reopen when the games
            end.
          </div>
        </div>
      )}

      {settingsError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Settings warning</div>
          <div className="mt-1 text-muted-foreground">
            Couldn’t load game settings: {settingsError.message}. Defaulting
            registration to open.
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-sm text-muted-foreground">
          Create a team, invite your teammate, and track points.
        </p>
      </div>

      {registrationOpen && !myTeam && (
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
                  disabled={!canRegister}
                />
                <button
                  className="h-10 shrink-0 rounded-xl border px-4 text-sm font-medium disabled:opacity-50"
                  type="submit"
                  disabled={!canRegister}
                >
                  Create
                </button>
              </form>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              {!me
                ? "Sign in to create a team."
                : myTeam
                  ? "You’re already on a team. Leave it to create a new one."
                  : registrationOpen
                    ? "Creating a team auto-joins you and generates an invite code."
                    : "Registration is closed right now."}
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
                  disabled={!canRegister}
                />
                <button
                  className="h-10 shrink-0 rounded-xl border px-4 text-sm font-medium disabled:opacity-50"
                  type="submit"
                  disabled={!canRegister}
                >
                  Join
                </button>
              </form>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              {!me
                ? "Sign in to join a team."
                : myTeam
                  ? "Leave your current team to join another."
                  : registrationOpen
                    ? "Enter an invite code your teammate gives you."
                    : "Registration is closed right now."}
            </p>
          </div>
        </div>
      )}

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

export default function TeamsPage(props: { searchParams: Promise<SP> }) {
  return (
    <Suspense fallback={<TeamsSkeleton />}>
      <TeamsInner {...props} />
    </Suspense>
  );
}
