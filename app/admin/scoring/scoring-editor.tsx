"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

type RuleRow = {
  activity_key: string;
  points_per_unit: number | null;
  teammate_bonus: number | null;
};

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

export default function ScoringEditor({
  rules,
  saveAllAction,
  resetDefaultsAction,
  addAction,
  deleteAction,
}: {
  rules: RuleRow[];
  saveAllAction: (formData: FormData) => Promise<void>;
  resetDefaultsAction: (formData: FormData) => Promise<void>;
  addAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const rows = useMemo(() => {
    // We want to show ALL rules from the DB.
    // We also want to map them to friendly labels if possible.
    return rules.map((r) => ({
      activity_key: r.activity_key,
      label: ACTIVITY_LABELS[r.activity_key] ?? r.activity_key,
      points_per_unit: r.points_per_unit ?? 10,
      teammate_bonus: r.teammate_bonus ?? 15,
    }));
  }, [rules]);

  return (
    <div className="rounded-2xl border p-5 space-y-6">
      {/* Top Header & Save Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scoring Rules</h2>
          <p className="text-sm text-muted-foreground">
            Edit values below and click{" "}
            <span className="font-medium text-foreground">Save all</span>.
          </p>
        </div>

        <div className="flex gap-2">
          <form action={resetDefaultsAction}>
            <button
              type="submit"
              className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted"
            >
              Reset to defaults
            </button>
          </form>

          {/* Main Save Form (detached from inputs via id) */}
          <form id="save-all-rules" action={saveAllAction}>
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save all
            </button>
          </form>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-5 sm:col-span-6">Activity</div>
          <div className="col-span-3 sm:col-span-2">Points / Unit</div>
          <div className="col-span-3 sm:col-span-2">Teammate Bonus</div>
          <div className="col-span-1 sm:col-span-2 text-center">Action</div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {rows.map((r) => (
            <div
              key={r.activity_key}
              className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-card"
            >
              {/* Hidden inputs for the save-all form */}
              <input
                type="hidden"
                name="activity_key[]"
                value={r.activity_key}
                form="save-all-rules"
              />

              <div className="col-span-5 sm:col-span-6 pr-2">
                <div className="text-sm font-medium truncate" title={r.label}>
                  {r.label}
                </div>
                <div className="text-xs text-muted-foreground truncate" title={r.activity_key}>
                  {r.activity_key}
                </div>
              </div>

              <div className="col-span-3 sm:col-span-2">
                <input
                  name="points_per_unit[]"
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={r.points_per_unit}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  required
                  form="save-all-rules"
                />
              </div>

              <div className="col-span-3 sm:col-span-2">
                <input
                  name="teammate_bonus[]"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={r.teammate_bonus}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  required
                  form="save-all-rules"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 flex justify-center">
                <form action={deleteAction}>
                  <input
                    type="hidden"
                    name="activity_key"
                    value={r.activity_key}
                  />
                  <button
                    type="submit"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Remove activity"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </button>
                </form>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No activities found. Add one below.
            </div>
          )}
        </div>
      </div>

      {/* Add New Rule Section */}
      <div className="rounded-xl border bg-muted/10 p-4">
        <h3 className="mb-3 text-sm font-medium">Add New Activity</h3>
        <form action={addAction} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <input
              name="activity_key"
              type="text"
              placeholder="Activity Key (e.g. jump_rope)"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <input
              name="points_per_unit"
              type="number"
              step="0.25"
              min="0"
              placeholder="Points / Unit"
              defaultValue={10}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <input
              name="teammate_bonus"
              type="number"
              step="1"
              min="0"
              placeholder="Bonus"
              defaultValue={15}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </form>
      </div>

      <p className="text-xs text-muted-foreground">
        Defaults are <span className="font-medium text-foreground">10</span>{" "}
        points per unit and{" "}
        <span className="font-medium text-foreground">+15</span> teammate bonus.
      </p>
    </div>
  );
}
