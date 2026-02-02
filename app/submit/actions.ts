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

  // ✅ Enforce date is in current week via JS (Monday-Monday)
  // We compute "local" current week based on server time to avoid reliance on DB RPC
  const today = new Date();
  const day = today.getDay(); // 0-6 Sun-Sat
  // Calculate days to subtract to get to last Monday.
  const deltaToMon = day === 0 ? 6 : day - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - deltaToMon);
  monday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const [y, m, d] = activityDate.split('-').map(Number);
  // create date at midnight local
  const subDate = new Date(y, m - 1, d);

  if (subDate < monday || subDate >= nextMonday) {
    redirect(
      "/submit?error=" +
      encodeURIComponent("Date is not in the current active week"),
    );
  }


  // Fetch scoring rules (admin-controlled). Default fallback if row missing.
  const { data: rules, error: rulesError } = await supabase
    .from("activity_rules")
    .select("points_per_unit, teammate_bonus, input_type, active")
    .eq("activity_key", activityKey)
    .single();

  if (rulesError || !rules) {
    redirect(`/submit?error=invalid_activity`);
  }

  if (!rules.active) {
    redirect(`/submit?error=activity_disabled`);
  }

  const pointsPerUnit = Number(rules.points_per_unit);
  const teammateBonus = Number(rules.teammate_bonus);

  // Determine units for scoring
  let units = 0;
  let hasNumber = false;
  let hasText = false;
  let hasBool = false;

  // Validate based on input_type
  if (rules.input_type === 'number') {
    const val = formData.get("activity_value_number");
    const n = Number(val);
    if (val === null || !Number.isFinite(n) || n < 0) { // strict non-negative check
      redirect("/submit?error=invalid_number");
    }
    units = n;
    hasNumber = true;
  } else if (rules.input_type === 'text') {
    const val = formData.get("activity_value_text");
    const s = String(val ?? "").trim();
    if (!s) {
      redirect("/submit?error=missing_text");
    }
    units = 1; // Flat points usually
    hasText = true;
  } else if (rules.input_type === 'boolean') {
    const val = formData.get("activity_value_bool");
    const checked = val === "on";
    if (!checked) {
      // If boolean is strictly "must do it", maybe 0 points? 
      // But usually submission implies "I did it".
      // If they unchecked it, maybe we shouldn't submit?
      // The form implies "Yes I hit my goal".
      // If unchecked, units = 0.
    }
    units = checked ? 1 : 0;
    hasBool = true;
  } else {
    // Fallback or legacy
    units = 1;
  }

  if (!Number.isFinite(units) || units <= 0) {
    redirect("/submit?error=invalid_units");
  }

  // Points
  let pointsAwarded = Math.floor(pointsPerUnit * units);
  if (didWithTeammate) pointsAwarded += teammateBonus;

  if (!Number.isFinite(pointsAwarded) || pointsAwarded <= 0) {
    redirect("/submit?error=points_zero");
  }

  const activityDisplay = (() => {
    if (hasNumber) return `${activityKey}:${units}`;
    if (hasText) return `${activityKey}:${String(formData.get("activity_value_text")).trim()}`;
    if (hasBool) return `${activityKey}:yes`;
    return activityKey;
  })();

  const basePoints = Math.max(1, Math.floor(pointsPerUnit * units));

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

    // New schema fields
    points_per_unit: pointsPerUnit,
    teammate_bonus: teammateBonus,
    activity_units: units,

    activity_value_number: hasNumber ? units : null,
    activity_value_text: hasText ? String(formData.get("activity_value_text")).trim() : null,
    activity_value_bool: hasBool ? true : null,
  });

  if (error) redirect(`/submit?error=${encodeURIComponent(error.message)}`);

  redirect("/leaderboard");
}
