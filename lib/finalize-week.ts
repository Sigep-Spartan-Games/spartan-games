// lib/finalize-week.ts
// Shared finalization logic that can be called from cron jobs without auth

import { createClient } from "@/lib/supabase/server";

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
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
 * Records weekly history for all teams
 * Returns summary of what was recorded
 */
export async function recordWeeklyHistoryService() {
    const supabase = await createClient();

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
        const weeklyGoal = team.tier ? tierGoals[team.tier] ?? 100 : 100;
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
                ignoreDuplicates: true
            });

        if (insertError) {
            throw new Error(`Failed to record weekly history: ${insertError.message}`);
        }
    }

    return {
        success: true,
        weekIdentifier,
        teamsRecorded: historyRecords.length,
        teamsMetGoal: historyRecords.filter(r => r.met_goal).length,
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
    const supabase = await createClient();

    // Step 1: Record weekly history
    const historyResult = await recordWeeklyHistoryService();

    // Step 2: Find the winner(s)
    const { data: teams } = await supabase
        .from("teams")
        .select("id, name, weekly_points, total_points, weeks_won")
        .order("weekly_points", { ascending: false });

    if (!teams || teams.length === 0) {
        return {
            success: true,
            message: `Weekly history recorded (${historyResult.teamsRecorded} teams). No teams to finalize.`,
            historyResult,
        };
    }

    const maxPoints = teams[0].weekly_points ?? 0;
    const winners = teams.filter(t => (t.weekly_points ?? 0) === maxPoints);

    // Step 3 & 4 & 5: Update all teams
    for (const team of teams) {
        const isWinner = winners.some(w => w.id === team.id);
        const newWeeksWon = isWinner
            ? [...(team.weeks_won || []), historyResult.weekIdentifier]
            : team.weeks_won;

        const newTotalPoints = (team.total_points ?? 0) + (team.weekly_points ?? 0);

        await supabase
            .from("teams")
            .update({
                weeks_won: newWeeksWon,
                total_points: newTotalPoints,
                weekly_points: 0, // Reset for new week
            })
            .eq("id", team.id);
    }

    // Reset the finalize_requested flag
    await supabase
        .from("game_settings")
        .update({
            finalize_requested: false,
            last_week_finalized: new Date().toISOString().split('T')[0],
        })
        .eq("id", true);

    const winnerNames = winners.map(w => w.name).join(", ");

    return {
        success: true,
        message: `Week ${historyResult.weekIdentifier} finalized! Winner(s): ${winnerNames} with ${maxPoints} points. ${historyResult.teamsMetGoal}/${historyResult.teamsRecorded} teams met their goals.`,
        historyResult,
        winners: winnerNames,
        maxPoints,
    };
}
