"use client";

import { useMemo } from "react";

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

const ACTIVITY_KEYS = Object.keys(ACTIVITY_LABELS);

export default function ScoringEditor({
  rules,
  saveAllAction,
  resetDefaultsAction,
}: {
  rules: RuleRow[];
  saveAllAction: (formData: FormData) => Promise<void>;
  resetDefaultsAction: (formData: FormData) => Promise<void>;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, RuleRow>();
    for (const r of rules) map.set(r.activity_key, r);

    return ACTIVITY_KEYS.map((key) => {
      const r = map.get(key);
      return {
        activity_key: key,
        label: ACTIVITY_LABELS[key] ?? key,
        points_per_unit: r?.points_per_unit ?? 10,
        teammate_bonus: r?.teammate_bonus ?? 15,
      };
    });
  }, [rules]);

  return (
    <div className="rounded-2xl border p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Scoring Rules</h2>
          <p className="text-sm text-muted-foreground">
            Points are enforced server-side. Edit values here and click{" "}
            <span className="font-medium text-foreground">Save all</span>.
          </p>
        </div>

        <div className="flex gap-2">
          <form action={resetDefaultsAction}>
            <button
              type="submit"
              className="h-10 rounded-md border px-3 text-sm font-medium"
            >
              Reset to defaults
            </button>
          </form>

          <button
            type="submit"
            form="save-all-rules"
            className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Save all
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-0 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-6">Activity</div>
          <div className="col-span-3">Points / Unit</div>
          <div className="col-span-3">Teammate Bonus</div>
        </div>

        <form id="save-all-rules" action={saveAllAction}>
          {rows.map((r) => (
            <div
              key={r.activity_key}
              className="grid grid-cols-12 gap-0 items-center px-4 py-3 border-b last:border-b-0"
            >
              <input
                type="hidden"
                name="activity_key[]"
                value={r.activity_key}
              />

              <div className="col-span-6 pr-3">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">
                  {r.activity_key}
                </div>
              </div>

              <div className="col-span-3 pr-3">
                <input
                  name="points_per_unit[]"
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={r.points_per_unit}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                />
              </div>

              <div className="col-span-3 pr-3">
                <input
                  name="teammate_bonus[]"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={r.teammate_bonus}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                />
              </div>
            </div>
          ))}
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
