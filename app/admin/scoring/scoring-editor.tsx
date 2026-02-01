"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { ActivityRule } from "@/lib/types";

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
          <div className="col-span-3 sm:col-span-3">Activity / Label</div>
          <div className="col-span-2 sm:col-span-2">Input Type</div>
          <div className="col-span-2 sm:col-span-2">Points</div>
          <div className="col-span-2 sm:col-span-2">Bonus</div>
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
                }} className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-muted/20">
                  <input type="hidden" name="original_activity_key" value={r.activity_key} />
                  <input type="hidden" name="activity_key" value={r.activity_key} />

                  <div className="col-span-12 sm:col-span-3 space-y-1">
                    <div className="text-xs font-mono text-muted-foreground">{r.activity_key}</div>
                    <input name="label" defaultValue={r.label ?? ""} placeholder="Label" className="h-8 w-full rounded border px-2 text-sm" />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs font-mono text-muted-foreground">Input Type</label>
                    <select name="input_type" defaultValue={r.input_type ?? "number"} className="h-8 w-full rounded border px-2 text-sm">
                      <option value="number">Number</option>
                      <option value="text">Text</option>
                      <option value="boolean">True/False</option>
                    </select>
                    {r.input_type === 'number' && (
                      <input name="unit_label" defaultValue={r.unit_label ?? ""} placeholder="Unit (e.g. miles)" className="mt-1 h-8 w-full rounded border px-2 text-xs" />
                    )}
                  </div>

                  <div className="col-span-3 sm:col-span-2">
                    <input name="points_per_unit" type="number" step="0.25" defaultValue={r.points_per_unit} className="h-8 w-full rounded border px-2 text-sm" />
                  </div>

                  <div className="col-span-3 sm:col-span-2">
                    <input name="teammate_bonus" type="number" step="1" defaultValue={r.teammate_bonus} className="h-8 w-full rounded border px-2 text-sm" />
                  </div>

                  <div className="col-span-12 sm:col-span-3 flex justify-end gap-2 mt-2 sm:mt-0">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" name="active" defaultChecked={r.active} /> Active
                    </label>
                    <button type="submit" className="h-8 w-8 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90">
                      <Save className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEditingKey(null)} className="h-8 w-8 flex items-center justify-center rounded border hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={r.activity_key} className={`grid grid-cols-12 gap-2 items-center px-4 py-3 ${!r.active ? 'opacity-50' : ''}`}>
                <div className="col-span-3 sm:col-span-3">
                  <div className="font-medium text-sm">{r.label ?? r.activity_key}</div>
                  <div className="text-xs text-muted-foreground">{r.activity_key}</div>
                </div>
                <div className="col-span-2 sm:col-span-2 text-sm">
                  <span className="capitalize">{r.input_type}</span>
                  {r.unit_label && <span className="text-muted-foreground text-xs ml-1">({r.unit_label})</span>}
                </div>
                <div className="col-span-2 sm:col-span-2 text-sm">
                  {r.points_per_unit}
                </div>
                <div className="col-span-2 sm:col-span-2 text-sm">
                  +{r.teammate_bonus}
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
      <div className="rounded-xl border bg-muted/10 p-4">
        <h3 className="mb-3 text-sm font-medium">Add New Activity</h3>
        <form action={addAction} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <input
              name="activity_key"
              type="text"
              placeholder="Key (e.g. jump_rope)"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <input
              name="label"
              type="text"
              placeholder="Label (e.g. Jump Rope)"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <select name="input_type" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="number">Number</option>
              <option value="text">Text</option>
              <option value="boolean">Boolean</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <input
              name="points_per_unit"
              type="number"
              step="0.25"
              min="0"
              placeholder="Pts"
              defaultValue={10}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-1">
            <input
              name="teammate_bonus"
              type="number"
              step="1"
              min="0"
              placeholder="Bns"
              defaultValue={15}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
