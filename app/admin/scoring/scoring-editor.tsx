"use client";

import { useMemo, useState, useRef } from "react";
import { Plus, Edit2, Save, X } from "lucide-react";
import { ActivityRule } from "@/lib/types";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  ACTIVITY_UNIT_OPTIONS,
  getActivityUnitLabel,
  getInputTypeForActivityUnit,
  normalizeActivityUnit,
  type ActivityUnitValue,
} from "@/lib/activity-units";

// Helper to generate activity_key from label
function generateActivityKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special chars
    .replace(/\s+/g, "_"); // spaces to underscores
}

function ActivityUnitField({ rule }: { rule?: ActivityRule }) {
  const [unit, setUnit] = useState<ActivityUnitValue>(() =>
    normalizeActivityUnit(getActivityUnitLabel(rule), rule?.input_type),
  );

  return (
    <>
      <select
        name="unit_label"
        value={unit}
        onChange={(event) => setUnit(event.target.value as ActivityUnitValue)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {ACTIVITY_UNIT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="hidden"
        name="input_type"
        value={getInputTypeForActivityUnit(unit)}
      />
    </>
  );
}

export default function ScoringEditor({
  rules,
  updateAction,
  addAction,
  deleteAction,
}: {
  rules: ActivityRule[];
  saveAllAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
  resetDefaultsAction: (formData: FormData) => Promise<void>;
  addAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const rows = useMemo(() => {
    return rules;
  }, [rules]);

  return (
    <div className="space-y-6 rounded-lg border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity Rules</h2>
          <p className="text-sm text-muted-foreground">
            Manage activities, units, and point values.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
          <div className="col-span-4 sm:col-span-3">Activity / Label</div>
          <div className="hidden sm:block col-span-2">Unit</div>
          <div className="col-span-3 sm:col-span-2">Points</div>
          <div className="col-span-2 sm:col-span-1">Bonus</div>
          <div className="hidden sm:block sm:col-span-1">Cap</div>
          <div className="col-span-3 sm:col-span-3 text-right">Action</div>
        </div>

        <div className="divide-y">
          {rows.map((r) => {
            const isEditing = editingKey === r.activity_key;
            if (isEditing) {
              return (
                <form
                  key={r.activity_key}
                  action={async (fd) => {
                    await updateAction(fd);
                    setEditingKey(null);
                  }}
                  className="grid grid-cols-12 items-start gap-3 border-l-2 border-primary/50 bg-muted/30 px-4 py-4"
                >
                  <input
                    type="hidden"
                    name="original_activity_key"
                    value={r.activity_key}
                  />
                  <input
                    type="hidden"
                    name="activity_key"
                    value={r.activity_key}
                  />

                  <div className="col-span-12 space-y-1 sm:col-span-4">
                    <label className="text-xs font-medium text-foreground/70">
                      Activity Label
                    </label>
                    <input
                      name="label"
                      defaultValue={r.label ?? ""}
                      placeholder="Label"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="text-xs font-mono text-muted-foreground">
                      {r.activity_key}
                    </div>
                  </div>

                  <div className="col-span-6 space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground/70">
                      Unit
                    </label>
                    <ActivityUnitField rule={r} />
                  </div>

                  <div className="col-span-12 space-y-1 sm:col-span-6">
                    <label className="text-xs font-medium text-foreground/70">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={r.description ?? ""}
                      placeholder="Optional details or rules for this activity..."
                      className="min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="col-span-4 space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground/70">
                      Points
                    </label>
                    <input
                      name="points_per_unit"
                      type="number"
                      step="0.25"
                      defaultValue={r.points_per_unit}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="col-span-4 space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground/70">
                      Bonus
                    </label>
                    <input
                      name="teammate_bonus"
                      type="number"
                      step="0.1"
                      defaultValue={r.teammate_bonus}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="col-span-4 space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground/70">
                      Cap
                    </label>
                    <input
                      name="weekly_cap"
                      type="number"
                      step="1"
                      min="0"
                      defaultValue={r.weekly_cap ?? ""}
                      placeholder="∞"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="col-span-12 flex items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex h-11 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-control border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={r.activity_key}
                className={`grid grid-cols-12 items-center gap-2 px-4 py-3.5 transition-colors hover:bg-muted/20 ${!r.active ? "opacity-50" : ""}`}
              >
                <div className="col-span-4 sm:col-span-3">
                  <div className="font-medium text-sm">
                    {r.label ?? r.activity_key}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.activity_key}
                  </div>
                </div>
                <div className="hidden sm:block col-span-2 text-sm">
                  {ACTIVITY_UNIT_OPTIONS.find(
                    (option) =>
                      option.value ===
                      normalizeActivityUnit(getActivityUnitLabel(r), r.input_type),
                  )?.label}
                </div>
                <div className="col-span-3 sm:col-span-2 text-sm">
                  {r.points_per_unit}
                </div>
                <div className="col-span-2 sm:col-span-1 text-sm">
                  +{r.teammate_bonus}
                </div>
                <div className="hidden sm:block sm:col-span-1 text-sm text-muted-foreground">
                  {r.weekly_cap != null ? r.weekly_cap : "∞"}
                </div>
                <div className="col-span-3 sm:col-span-3 flex justify-end gap-2">
                  <button
                    onClick={() => setEditingKey(r.activity_key)}
                    className="flex h-11 w-11 items-center justify-center rounded-control hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <ConfirmDeleteButton
                    action={deleteAction}
                    payload={{ activity_key: r.activity_key }}
                    title="Delete Activity Rule"
                    description={`Are you sure you want to delete "${r.label ?? r.activity_key}"? This will prevent new submissions for this activity.`}
                  />
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No activities rules found.
            </div>
          )}
        </div>
      </div>

      {/* Add New Rule Section */}
      <AddNewActivityForm addAction={addAction} />
    </div>
  );
}

function AddNewActivityForm({
  addAction,
}: {
  addAction: (formData: FormData) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const activityKeyRef = useRef<HTMLInputElement>(null);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    // Update the hidden activity_key field
    if (activityKeyRef.current) {
      activityKeyRef.current.value = generateActivityKey(newLabel);
    }
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.035] p-5">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Add New Activity
      </h3>
      <form
        action={addAction}
        className="grid grid-cols-12 items-start gap-3 px-0 py-0"
      >
        {/* Hidden field for auto-generated activity_key */}
        <input
          ref={activityKeyRef}
          type="hidden"
          name="activity_key"
          defaultValue=""
        />

        <div className="col-span-12 space-y-1 sm:col-span-4">
          <label className="text-xs font-medium text-foreground/70">
            Activity Name
          </label>
          <input
            name="label"
            type="text"
            placeholder="e.g. Karate Tournament"
            value={label}
            onChange={handleLabelChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          {label && (
            <p className="text-xs text-muted-foreground">
              Key:{" "}
              <span className="font-mono">{generateActivityKey(label)}</span>
            </p>
          )}
        </div>

        <div className="col-span-6 space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-foreground/70">
            Unit
          </label>
          <ActivityUnitField />
        </div>

        <div className="col-span-12 space-y-1 sm:col-span-6">
          <label className="text-xs font-medium text-foreground/70">
            Description (optional)
          </label>
          <textarea
            name="description"
            placeholder="Optional details or rules for this activity..."
            className="min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="col-span-4 space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-foreground/70">
            Points
          </label>
          <input
            name="points_per_unit"
            type="number"
            step="0.25"
            min="0"
            placeholder="10"
            defaultValue={10}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div className="col-span-4 space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-foreground/70">
            Bonus
          </label>
          <input
            name="teammate_bonus"
            type="number"
            step="0.1"
            min="0"
            placeholder="1.5"
            defaultValue={1.5}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div className="col-span-4 space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-foreground/70">Cap</label>
          <input
            name="weekly_cap"
            type="number"
            step="1"
            min="0"
            placeholder="∞"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="col-span-12 flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={!label.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
