"use client";

import { useMemo, useState, useRef } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { ActivityRule } from "@/lib/types";

// Helper to generate activity_key from label
function generateActivityKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special chars
    .replace(/\s+/g, "_"); // spaces to underscores
}

export default function ScoringEditor({
  rules,
  saveAllAction,
  updateAction,
  resetDefaultsAction,
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
    <div className="rounded-2xl border p-5 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity Rules</h2>
          <p className="text-sm text-muted-foreground">
            Manage activities, point values, and input types.
          </p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-4 sm:col-span-3">Activity / Label</div>
          <div className="hidden sm:block col-span-2">Input Type</div>
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
                <form key={r.activity_key} action={async (fd) => {
                  await updateAction(fd);
                  setEditingKey(null);
                }} className="grid grid-cols-12 gap-2 items-start px-4 py-4 bg-muted/30 border-l-2 border-primary/50">
                  <input type="hidden" name="original_activity_key" value={r.activity_key} />
                  <input type="hidden" name="activity_key" value={r.activity_key} />

                  <div className="col-span-12 sm:col-span-3 space-y-1">
                    <label className="text-xs font-medium text-foreground/70">Activity Label</label>
                    <div className="text-xs font-mono text-muted-foreground mb-1">{r.activity_key}</div>
                    <input name="label" defaultValue={r.label ?? ""} placeholder="Label" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-foreground/70">Input Type</label>
                    <select name="input_type" defaultValue={r.input_type ?? "number"} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="number">Number</option>
                      <option value="text">Text</option>
                      <option value="boolean">True/False</option>
                    </select>
                    <div className="space-y-1 mt-2">
                      <label className="text-xs font-medium text-foreground/70">Unit Label</label>
                      <input name="unit_label" defaultValue={r.unit_label ?? ""} placeholder="e.g. miles" className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>

                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-foreground/70">Points</label>
                    <input name="points_per_unit" type="number" step="0.25" defaultValue={r.points_per_unit} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div className="col-span-3 sm:col-span-1 space-y-1">
                    <label className="text-xs font-medium text-foreground/70">Bonus</label>
                    <input name="teammate_bonus" type="number" step="1" defaultValue={r.teammate_bonus} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div className="col-span-3 sm:col-span-1 space-y-1">
                    <label className="text-xs font-medium text-foreground/70">Cap</label>
                    <input name="weekly_cap" type="number" step="1" min="0" defaultValue={r.weekly_cap ?? ""} placeholder="∞" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div className="col-span-12 sm:col-span-3 flex items-start justify-end gap-2 pt-6">
                    <button type="submit" className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingKey(null)} className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors">
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={r.activity_key} className={`grid grid-cols-12 gap-2 items-center px-4 py-3 ${!r.active ? 'opacity-50' : ''}`}>
                <div className="col-span-4 sm:col-span-3">
                  <div className="font-medium text-sm">{r.label ?? r.activity_key}</div>
                  <div className="text-xs text-muted-foreground">{r.activity_key}</div>
                </div>
                <div className="hidden sm:block col-span-2 text-sm">
                  <span className="capitalize">{r.input_type === 'boolean' ? 'True/False' : r.input_type}</span>
                  {r.unit_label && <span className="text-muted-foreground text-xs ml-1">({r.unit_label})</span>}
                </div>
                <div className="col-span-3 sm:col-span-2 text-sm">
                  {r.points_per_unit}
                </div>
                <div className="col-span-2 sm:col-span-1 text-sm">
                  +{r.teammate_bonus}
                </div>
                <div className="hidden sm:block sm:col-span-1 text-sm text-muted-foreground">
                  {r.weekly_cap != null ? r.weekly_cap : '∞'}
                </div>
                <div className="col-span-3 sm:col-span-3 flex justify-end gap-2">
                  <button onClick={() => setEditingKey(r.activity_key)} className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted" title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <form action={deleteAction}>
                    <input type="hidden" name="activity_key" value={r.activity_key} />
                    <button type="submit" className="h-8 w-8 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No activities rules found.</div>
          )}
        </div>
      </div>

      {/* Add New Rule Section */}
      <AddNewActivityForm addAction={addAction} />
    </div>
  );
}

// Separate component for Add New Activity to manage state for auto-generating activity_key
function AddNewActivityForm({ addAction }: { addAction: (formData: FormData) => Promise<void> }) {
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
    <div className="rounded-xl border border-primary/20 bg-muted/20 p-5">
      <h3 className="mb-4 text-base font-semibold text-foreground">Add New Activity</h3>
      <form action={addAction} className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
        {/* Hidden field for auto-generated activity_key */}
        <input
          ref={activityKeyRef}
          type="hidden"
          name="activity_key"
          defaultValue=""
        />
        <div className="sm:col-span-4 space-y-1">
          <label className="text-xs font-medium text-foreground/70">Activity Name</label>
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
              Key: <span className="font-mono">{generateActivityKey(label)}</span>
            </p>
          )}
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground/70">Input Type</label>
          <select name="input_type" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="number">Number</option>
            <option value="text">Text</option>
            <option value="boolean">True/False</option>
          </select>
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground/70">Unit (optional)</label>
          <input
            name="unit_label"
            type="text"
            placeholder="e.g. miles"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:col-span-1 space-y-1">
          <label className="text-xs font-medium text-foreground/70">Points</label>
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
        <div className="sm:col-span-1 space-y-1">
          <label className="text-xs font-medium text-foreground/70">Bonus</label>
          <input
            name="teammate_bonus"
            type="number"
            step="1"
            min="0"
            placeholder="15"
            defaultValue={15}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
        <div className="sm:col-span-1 space-y-1">
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
        <div className="sm:col-span-1">
          <button
            type="submit"
            disabled={!label.trim()}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-5"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
