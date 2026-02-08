"use client";

import { useMemo, useState, useEffect } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Combobox } from "@/components/ui/combobox";
import { ActivityRule } from "@/lib/types";
import imageCompression from 'browser-image-compression';

export default function SubmitFormClient({
  action,
  teamId,
  teamName,
  activityRules,
}: {
  action: (formData: FormData) => Promise<void>;
  teamId: string;
  teamName: string;
  activityRules: ActivityRule[];
}) {
  const sortedRules = useMemo(() => {
    return [...activityRules].sort((a, b) => {
      const labelA = (a.label || a.activity_key || "").toLowerCase();
      const labelB = (b.label || b.activity_key || "").toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [activityRules]);

  const [activityKey, setActivityKey] = useState<string>("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);

  // Default to first activity if available
  useEffect(() => {
    if (sortedRules.length > 0 && !activityKey) {
      setActivityKey(sortedRules[0].activity_key);
    }
  }, [sortedRules, activityKey]);

  const rule = useMemo(
    () => activityRules.find((r) => r.activity_key === activityKey),
    [activityRules, activityKey],
  );

  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const options = {
        maxSizeMB: 0.2, // ~200KB
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      setProofImage(compressedFile);
    } catch (error) {
      console.error("Image compression error:", error);
      // Fallback to original if compression fails, though unlikely
      setProofImage(file);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    if (proofImage) {
      // Append the compressed file, overriding any original selection if needed
      formData.set("proof_image", proofImage, proofImage.name);
    }
    await action(formData);
  };

  if (activityRules.length === 0) {
    return (
      <div className="rounded-2xl border p-5 text-center text-muted-foreground">
        No activities available to submit.
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-2xl border p-4 md:p-5">
      {/* Team */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Team</label>
        <input type="hidden" name="team_id" value={teamId} />
        <input
          value={teamName}
          disabled
          className="h-11 w-full rounded-md border bg-muted px-3 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          You can only submit for your own team.
        </p>
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Date</label>
        <input
          name="activity_date"
          type="date"
          defaultValue={today}
          className="h-11 w-full max-w-full appearance-none rounded-md border bg-background px-3 text-sm cursor-pointer"
          required
          onClick={(e) => e.currentTarget.showPicker()}
        />
      </div>

      {/* Activity */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Activity</label>
        <Combobox
          name="activity_key"
          options={sortedRules.map((r) => ({
            value: r.activity_key,
            label: r.label ?? r.activity_key,
            description: `${r.points_per_unit} pts${r.unit_label ? `/${r.unit_label}` : ""} • +${r.teammate_bonus} bonus`,
          }))}
          value={activityKey}
          onChange={setActivityKey}
          placeholder="Search activities..."
          required
        />
        {rule && (
          <p className="text-xs text-muted-foreground">
            {rule.points_per_unit} pts{rule.unit_label ? `/${rule.unit_label}` : ''} • +{rule.teammate_bonus} bonus
          </p>
        )}
      </div>

      {/* Value */}
      {rule && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {rule.input_type === "boolean"
              ? "Completed?"
              : rule.unit_label
                ? `Amount (${rule.unit_label})`
                : "Details"}
          </label>

          {rule.input_type === "number" && (
            <input
              name="activity_value_number"
              type="number"
              min={rule.min_value ?? 0}
              step={rule.step_value ?? 1}
              placeholder={
                rule.unit_label
                  ? `Enter ${rule.unit_label}…`
                  : "Enter amount…"
              }
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              required
            />
          )}

          {rule.input_type === "text" && (
            <input
              name="activity_value_text"
              placeholder={
                rule.unit_label
                  ? `Enter ${rule.unit_label}…`
                  : "Enter details…"
              }
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              required
            />
          )}

          {rule.input_type === "boolean" && (
            <label className="flex items-center gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                name="activity_value_bool"
                className="h-4 w-4"
              />
              <div>
                <div className="text-sm font-medium">
                  {rule.label || "Completed"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Check if completed.
                </div>
              </div>
            </label>
          )}
        </div>
      )}

      {/* Proof Image */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Proof Photo (Optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full text-sm text-muted-foreground
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary/10 file:text-primary
            hover:file:bg-primary/20"
        />
        <p className="text-xs text-muted-foreground">
          {compressing ? "Compressing image..." : (proofImage ? `Ready: ${Math.round(proofImage.size / 1024)}KB` : "Upload a photo as proof.")}
        </p>
      </div>

      {/* Teammate */}
      <label className="flex items-center gap-3 rounded-xl border p-3">
        <input type="checkbox" name="did_with_teammate" className="h-4 w-4" />
        <div>
          <div className="text-sm font-medium">Did this with teammate</div>
          <div className="text-xs text-muted-foreground">
            Applies roommate/teammate multiplier automatically.
          </div>
        </div>
      </label>

      {/* Submit */}
      <SubmitButton
        className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={compressing}
      >
        {compressing ? "Processing Image..." : "Submit Activity"}
      </SubmitButton>
    </form>
  );
}
