"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, UsersRound } from "lucide-react";
import imageCompression from "browser-image-compression";
import { SubmitButton } from "@/components/submit-button";
import { Combobox } from "@/components/ui/combobox";
import { ActivityRule } from "@/lib/types";
import { TimeDurationInput } from "@/components/time-duration-input";
import {
  getActivityUnitLabel,
  isTimeActivityUnit,
} from "@/lib/activity-units";

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
  const sortedRules = useMemo(
    () =>
      [...activityRules].sort((a, b) =>
        (a.label || a.activity_key || "").toLowerCase().localeCompare(
          (b.label || b.activity_key || "").toLowerCase(),
        ),
      ),
    [activityRules],
  );
  const [activityKey, setActivityKey] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [timeValue, setTimeValue] = useState(0);

  useEffect(() => {
    if (sortedRules.length > 0 && !activityKey) {
      setActivityKey(sortedRules[0].activity_key);
    }
  }, [sortedRules, activityKey]);

  const rule = useMemo(
    () => activityRules.find((item) => item.activity_key === activityKey),
    [activityRules, activityKey],
  );
  const unitLabel = getActivityUnitLabel(rule);
  const usesTimePicker =
    rule?.input_type === "number" && isTimeActivityUnit(unitLabel);

  useEffect(() => {
    setTimeValue(0);
  }, [activityKey]);
  const today = useMemo(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }, []);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
      setProofImage(compressedFile);
    } catch (error) {
      console.error("Image compression error:", error);
      setProofImage(file);
    } finally {
      setCompressing(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    if (proofImage) formData.set("proof_image", proofImage, proofImage.name);
    await action(formData);
  }

  if (activityRules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/25 p-8 text-center text-sm text-muted-foreground">
        No activities available to submit.
      </div>
    );
  }

  const fieldClass =
    "h-11 w-full rounded-control border border-input bg-card px-3 text-base shadow-sm shadow-foreground/[0.02] focus:outline-none focus:ring-2 focus:ring-ring/30 md:h-10 md:text-sm";

  return (
    <form action={handleSubmit} className="app-surface-elevated space-y-5 p-4 sm:p-6">
      <div className="border-b pb-4">
        <h2 className="app-section-heading">Activity details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fields and scoring are controlled by the selected activity.
        </p>
      </div>

      <div className="space-y-2">
        <label className="app-label">Team</label>
        <input type="hidden" name="team_id" value={teamId} />
        <input value={teamName} disabled className={`${fieldClass} bg-muted text-muted-foreground`} />
        <p className="app-helper">You can only submit for your own team.</p>
      </div>

      <div className="space-y-2">
        <label className="app-label">Date</label>
        <input
          name="activity_date"
          type="date"
          defaultValue={today}
          className={`${fieldClass} max-w-full appearance-none cursor-pointer`}
          required
          onClick={(event) => event.currentTarget.showPicker()}
        />
      </div>

      <div className="space-y-2">
        <label className="app-label">Activity</label>
        <Combobox
          name="activity_key"
          options={sortedRules.map((item) => ({
            value: item.activity_key,
            label: item.label ?? item.activity_key,
            description: `${item.points_per_unit} pts${getActivityUnitLabel(item) ? `/${getActivityUnitLabel(item)}` : ""} / x${item.teammate_bonus} bonus`,
          }))}
          value={activityKey}
          onChange={setActivityKey}
          placeholder="Search activities..."
          required
        />
        {rule ? (
          <div className="rounded-control border border-primary/10 bg-primary/[0.04] p-3">
            <p className="text-sm font-semibold text-primary">
              {rule.points_per_unit} pts{unitLabel ? `/${unitLabel}` : ""} / x{rule.teammate_bonus} teammate bonus
            </p>
            {rule.description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{rule.description}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {rule ? (
        <div className="space-y-2">
          <label className="app-label">
            {rule.input_type === "boolean"
              ? "Completed?"
              : usesTimePicker
                ? "Duration"
                : unitLabel
                  ? `Amount (${unitLabel})`
                : "Details"}
          </label>
          {usesTimePicker ? (
            <TimeDurationInput
              key={rule.activity_key}
              name="activity_value_number"
              unitLabel={unitLabel}
              onValueChange={setTimeValue}
            />
          ) : null}
          {rule.input_type === "number" && !usesTimePicker ? (
            <input
              name="activity_value_number"
              type="number"
              min={rule.min_value ?? 0}
              step={rule.step_value ?? "any"}
              placeholder={unitLabel ? `Enter ${unitLabel}...` : "Enter amount..."}
              className={fieldClass}
              required
            />
          ) : null}
          {rule.input_type === "text" ? (
            <input
              name="activity_value_text"
              placeholder={unitLabel ? `Enter ${unitLabel}...` : "Enter details..."}
              className={fieldClass}
              required
            />
          ) : null}
          {rule.input_type === "boolean" ? (
            <label className="flex min-h-14 items-center gap-3 rounded-control border bg-card p-3">
              <input type="checkbox" name="activity_value_bool" className="h-5 w-5 accent-primary" />
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">{rule.label || "Completed"}</div>
                <div className="text-xs text-muted-foreground">Check if completed.</div>
              </div>
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="app-label">Proof Photo (Optional)</label>
        <div className="rounded-control border border-dashed bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Camera aria-hidden="true" className="h-4 w-4 text-primary" />
            Add proof
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-2 w-full text-sm text-muted-foreground file:mr-3 file:min-h-10 file:rounded-control file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/15"
          />
        </div>
        <p className="app-helper" aria-live="polite">
          {compressing
            ? "Compressing image..."
            : proofImage
              ? `Ready: ${Math.round(proofImage.size / 1024)}KB`
              : "Upload a photo as proof."}
        </p>
      </div>

      <label className="flex min-h-14 items-center gap-3 rounded-control border bg-card p-3">
        <input type="checkbox" name="did_with_teammate" className="h-5 w-5 accent-primary" />
        <UsersRound aria-hidden="true" className="h-5 w-5 text-primary" />
        <div>
          <div className="text-sm font-semibold">Did this with teammate</div>
          <div className="text-xs text-muted-foreground">Applies teammate multiplier automatically.</div>
        </div>
      </label>

      <SubmitButton
        className="h-12 w-full rounded-control bg-competition text-sm font-semibold text-competition-foreground shadow-sm transition-[transform,background-color] hover:bg-competition/90 active:scale-[0.99] disabled:opacity-50 md:h-11"
        disabled={compressing || (usesTimePicker && timeValue <= 0)}
      >
        {compressing ? "Processing Image..." : "Submit Activity"}
      </SubmitButton>
    </form>
  );
}
