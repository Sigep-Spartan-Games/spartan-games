// app/admin/settings/tier-goals-section.tsx
import { getTierGoals, updateTierGoals } from "./tier-goals-actions";

export default async function TierGoalsSection() {
    const goals = await getTierGoals();

    return (
        <form action={updateTierGoals} className="space-y-4 max-w-md">
            {/* Gold Tier */}
            <div className="space-y-1.5">
                <label htmlFor="gold_goal" className="text-sm font-medium flex items-center gap-1.5">
                    <span>🥇</span>
                    <span>Gold Tier Weekly Goal</span>
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        id="gold_goal"
                        name="gold_goal"
                        defaultValue={goals.gold}
                        min="0"
                        step="1"
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        required
                    />
                    <span className="text-sm text-muted-foreground">points</span>
                </div>
            </div>

            {/* Purple Tier */}
            <div className="space-y-1.5">
                <label htmlFor="purple_goal" className="text-sm font-medium flex items-center gap-1.5">
                    <span>🟣</span>
                    <span>Purple Tier Weekly Goal</span>
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        id="purple_goal"
                        name="purple_goal"
                        defaultValue={goals.purple}
                        min="0"
                        step="1"
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        required
                    />
                    <span className="text-sm text-muted-foreground">points</span>
                </div>
            </div>

            {/* Red Tier */}
            <div className="space-y-1.5">
                <label htmlFor="red_goal" className="text-sm font-medium flex items-center gap-1.5">
                    <span>🔴</span>
                    <span>Red Tier Weekly Goal</span>
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        id="red_goal"
                        name="red_goal"
                        defaultValue={goals.red}
                        min="0"
                        step="1"
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        required
                    />
                    <span className="text-sm text-muted-foreground">points</span>
                </div>
            </div>

            <button
                type="submit"
                className="h-10 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium"
            >
                Save Tier Goals
            </button>
        </form>
    );
}
