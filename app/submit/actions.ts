"use server";

import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";

function safeFloat(value: FormDataEntryValue | null, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function createSubmission(formData: FormData) {
  const supabase = await createClient();

  // Auth required
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/submit?error=not_authenticated");

  // ✅ Enforce submissions open (server-side)
  const { data: settings, error: settingsError } = await supabase
    .from("game_settings")
    .select("submissions_open")
    .eq("id", true)
    .single();

  if (settingsError)
    redirect(`/submit?error=${encodeURIComponent(settingsError.message)}`);

  if (!settings?.submissions_open) redirect("/submit?error=submissions_closed");

  // User's team from teams table
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
    .maybeSingle();

  if (teamError)
    redirect(`/submit?error=${encodeURIComponent(teamError.message)}`);
  if (!team) redirect("/submit?error=not_on_team");

  // Enforce team lock
  const postedTeamId = String(formData.get("team_id") ?? "");
  if (!postedTeamId || postedTeamId !== team.id)
    redirect("/submit?error=team_mismatch");

  // Core fields
  const activityKey = String(formData.get("activity_key") ?? "").trim();
  const activityDate = String(formData.get("activity_date") ?? "").trim(); // yyyy-mm-dd
  const didWithTeammate = formData.get("did_with_teammate") === "on";

  if (!activityKey || !activityDate) {
    redirect("/submit?error=missing_fields");
  }

  // dynamic values
  const numRaw = formData.get("activity_value_number");
  const textRaw = formData.get("activity_value_text");

  // boolean checkbox behavior
  const boolRaw = formData.get("activity_value_bool");
  const boolChecked = boolRaw === "on";

  const activityValueNumber = numRaw !== null ? safeFloat(numRaw) : null;
  const activityValueText = textRaw !== null ? String(textRaw).trim() : null;

  const hasNumber =
    typeof activityValueNumber === "number" &&
    Number.isFinite(activityValueNumber);
  const hasText = !!activityValueText;

  const isBoolActivity = activityKey === "calorie_goal";
  const hasBool = isBoolActivity ? boolChecked : false;

  if (!hasNumber && !hasText && !hasBool) {
    redirect("/submit?error=missing_activity_value");
  }

  // Fetch scoring rules (admin-controlled). Default fallback if row missing.
  const { data: rules, error: rulesError } = await supabase
    .from("activity_rules")
    .select("points_per_unit, teammate_bonus")
    .eq("activity_key", activityKey)
    .maybeSingle();

  if (rulesError) {
    redirect(`/submit?error=${encodeURIComponent(rulesError.message)}`);
  }

  const pointsPerUnit = Number(rules?.points_per_unit ?? 10);
  const teammateBonus = Number(rules?.teammate_bonus ?? 15);

  // Determine units for scoring
  let units = 0;
  if (hasNumber) units = Number(activityValueNumber);
  else if (hasText) units = 1;
  else if (hasBool) units = 1;

  if (!Number.isFinite(units) || units <= 0) {
    redirect("/submit?error=invalid_units");
  }

  // Points
  let pointsAwarded = Math.round(pointsPerUnit * units);
  if (didWithTeammate) pointsAwarded += teammateBonus;

  if (!Number.isFinite(pointsAwarded) || pointsAwarded <= 0) {
    redirect("/submit?error=points_zero");
  }

  const activityDisplay = (() => {
    if (hasNumber) return `${activityKey}:${activityValueNumber}`;
    if (hasText) return `${activityKey}:${activityValueText}`;
    if (hasBool) return `${activityKey}:yes`;
    return activityKey;
  })();

  const basePoints = Math.max(1, Math.round(pointsPerUnit * units));

  const { error } = await supabase.from("submissions").insert({
    team_id: team.id,
    submitted_by: user.id,
    activity: activityDisplay,

    base_points: basePoints,
    did_with_teammate: didWithTeammate,
    multiplier: 1.0,
    points_awarded: pointsAwarded,

    activity_key: activityKey,
    activity_date: activityDate,
    activity_value_number: hasNumber ? activityValueNumber : null,
    activity_value_text: hasText ? activityValueText : null,
    activity_value_bool: isBoolActivity ? boolChecked : null,
  });

  if (error) redirect(`/submit?error=${encodeURIComponent(error.message)}`);

  redirect("/leaderboard");
}
