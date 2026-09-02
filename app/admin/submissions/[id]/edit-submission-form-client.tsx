// app/admin/submissions/[id]/edit-submission-form-client.tsx
"use client";

import { useMemo, useState } from "react";
import { ActivityRule } from "@/lib/types";
import { Button } from "@/components/ui/button";

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
  requestId?: string;
  teams: Team[];
  activityRules: ActivityRule[];
  initial: InitialSubmission;
};

export default function EditSubmissionFormClient({
  action,
  teamFilter,
  requestId,
  teams,
  activityRules,
  initial,
}: Props) {
  const [activityKey, setActivityKey] = useState(initial.activity_key);

  const activeRule = useMemo(
    () =>
      activityRules.find((r) => r.activity_key === activityKey) ||
      activityRules[0],
    [activityRules, activityKey],
  );

  const kind = activeRule?.input_type || "number";
  const step = activeRule?.step_value || 0.25;

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

    const rule = activityRules.find((r) => r.activity_key === next);
    const nextKind = rule?.input_type || "number";

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
    <div className="space-y-5 rounded-lg border bg-card p-5 sm:p-6">
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
        {requestId ? (
          <input type="hidden" name="request_id" value={requestId} />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {/* optional: allow admin to move submission to another team */}
          <label className="space-y-1">
            <div className="text-sm font-medium">Team</div>
            <select
              name="team_id"
              defaultValue={initial.team_id}
              className="h-11 w-full rounded-control border bg-background px-3 text-sm"
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
              className="h-11 w-full max-w-full cursor-pointer appearance-none rounded-control border bg-background px-3 text-sm"
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
            className="h-11 w-full rounded-control border bg-background px-3 text-sm"
            required
          >
            {activityRules.map((r) => (
              <option key={r.activity_key} value={r.activity_key}>
                {r.label ?? r.activity_key}
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
              className="h-11 w-full rounded-control border bg-background px-3 text-sm"
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
              className="h-11 w-full rounded-control border bg-background px-3 text-sm"
              placeholder="e.g. Garden State Classic"
              required
            />
            <div className="text-xs text-muted-foreground">
              Counts as 1 unit. (Name is stored for the submission record.)
            </div>
          </label>
        )}

        {kind === "boolean" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activity_value_bool"
              checked={boolVal}
              onChange={(e) => setBoolVal(e.target.checked)}
            />
            {activeRule?.label || "Completed"}
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
          <Button type="submit">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
