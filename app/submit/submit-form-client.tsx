"use client";

import { useMemo, useState } from "react";

type ActivityKey =
  | "sport_practice"
  | "running"
  | "cycling"
  | "gyming"
  | "swimming"
  | "sporting"
  | "calorie_goal"
  | "races"
  | "powerlifting_meet"
  | "bodybuilding_show"
  | "win_tournament"
  | "sleep";

type ActivityDef = {
  label: string;
  unitLabel?: string;
  input: "number" | "text" | "boolean";
  min?: number;
  step?: number;
};

const ACTIVITY_DEFS: Record<ActivityKey, ActivityDef> = {
  sport_practice: {
    label: "Sport practice",
    unitLabel: "hours",
    input: "number",
    min: 0,
    step: 0.25,
  },
  running: {
    label: "Running",
    unitLabel: "miles",
    input: "number",
    min: 0,
    step: 0.1,
  },
  cycling: {
    label: "Cycling",
    unitLabel: "miles",
    input: "number",
    min: 0,
    step: 0.1,
  },
  gyming: {
    label: "Gyming",
    unitLabel: "hours",
    input: "number",
    min: 0,
    step: 0.25,
  },
  swimming: {
    label: "Swimming",
    unitLabel: "laps",
    input: "number",
    min: 0,
    step: 1,
  },
  sporting: {
    label: "Sporting",
    unitLabel: "games",
    input: "number",
    min: 0,
    step: 1,
  },
  calorie_goal: { label: "Hitting Calorie Goal for Day", input: "boolean" },
  races: {
    label: "Races",
    unitLabel: "races",
    input: "number",
    min: 0,
    step: 1,
  },
  powerlifting_meet: {
    label: "Powerlifting meet",
    unitLabel: "name of meet",
    input: "text",
  },
  bodybuilding_show: {
    label: "Body building show",
    unitLabel: "name of show",
    input: "text",
  },
  win_tournament: {
    label: "Win a tournament",
    unitLabel: "name of tournament",
    input: "text",
  },
  sleep: {
    label: "Sleep",
    unitLabel: "hours",
    input: "number",
    min: 0,
    step: 0.25,
  },
};

export default function SubmitFormClient({
  action,
  teamId,
  teamName,
}: {
  action: (formData: FormData) => Promise<void>;
  teamId: string;
  teamName: string;
}) {
  const [activityKey, setActivityKey] = useState<ActivityKey>("running");
  const def = useMemo(() => ACTIVITY_DEFS[activityKey], [activityKey]);

  const today = useMemo(() => {
    const d = new Date();
    // yyyy-mm-dd local
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  return (
    <form action={action} className="space-y-4 rounded-2xl border p-5">
      {/* Team locked */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Team</label>
        <input type="hidden" name="team_id" value={teamId} />
        <input
          value={teamName}
          disabled
          className="h-12 w-full rounded-md border bg-muted px-3 text-base"
        />
        <p className="text-xs text-muted-foreground">
          You can only submit for your own team.
        </p>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date</label>
        <input
          name="activity_date"
          type="date"
          defaultValue={today}
          className="h-12 w-full rounded-md border bg-background px-3 text-base"
          required
        />
      </div>

      {/* Activity dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Activity</label>
        <select
          name="activity_key"
          className="h-12 w-full rounded-md border bg-background px-3 text-base"
          value={activityKey}
          onChange={(e) => setActivityKey(e.target.value as ActivityKey)}
          required
        >
          {Object.entries(ACTIVITY_DEFS).map(([key, v]) => (
            <option key={key} value={key}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic value input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {def.input === "boolean"
            ? "Completed?"
            : def.unitLabel
              ? `Amount (${def.unitLabel})`
              : "Details"}
        </label>

        {def.input === "number" && (
          <input
            name="activity_value_number"
            type="number"
            min={def.min ?? 0}
            step={def.step ?? 1}
            placeholder={
              def.unitLabel ? `Enter ${def.unitLabel}…` : "Enter amount…"
            }
            className="h-12 w-full rounded-md border bg-background px-3 text-base"
            required
          />
        )}

        {def.input === "text" && (
          <input
            name="activity_value_text"
            placeholder={
              def.unitLabel ? `Enter ${def.unitLabel}…` : "Enter details…"
            }
            className="h-12 w-full rounded-md border bg-background px-3 text-base"
            required
          />
        )}

        {def.input === "boolean" && (
          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              type="checkbox"
              name="activity_value_bool"
              className="h-5 w-5"
            />
            <div>
              <div className="text-sm font-medium">
                Yes, I hit my calorie goal
              </div>
              <div className="text-xs text-muted-foreground">
                Leave unchecked for “No”.
              </div>
            </div>
          </label>
        )}
      </div>

      {/* Points + teammate multiplier stays the same */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Base Points</label>
        <input
          name="base_points"
          type="number"
          min={1}
          step={1}
          placeholder="10"
          className="h-12 w-full rounded-md border bg-background px-3 text-base"
          required
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border p-4">
        <input type="checkbox" name="did_with_teammate" className="h-5 w-5" />
        <div>
          <div className="text-sm font-medium">Did this with teammate</div>
          <div className="text-xs text-muted-foreground">
            Applies multiplier automatically.
          </div>
        </div>
      </label>

      <button
        type="submit"
        className="h-12 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
      >
        Submit Activity
      </button>
    </form>
  );
}
