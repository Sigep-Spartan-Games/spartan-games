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
import { requestSubmissionEdit } from "./actions";

interface RequestEditDialogProps {
  submissionId: string;
  teamId: string;
  activityKey: string;
}

export function RequestEditDialog({
  submissionId,
  teamId,
  activityKey,
}: RequestEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [expectedValues, setExpectedValues] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await requestSubmissionEdit(
        submissionId,
        teamId,
        expectedValues,
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Correct Values</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15 reps, instead of 10"
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background"
                  value={expectedValues}
                  onChange={(e) => setExpectedValues(e.target.value)}
                />
              </div>

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
