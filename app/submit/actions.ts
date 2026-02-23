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
    .select("id, streak_count, last_activity_date")
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
  // ✅ Enforce date is in current week via JS (Monday-Monday)
  // We compute "local" current week based on US/Eastern time to ensure consistency
  // regardless of where the server is hosted (e.g. UTC).
  const now = new Date();
  const timeZone = "America/New_York";
  const gameDateString = now.toLocaleString("en-US", { timeZone });
  const today = new Date(gameDateString); // "Floating" date matching NY time

  const day = today.getDay(); // 0-6 Sun-Sat
  // Calculate days to subtract to get to last Monday.
  const deltaToMon = day === 0 ? 6 : day - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - deltaToMon);
  monday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const [y, m, d] = activityDate.split("-").map(Number);
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
    .select("points_per_unit, teammate_bonus, input_type, active, weekly_cap")
    .eq("activity_key", activityKey)
    .single();

  if (rulesError || !rules) {
    redirect(`/submit?error=invalid_activity`);
  }

  if (!rules.active) {
    redirect(`/submit?error=activity_disabled`);
  }

  // Check weekly cap for this activity
  if (rules.weekly_cap != null && rules.weekly_cap > 0) {
    // Get all submissions for this team, this activity, this week
    const { data: existingSubmissions } = await supabase
      .from("submissions")
      .select("points_awarded")
      .eq("team_id", team.id)
      .eq("activity_key", activityKey)
      .gte(
        "activity_date",
        `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`,
      )
      .lt(
        "activity_date",
        `${nextMonday.getFullYear()}-${String(nextMonday.getMonth() + 1).padStart(2, "0")}-${String(nextMonday.getDate()).padStart(2, "0")}`,
      );

    const currentWeeklyTotal = (existingSubmissions ?? []).reduce(
      (sum, s) => sum + (s.points_awarded || 0),
      0,
    );

    if (currentWeeklyTotal >= rules.weekly_cap) {
      redirect(
        `/submit?error=${encodeURIComponent(`Weekly cap reached for this activity (${rules.weekly_cap} points max)`)}`,
      );
    }
  }

  const pointsPerUnit = Number(rules.points_per_unit);
  const teammateBonus = Number(rules.teammate_bonus);

  // Determine units for scoring
  let units = 0;
  let hasNumber = false;
  let hasText = false;
  let hasBool = false;

  // Validate based on input_type
  if (rules.input_type === "number") {
    const val = formData.get("activity_value_number");
    const n = Number(val);
    if (val === null || !Number.isFinite(n) || n < 0) {
      // strict non-negative check
      redirect("/submit?error=invalid_number");
    }
    units = n;
    hasNumber = true;
  } else if (rules.input_type === "text") {
    const val = formData.get("activity_value_text");
    const s = String(val ?? "").trim();
    if (!s) {
      redirect("/submit?error=missing_text");
    }
    units = 1; // Flat points usually
    hasText = true;
  } else if (rules.input_type === "boolean") {
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
  if (didWithTeammate)
    pointsAwarded = Math.floor(pointsAwarded * teammateBonus);

  // Streak Logic
  const { data: streakSettings } = await supabase
    .from("streak_settings")
    .select("daily_bonus_increment, max_bonus")
    .eq("id", true)
    .single();

  const dailyBonusIncrement = streakSettings?.daily_bonus_increment ?? 1;
  const maxBonus = streakSettings?.max_bonus ?? 10;

  let streakBonus = 0;
  let newStreakCount = team.streak_count || 0;
  let newLastActivityDate = team.last_activity_date;

  // activityDate is YYYY-MM-DD
  // last_activity_date is YYYY-MM-DD from DB

  const currentActivityDateObj = new Date(activityDate + "T00:00:00");
  // Use a reliable diff method. Since inputs are YYYY-MM-DD strings, we can blindly compare.

  if (!team.last_activity_date) {
    // First activity ever
    newStreakCount = 1;
    streakBonus = dailyBonusIncrement;
    newLastActivityDate = activityDate;
  } else {
    // Calculate difference in days
    // We can assume inputs are valid dates.
    const lastDateObj = new Date(team.last_activity_date + "T00:00:00");

    // Reset hours to 0 just in case
    currentActivityDateObj.setHours(0, 0, 0, 0);
    lastDateObj.setHours(0, 0, 0, 0);

    const diffTime = currentActivityDateObj.getTime() - lastDateObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      newStreakCount++;
      // Limit streak bonus
      streakBonus = Math.min(newStreakCount * dailyBonusIncrement, maxBonus);
      newLastActivityDate = activityDate;
    } else if (diffDays > 1) {
      // Missed a day (or more) -> Reset
      newStreakCount = 1;
      streakBonus = dailyBonusIncrement;
      newLastActivityDate = activityDate;
    } else if (diffDays === 0) {
      // Same day -> No streak increase, no bonus (already awarded for today)
      streakBonus = 0;
      // streak count stays same
      // date stays same
    } else {
      // Negative diff -> Backdated.
      // Do not award streak bonus for backdated activities to prevent gaming.
      streakBonus = 0;
    }
  }

  // pointsAwarded += streakBonus; // (Streak is now separated)
  if (!Number.isFinite(pointsAwarded) || pointsAwarded <= 0) {
    redirect("/submit?error=points_zero");
  }

  const activityDisplay = (() => {
    if (hasNumber) return `${activityKey}:${units}`;
    if (hasText)
      return `${activityKey}:${String(formData.get("activity_value_text")).trim()}`;
    if (hasBool) return `${activityKey}:yes`;
    return activityKey;
  })();

  const basePoints = Math.max(1, Math.floor(pointsPerUnit * units));

  // Handle Proof Image Upload
  let proofImagePath: string | null = null;
  const proofImageFile = formData.get("proof_image");

  if (
    proofImageFile &&
    proofImageFile instanceof File &&
    proofImageFile.size > 0
  ) {
    // Basic validation
    if (!proofImageFile.type.startsWith("image/")) {
      redirect("/submit?error=invalid_file_type");
    }

    const fileExt = proofImageFile.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("submission-proofs")
      .upload(filePath, proofImageFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Optional: redirect with error or just log it and continue without image
      // redirect(`/submit?error=${encodeURIComponent("Image upload failed")}`);
    } else {
      proofImagePath = filePath;
    }
  }

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
    activity_value_text: hasText
      ? String(formData.get("activity_value_text")).trim()
      : null,
    activity_value_bool: hasBool ? true : null,

    streak_bonus: 0, // Ensure no streak is attached directly to the activity
    proof_image_path: proofImagePath,
  });

  if (error) redirect(`/submit?error=${encodeURIComponent(error.message)}`);

  // Insert Separate Streak Bonus Submission if applicable
  if (streakBonus > 0) {
    const { error: streakError } = await supabase.from("submissions").insert({
      team_id: team.id,
      submitted_by: user.id,
      activity: "daily_streak_bonus",

      base_points: streakBonus,
      did_with_teammate: false,
      multiplier: 1.0,
      points_awarded: streakBonus,

      activity_key: "daily_streak_bonus",
      activity_date: activityDate,

      points_per_unit: 1.0,
      teammate_bonus: 1.0,
      activity_units: streakBonus,

      activity_value_number: streakBonus,
      activity_value_text: null,
      activity_value_bool: null,

      streak_bonus: streakBonus, // This row itself represents the bonus
      proof_image_path: null,
    });

    if (streakError) {
      console.error("Streak bonus submission error:", streakError);
    }
  }

  // Update team streak info
  // Only update if changes occurred (i.e. not same day or backdated, unless it was first activity)
  if (
    newLastActivityDate !== team.last_activity_date ||
    newStreakCount !== team.streak_count
  ) {
    await supabase
      .from("teams")
      .update({
        streak_count: newStreakCount,
        last_activity_date: newLastActivityDate,
      })
      .eq("id", team.id);
  }

  redirect("/leaderboard");
}
