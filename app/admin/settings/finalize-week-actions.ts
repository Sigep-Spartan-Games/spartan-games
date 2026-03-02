// app/admin/settings/finalize-week-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

/**
 * Gets a date range identifier for the week containing the given date
 * Returns format like "Feb 3 - Feb 9, 2026" (Monday to Sunday)
 */
function getWeekIdentifier(date: Date): string {
  // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = date.getDay();

  // Calculate the Monday of the current week
  // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  // Calculate the Sunday (end of week)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Format the dates
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const startMonth = monthNames[monday.getMonth()];
  const startDay = monday.getDate();
  const endMonth = monthNames[sunday.getMonth()];
  const endDay = sunday.getDate();
  const year = sunday.getFullYear();

  // If same month, use "Feb 3 - 9, 2026" format
  // If different months, use "Feb 28 - Mar 5, 2026" format
  if (monday.getMonth() === sunday.getMonth()) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

/**
 * Gets the Monday date of the week as an ISO date string (YYYY-MM-DD)
 * Used for weeks_won entries (date[] column requires ISO date format)
 */
function getWeekMondayDate(date: Date): string {
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

/**
 * Records weekly history for all teams before resetting weekly points
 * This creates a permanent record of whether teams met their weekly goals
 */
export async function recordWeeklyHistory() {
  const { supabase } = await requireAdmin("/admin/settings");

  // Get current week identifier (date range format)
  const weekIdentifier = getWeekIdentifier(new Date());

  // Fetch all teams with their current stats
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, tier, weekly_points, weeks_won, streak_count");

  if (teamsError) {
    throw new Error(`Failed to fetch teams: ${teamsError.message}`);
  }

  // Fetch tier goals
  const { data: tierSettings } = await supabase
    .from("tier_settings")
    .select("tier, weekly_goal");

  const tierGoals: Record<string, number> = {};
  (tierSettings || []).forEach((ts) => {
    tierGoals[ts.tier] = ts.weekly_goal;
  });

  // Record history for each team
  const historyRecords = (teams || []).map((team) => {
    const weeklyGoal = team.tier ? (tierGoals[team.tier] ?? 100) : 100;
    const weeklyPoints = team.weekly_points ?? 0;
    const metGoal = weeklyPoints >= weeklyGoal;

    return {
      team_id: team.id,
      week_identifier: weekIdentifier,
      weekly_points: weeklyPoints,
      tier: team.tier,
      weekly_goal: weeklyGoal,
      met_goal: metGoal,
      weeks_won_count: team.weeks_won?.length ?? 0,
      streak_count: team.streak_count ?? 0,
    };
  });

  // Insert all history records (skip any that already exist for this week)
  if (historyRecords.length > 0) {
    const { error: insertError } = await supabase
      .from("weekly_history")
      .upsert(historyRecords, {
        onConflict: "team_id,week_identifier",
        ignoreDuplicates: true,
      });

    if (insertError) {
      throw new Error(
        `Failed to record weekly history: ${insertError.message}`,
      );
    }
  }

  return {
    success: true,
    weekIdentifier,
    teamsRecorded: historyRecords.length,
    teamsMetGoal: historyRecords.filter((r) => r.met_goal).length,
  };
}

/**
 * Finalizes the week by:
 * 1. Recording weekly history for all teams
 * 2. Finding the winner (highest weekly_points)
 * 3. Awarding the week to the winner
 * 4. Resetting weekly_points to 0 for all teams
 * 5. Moving weekly_points to total_points
 */
export async function finalizeWeekWithHistory() {
  const { supabase } = await requireAdmin("/admin/settings");

  try {
    // Step 1: Record weekly history
    const historyResult = await recordWeeklyHistory();

    // Get Monday date for weeks_won (date[] column requires ISO dates)
    const weekMondayDate = getWeekMondayDate(new Date());

    // Step 2: Find the winner(s) per tier
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, tier, weekly_points, total_points, weeks_won");

    if (!teams || teams.length === 0) {
      redirect(
        "/admin/settings?ok=" +
          encodeURIComponent(
            `Weekly history recorded (${historyResult.teamsRecorded} teams). No teams to finalize.`,
          ),
      );
    }

    // Group teams by tier
    type TeamType = (typeof teams)[0];
    const teamsByTier = teams.reduce(
      (acc: Record<string, TeamType[]>, team: TeamType) => {
        const tier = team.tier || "uncategorized";
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(team);
        return acc;
      },
      {},
    );

    const winners: TeamType[] = [];

    // Find winners for each tier (highest weekly_points in each tier)
    for (const tier in teamsByTier) {
      const tierTeams = teamsByTier[tier];
      if (tierTeams.length === 0) continue;
      const maxPoints = Math.max(
        ...tierTeams.map((t: TeamType) => t.weekly_points ?? 0),
      );
      winners.push(
        ...tierTeams.filter(
          (t: TeamType) => (t.weekly_points ?? 0) === maxPoints,
        ),
      );
    }

    // Step 3 & 4: Update all teams (award week to winners, add to total, reset weekly)
    for (const team of teams) {
      const isWinner = winners.some((w) => w.id === team.id);
      const newWeeksWon = isWinner
        ? [...(team.weeks_won || []), weekMondayDate]
        : team.weeks_won;

      const newTotalPoints =
        (team.total_points ?? 0) + (team.weekly_points ?? 0);

      await supabase
        .from("teams")
        .update({
          weeks_won: newWeeksWon,
          total_points: newTotalPoints,
          weekly_points: 0, // Reset for new week
        })
        .eq("id", team.id);
    }

    const winnerNames = winners.map((w) => w.name).join(", ");
    const maxPoints = Math.max(...teams.map((t) => t.weekly_points ?? 0));
    redirect(
      "/admin/settings?ok=" +
        encodeURIComponent(
          `Week ${historyResult.weekIdentifier} finalized! Winner(s): ${winnerNames} with top score ${maxPoints}. ${historyResult.teamsMetGoal}/${historyResult.teamsRecorded} teams met their goals.`,
        ),
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent(`Failed to finalize week: ${errorMessage}`),
    );
  }
}
