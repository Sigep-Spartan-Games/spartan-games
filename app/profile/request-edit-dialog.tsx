"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { requestSubmissionEdit, SuggestedChanges } from "./actions";
import { ActivityRule } from "@/lib/types";
import { useMemo } from "react";

interface RequestEditDialogProps {
  submissionId: string;
  teamId: string;
  activityKey: string;
  rule: ActivityRule;
  originalSubmission: any;
  allRules: ActivityRule[];
}

export function RequestEditDialog({
  submissionId,
  teamId,
  activityKey,
  rule,
  originalSubmission,
  allRules,
}: RequestEditDialogProps) {
  const [open, setOpen] = useState(false);

  const [selectedActivityKey, setSelectedActivityKey] = useState(activityKey);
  const activeRule = useMemo(
    () => allRules?.find((r) => r.activity_key === selectedActivityKey) || rule,
    [allRules, selectedActivityKey, rule],
  );

  // Structured Form State
  const [date, setDate] = useState(originalSubmission.activity_date || "");
  const [units, setUnits] = useState<number | string>(
    originalSubmission.activity_units ?? "",
  );
  const [textValue, setTextValue] = useState(
    originalSubmission.activity_value_text || "",
  );
  const [boolValue, setBoolValue] = useState(
    originalSubmission.activity_value_bool || false,
  );
  const [didWithTeammate, setDidWithTeammate] = useState(
    originalSubmission.did_with_teammate || false,
  );

  const [reason, setReason] = useState("");
  const [isDeletion, setIsDeletion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const suggestedChanges: SuggestedChanges = {
        activity_key: selectedActivityKey,
        activity_date: date,
        did_with_teammate: didWithTeammate,
        is_deletion: isDeletion,
      };

      if (!isDeletion) {
        if (activeRule.input_type === "number") {
          suggestedChanges.activity_units = Number(units);
        } else if (activeRule.input_type === "text") {
          suggestedChanges.activity_value_text = textValue;
        } else if (activeRule.input_type === "boolean") {
          suggestedChanges.activity_value_bool = boolValue;
        }
      }

      const result = await requestSubmissionEdit(
        submissionId,
        teamId,
        suggestedChanges,
        reason,
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          // Optional reset
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => setOpen(true)}
      >
        Request Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Request Edit: {activityKey}</DialogTitle>
            <DialogDescription>
              If your submission details were incorrect, you can request an edit
              here. An admin will review it.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-6 text-center text-sm text-green-500 font-medium">
              Edit request submitted successfully!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="text-sm font-medium text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-2 bg-destructive/10 p-4 rounded-xl border border-destructive/20 text-destructive">
                <input
                  type="checkbox"
                  id="isDeletion"
                  className="h-4 w-4 accent-destructive"
                  checked={isDeletion}
                  onChange={(e) => setIsDeletion(e.target.checked)}
                />
                <label
                  htmlFor="isDeletion"
                  className="text-sm font-semibold cursor-pointer"
                >
                  I want to delete this submission entirely
                </label>
              </div>

              {!isDeletion && (
                <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-dashed">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Activity Type</label>
                    <Combobox
                      name="activity_key"
                      options={allRules.map((r) => ({
                        value: r.activity_key,
                        label: r.label ?? r.activity_key,
                        description: `${r.points_per_unit} pts${r.unit_label ? `/${r.unit_label}` : ""} • x${r.teammate_bonus} bonus`,
                      }))}
                      value={selectedActivityKey}
                      onChange={setSelectedActivityKey}
                      placeholder="Search activities..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Activity Date</label>
                    <input
                      type="date"
                      required
                      className="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {rule.input_type === "boolean"
                        ? "Completed?"
                        : rule.unit_label
                          ? `Amount (${rule.unit_label})`
                          : "Details"}
                    </label>

                    {rule.input_type === "number" && (
                      <input
                        type="number"
                        required
                        min={rule.min_value ?? 0}
                        step={rule.step_value ?? "any"}
                        className="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background"
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                      />
                    )}

                    {rule.input_type === "text" && (
                      <input
                        type="text"
                        required
                        className="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                      />
                    )}

                    {rule.input_type === "boolean" && (
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={boolValue}
                          onChange={(e) => setBoolValue(e.target.checked)}
                        />
                        <span className="text-sm">
                          {rule.label || "Completed"}
                        </span>
                      </label>
                    )}
                  </div>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={didWithTeammate}
                      onChange={(e) => setDidWithTeammate(e.target.checked)}
                    />
                    <div className="text-sm">Did this with teammate</div>
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason for Edit / Fix needed
                </label>
                <textarea
                  required
                  placeholder="Why does this need to be changed?"
                  className="w-full h-24 px-3 py-2 text-sm rounded-md border bg-background resize-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
