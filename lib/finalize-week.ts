// lib/finalize-week.ts
// Shared finalization logic that can be called from cron jobs without auth

import { createAdminClient } from "@/lib/supabase/admin";

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
 * Records weekly history for all teams
 * Returns summary of what was recorded
 */
export async function recordWeeklyHistoryService() {
  const supabase = createAdminClient();

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

  // Insert all history records
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
 * Full weekly finalization:
 * 1. Record weekly history
 * 2. Find winner(s)
 * 3. Award week to winner(s)
 * 4. Add weekly points to total
 * 5. Reset weekly points
 */
export async function finalizeWeekService() {
  const supabase = createAdminClient();

  // Step 1: Record weekly history
  const historyResult = await recordWeeklyHistoryService();

  // Get Monday date for weeks_won (date[] column requires ISO dates, not readable strings)
  const weekMondayDate = getWeekMondayDate(new Date());

  // Step 2: Find the winner(s) per tier
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, tier, weekly_points, total_points, weeks_won");

  if (!teams || teams.length === 0) {
    return {
      success: true,
      message: `Weekly history recorded (${historyResult.teamsRecorded} teams). No teams to finalize.`,
      historyResult,
    };
  }

  // Define TeamType locally based on the expected query shape
  type TeamType = (typeof teams)[0];

  // Group teams by tier
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
  const tierMaxPoints: Record<string, number> = {};

  // Find winners for each tier
  for (const tier in teamsByTier) {
    const tierTeams = teamsByTier[tier];
    if (tierTeams.length === 0) continue;

    const maxPointsInTier = Math.max(
      ...tierTeams.map((t: TeamType) => t.weekly_points ?? 0),
    );
    tierMaxPoints[tier] = maxPointsInTier;
    winners.push(
      ...tierTeams.filter(
        (t: TeamType) => (t.weekly_points ?? 0) === maxPointsInTier,
      ),
    );
  }

  // Step 3 & 4 & 5: Update all teams
  for (const team of teams) {
    const isWinner = winners.some((w: TeamType) => w.id === team.id);
    const newWeeksWon = isWinner
      ? [...(team.weeks_won || []), weekMondayDate]
      : team.weeks_won;

    const newTotalPoints = (team.total_points ?? 0) + (team.weekly_points ?? 0);

    const { error: updateError } = await supabase
      .from("teams")
      .update({
        weeks_won: newWeeksWon,
        total_points: newTotalPoints,
        weekly_points: 0, // Reset for new week
      })
      .eq("id", team.id);

    if (updateError) {
      console.error(`[Cron] Failed to update team ${team.name}:`, updateError);
    }
  }

  // Reset the finalize_requested flag
  await supabase
    .from("game_settings")
    .update({
      finalize_requested: false,
      last_week_finalized: new Date().toISOString().split("T")[0],
    })
    .eq("id", true);

  const winnerNames = winners.map((w: TeamType) => w.name).join(", ");
  const pointsSummary = Object.entries(tierMaxPoints)
    .map(([t, p]) => `${t}: ${p}`)
    .join(", ");

  return {
    success: true,
    message: `Week ${historyResult.weekIdentifier} finalized! Winner(s): ${winnerNames}. Top scores by tier - ${pointsSummary}. ${historyResult.teamsMetGoal}/${historyResult.teamsRecorded} teams met their goals.`,
    historyResult,
    winners: winnerNames,
    tierMaxPoints,
  };
}
