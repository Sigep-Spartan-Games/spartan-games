"use client";

import { useMemo, useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";

import { requestSubmissionEdit, SuggestedChanges } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBanner } from "@/components/ui/status-banner";
import { Textarea } from "@/components/ui/textarea";
import { ActivityRule } from "@/lib/types";

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
    () => allRules?.find((candidate) => candidate.activity_key === selectedActivityKey) || rule,
    [allRules, selectedActivityKey, rule],
  );
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
        setTimeout(() => setOpen(false), 1500);
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
        Request edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Request submission edit</DialogTitle>
            <DialogDescription>
              Suggest corrections to {activityKey}. An admin will review your request.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <StatusBanner variant="success" title="Request submitted">
              Your edit request is ready for admin review.
            </StatusBanner>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/[0.06] p-4">
                <Checkbox
                  checked={isDeletion}
                  onCheckedChange={(checked) => setIsDeletion(checked === true)}
                  className="mt-0.5 data-[state=checked]:border-destructive data-[state=checked]:bg-destructive"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Delete this submission
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Ask an admin to remove the submission entirely.
                  </span>
                </span>
              </label>

              {!isDeletion ? (
                <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                  <div className="space-y-2">
                    <Label>Activity type</Label>
                    <Combobox
                      name="activity_key"
                      options={allRules.map((candidate) => ({
                        value: candidate.activity_key,
                        label: candidate.label ?? candidate.activity_key,
                        description: `${candidate.points_per_unit} pts${candidate.unit_label ? `/${candidate.unit_label}` : ""} · x${candidate.teammate_bonus} bonus`,
                      }))}
                      value={selectedActivityKey}
                      onChange={setSelectedActivityKey}
                      placeholder="Search activities..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="request-edit-date">Activity date</Label>
                    <Input
                      id="request-edit-date"
                      type="date"
                      required
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {rule.input_type === "boolean"
                        ? "Completed?"
                        : rule.unit_label
                          ? `Amount (${rule.unit_label})`
                          : "Details"}
                    </Label>

                    {rule.input_type === "number" ? (
                      <Input
                        type="number"
                        required
                        min={rule.min_value ?? 0}
                        step={rule.step_value ?? "any"}
                        value={units}
                        onChange={(event) => setUnits(event.target.value)}
                      />
                    ) : null}

                    {rule.input_type === "text" ? (
                      <Input
                        type="text"
                        required
                        value={textValue}
                        onChange={(event) => setTextValue(event.target.value)}
                      />
                    ) : null}

                    {rule.input_type === "boolean" ? (
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border bg-card px-3">
                        <Checkbox
                          checked={boolValue}
                          onCheckedChange={(checked) => setBoolValue(checked === true)}
                        />
                        <span className="text-sm">{rule.label || "Completed"}</span>
                      </label>
                    ) : null}
                  </div>

                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border bg-card px-3">
                    <Checkbox
                      checked={didWithTeammate}
                      onCheckedChange={(checked) => setDidWithTeammate(checked === true)}
                    />
                    <span className="text-sm">Did this with teammate</span>
                  </label>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="request-edit-reason">Reason for edit / fix needed</Label>
                <Textarea
                  id="request-edit-reason"
                  required
                  placeholder="Why does this need to be changed?"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-24 resize-none"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit request"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
