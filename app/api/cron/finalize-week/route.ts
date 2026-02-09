// app/api/cron/finalize-week/route.ts
import { NextResponse } from "next/server";
import { finalizeWeekService } from "@/lib/finalize-week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if no secret is configured (for testing) or if it matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        console.log("[Cron] Starting weekly finalization...");

        const result = await finalizeWeekService();

        console.log("[Cron] Weekly finalization completed:", result);

        return NextResponse.json({
            success: true,
            message: result.message,
            details: {
                weekIdentifier: result.historyResult?.weekIdentifier,
                teamsRecorded: result.historyResult?.teamsRecorded,
                teamsMetGoal: result.historyResult?.teamsMetGoal,
                winners: result.winners,
                maxPoints: result.maxPoints,
            },
        });
    } catch (error) {
        console.error("[Cron] Weekly finalization failed:", error);

        return NextResponse.json(
            {
                error: "Failed to finalize week",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
