// app/admin/submissions/[id]/edit-submission-form-client.tsx
"use client";

import { useMemo, useState } from "react";

type Team = { id: string; name: string };

type InitialSubmission = {
  id: string;
  team_id: string;
  activity_key: string;
  activity_date: string; // yyyy-mm-dd
  did_with_teammate: boolean;
  activity_units: number | null;
  activity_value_text: string | null;
  activity_value_bool: boolean | null;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  teamFilter?: string;
  teams: Team[];
  initial: InitialSubmission;
};

// Keep these identical to your submit form keys/labels
const ACTIVITY_LABELS: Record<string, string> = {
  sport_practice: "Sport practice (hours)",
  running: "Running (miles)",
  cycling: "Cycling (miles)",
  gyming: "Gyming (hours)",
  swimming: "Swimming (laps)",
  sporting: "Sporting (number of games)",
  calorie_goal: "Hitting Calorie Goal for Day (yes/no)",
  races: "Races (number of races)",
  powerlifting_meet: "Powerlifting meet (name of meet)",
  bodybuilding_show: "Body building show (name of show)",
  win_tournament: "Win a tournament (name of tournament)",
  sleep: "Sleep (hours)",
};

type AmountKind = "number" | "text" | "bool";

function amountKindForKey(key: string): AmountKind {
  if (key === "calorie_goal") return "bool";
  if (
    key === "powerlifting_meet" ||
    key === "bodybuilding_show" ||
    key === "win_tournament"
  )
    return "text";
  return "number";
}

function defaultStepForKey(key: string) {
  // match your scoring step expectations (hours/miles often 0.25)
  if (key === "sport_practice" || key === "gyming" || key === "sleep")
    return 0.25;
  if (key === "running" || key === "cycling") return 0.25;
  if (key === "swimming") return 1;
  if (key === "sporting" || key === "races") return 1;
  return 0.25;
}

export default function EditSubmissionFormClient({
  action,
  teamFilter,
  teams,
  initial,
}: Props) {
  const [activityKey, setActivityKey] = useState(initial.activity_key);

  const kind = useMemo(() => amountKindForKey(activityKey), [activityKey]);
  const step = useMemo(() => defaultStepForKey(activityKey), [activityKey]);

  // Preload “amount” values but let the user change them
  const [units, setUnits] = useState<string>(
    initial.activity_units === null || initial.activity_units === undefined
      ? ""
      : String(initial.activity_units),
  );
  const [textVal, setTextVal] = useState<string>(
    initial.activity_value_text ?? "",
  );
  const [boolVal, setBoolVal] = useState<boolean>(
    initial.activity_value_bool === true,
  );

  // When activity type changes, clear irrelevant amount fields (nice UX)
  function onActivityChange(next: string) {
    setActivityKey(next);

    const nextKind = amountKindForKey(next);
    if (nextKind === "number") {
      // keep units if it exists; clear others
      setTextVal("");
      setBoolVal(false);
    } else if (nextKind === "text") {
      setUnits("");
      setBoolVal(false);
    } else {
      setUnits("");
      setTextVal("");
      // keep bool as-is or default false
      setBoolVal(false);
    }
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Submission</h2>
        <p className="text-sm text-muted-foreground">
          Edit the same fields as the normal submit form. Points will be
          recalculated server-side.
        </p>
      </div>

      <form action={action} className="space-y-4">
        {/* required for update */}
        <input type="hidden" name="id" value={initial.id} />
        {teamFilter ? (
          <input type="hidden" name="teamFilter" value={teamFilter} />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {/* optional: allow admin to move submission to another team */}
          <label className="space-y-1">
            <div className="text-sm font-medium">Team</div>
            <select
              name="team_id"
              defaultValue={initial.team_id}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Activity date</div>
            <input
              name="activity_date"
              type="date"
              defaultValue={initial.activity_date}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <div className="text-sm font-medium">Activity type</div>
          <select
            name="activity_key"
            value={activityKey}
            onChange={(e) => onActivityChange(e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            required
          >
            {Object.keys(ACTIVITY_LABELS).map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        {/* Dynamic Amount */}
        {kind === "number" && (
          <label className="space-y-1 block">
            <div className="text-sm font-medium">Amount</div>
            <input
              name="activity_units"
              type="number"
              step={step}
              min="0"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="e.g. 2, 1.5, 0.75"
              required
            />
            <div className="text-xs text-muted-foreground">
              This is the “amount” (hours, miles, laps, games, etc.).
            </div>
          </label>
        )}

        {kind === "text" && (
          <label className="space-y-1 block">
            <div className="text-sm font-medium">Name</div>
            <input
              name="activity_value_text"
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="e.g. Garden State Classic"
              required
            />
            <div className="text-xs text-muted-foreground">
              Counts as 1 unit. (Name is stored for the submission record.)
            </div>
          </label>
        )}

        {kind === "bool" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activity_value_bool"
              checked={boolVal}
              onChange={(e) => setBoolVal(e.target.checked)}
            />
            Hit calorie goal (true)
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="did_with_teammate"
            defaultChecked={initial.did_with_teammate}
          />
          Did with teammate
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
