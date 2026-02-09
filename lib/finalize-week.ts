// lib/finalize-week.ts
// Shared finalization logic that can be called from cron jobs without auth

import { createClient } from "@/lib/supabase/server";

/**
 * Gets the ISO week identifier for a given date
 */
function getWeekIdentifier(date: Date): string {
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
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
