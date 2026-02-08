// app/admin/settings/finalize-week-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

/**
 * Records weekly history for all teams before resetting weekly points
 * This creates a permanent record of whether teams met their weekly goals
 */
export async function recordWeeklyHistory() {
    const { supabase } = await requireAdmin("/admin/settings");

    // Get current week identifier (ISO format: 2026-W06)
    const now = new Date();
    const year = now.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    const weekIdentifier = `${year}-W${String(weekNumber).padStart(2, '0')}`;

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

    // Insert all history records (skip any that already exist for this week)
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

        // Step 2: Find the winner(s)
        const { data: teams } = await supabase
            .from("teams")
            .select("id, name, weekly_points, total_points, weeks_won")
            .order("weekly_points", { ascending: false })
            .limit(10);

        if (!teams || teams.length === 0) {
            redirect("/admin/settings?ok=" + encodeURIComponent(
                `Weekly history recorded (${historyResult.teamsRecorded} teams). No teams to finalize.`
            ));
        }

        const maxPoints = teams[0].weekly_points ?? 0;
        const winners = teams.filter(t => (t.weekly_points ?? 0) === maxPoints);

        // Step 3 & 4: Update all teams (award week to winners, add to total, reset weekly)
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

        const winnerNames = winners.map(w => w.name).join(", ");
        redirect("/admin/settings?ok=" + encodeURIComponent(
            `Week ${historyResult.weekIdentifier} finalized! Winner(s): ${winnerNames} with ${maxPoints} points. ${historyResult.teamsMetGoal}/${historyResult.teamsRecorded} teams met their goals.`
        ));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        redirect("/admin/settings?error=" + encodeURIComponent(
            `Failed to finalize week: ${errorMessage}`
        ));
    }
}
