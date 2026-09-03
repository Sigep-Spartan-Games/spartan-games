"use client";

import { useId, useMemo, useState } from "react";

import {
  activityUnitsToDurationParts,
  durationPartsToActivityUnits,
  usesMinuteScoring,
} from "@/lib/activity-units";

type TimeDurationInputProps = {
  name?: string;
  unitLabel?: string | null;
  initialValue?: number | string | null;
  onValueChange?: (value: number) => void;
  maxHours?: number;
};

export function TimeDurationInput({
  name,
  unitLabel,
  initialValue,
  onValueChange,
  maxHours = 99,
}: TimeDurationInputProps) {
  const id = useId();
  const initial = useMemo(
    () => activityUnitsToDurationParts(initialValue, unitLabel),
    [initialValue, unitLabel],
  );
  const [hours, setHours] = useState(Math.min(initial.hours, maxHours));
  const [minutes, setMinutes] = useState(initial.minutes);
  const hourOptions = useMemo(
    () => Array.from({ length: maxHours + 1 }, (_, index) => index),
    [maxHours],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, index) => index),
    [],
  );
  const activityUnits = durationPartsToActivityUnits(hours, minutes, unitLabel);
  const totalMinutes = hours * 60 + minutes;
  const scoringUnit = usesMinuteScoring(unitLabel) ? "minutes" : "hours";

  function update(nextHours: number, nextMinutes: number) {
    onValueChange?.(
      durationPartsToActivityUnits(nextHours, nextMinutes, unitLabel),
    );
  }

  return (
    <fieldset className="space-y-3" aria-describedby={`${id}-duration-help`}>
      <legend className="sr-only">Duration</legend>
      {name ? <input type="hidden" name={name} value={activityUnits} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2">
          <span className="block text-sm font-medium">Hours</span>
          <select
            id={`${id}-hours`}
            value={hours}
            onChange={(event) => {
              const nextHours = Number(event.target.value);
              setHours(nextHours);
              update(nextHours, minutes);
            }}
            className="h-12 w-full touch-manipulation rounded-control border border-input bg-card px-3 text-base shadow-sm shadow-foreground/[0.02] focus:outline-none focus:ring-2 focus:ring-ring/30 md:h-10 md:text-sm"
          >
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium">Minutes</span>
          <select
            id={`${id}-minutes`}
            value={minutes}
            onChange={(event) => {
              const nextMinutes = Number(event.target.value);
              setMinutes(nextMinutes);
              update(hours, nextMinutes);
            }}
            className="h-12 w-full touch-manipulation rounded-control border border-input bg-card px-3 text-base shadow-sm shadow-foreground/[0.02] focus:outline-none focus:ring-2 focus:ring-ring/30 md:h-10 md:text-sm"
          >
            {minuteOptions.map((minute) => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p
        id={`${id}-duration-help`}
        className="text-xs leading-relaxed text-muted-foreground"
        aria-live="polite"
      >
        {totalMinutes > 0
          ? `${hours} hr ${minutes} min counts as ${activityUnits} ${scoringUnit} for scoring.`
          : "Choose at least 1 minute. On mobile, tap a field to use the native scroll picker."}
      </p>
    </fieldset>
  );
}
