import type { ActivityRule } from "@/lib/types";

export type ActivityUnitValue =
  | "miles"
  | "games"
  | "laps"
  | "time"
  | "true/false";

export type ActivityUnitOption = {
  value: ActivityUnitValue;
  label: string;
};

export const ACTIVITY_UNIT_OPTIONS: ActivityUnitOption[] = [
  { value: "miles", label: "Miles" },
  { value: "games", label: "Games" },
  { value: "laps", label: "Laps" },
  { value: "time", label: "Time (hours and minutes)" },
  { value: "true/false", label: "True/False" },
];

export function getActivityUnitLabel(
  rule: Pick<ActivityRule, "unit" | "unit_label"> | null | undefined,
) {
  return rule?.unit_label?.trim() || rule?.unit?.trim() || null;
}

export function normalizeActivityUnit(
  unit: string | null | undefined,
  inputType?: ActivityRule["input_type"],
): ActivityUnitValue {
  if (inputType === "boolean") return "true/false";

  const normalized = unit?.trim().toLowerCase() ?? "";
  if (normalized === "mile" || normalized === "miles") return "miles";
  if (normalized === "game" || normalized === "games") return "games";
  if (normalized === "lap" || normalized === "laps") return "laps";
  if (isTimeActivityUnit(normalized)) return "time";
  if (normalized === "true/false" || normalized === "boolean") {
    return "true/false";
  }

  return "miles";
}

export function getInputTypeForActivityUnit(
  unit: string | null | undefined,
): NonNullable<ActivityRule["input_type"]> {
  return normalizeActivityUnit(unit) === "true/false" ? "boolean" : "number";
}

export function getStepValueForActivityUnit(
  unit: string | null | undefined,
) {
  const normalized = normalizeActivityUnit(unit);
  if (normalized === "true/false") return null;
  if (normalized === "games" || normalized === "laps") return 1;
  if (normalized === "time") return 1 / 60;
  return 0.01;
}

const HOUR_BASED_TIME_UNITS = new Set([
  "time",
  "duration",
  "hour",
  "hours",
  "hr",
  "hrs",
]);
const MINUTE_BASED_TIME_UNITS = new Set(["minute", "minutes", "min", "mins"]);

export function isTimeActivityUnit(unit: string | null | undefined) {
  const normalized = unit?.trim().toLowerCase() ?? "";
  return (
    HOUR_BASED_TIME_UNITS.has(normalized) ||
    MINUTE_BASED_TIME_UNITS.has(normalized)
  );
}

export function usesMinuteScoring(unit: string | null | undefined) {
  return MINUTE_BASED_TIME_UNITS.has(unit?.trim().toLowerCase() ?? "");
}

export function durationPartsToActivityUnits(
  hours: number,
  minutes: number,
  unit: string | null | undefined,
) {
  const totalMinutes = hours * 60 + minutes;
  if (usesMinuteScoring(unit)) return totalMinutes;
  return Number((totalMinutes / 60).toFixed(6));
}

export function activityUnitsToDurationParts(
  value: number | string | null | undefined,
  unit: string | null | undefined,
) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
  const totalMinutes = usesMinuteScoring(unit)
    ? Math.round(safeValue)
    : Math.round(safeValue * 60);

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}
