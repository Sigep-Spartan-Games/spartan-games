// app/admin/settings/tier-goals-section.tsx
import { getTierGoals, updateTierGoals } from "./tier-goals-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function TierGoalsSection() {
    const goals = await getTierGoals();

    return (
        <form action={updateTierGoals} className="space-y-4 max-w-md">
            {/* Gold Tier */}
            <div className="space-y-1.5">
                <label htmlFor="gold_goal" className="text-sm font-medium text-achievement">Gold Tier Weekly Goal</label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        id="gold_goal"
                        name="gold_goal"
                        defaultValue={goals.gold}
                        min="0"
                        step="1"
                        required
                    />
                    <span className="text-sm text-muted-foreground">points</span>
                </div>
            </div>

            {/* Purple Tier */}
            <div className="space-y-1.5">
                <label htmlFor="purple_goal" className="text-sm font-medium text-primary">Purple Tier Weekly Goal</label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        id="purple_goal"
                        name="purple_goal"
                        defaultValue={goals.purple}
                        min="0"
                        step="1"
                        required
                    />
                    <span className="text-sm text-muted-foreground">points</span>
                </div>
            </div>

            {/* Red Tier */}
            <div className="space-y-1.5">
                <label htmlFor="red_goal" className="text-sm font-medium text-competition">Red Tier Weekly Goal</label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        id="red_goal"
                        name="red_goal"
                        defaultValue={goals.red}
                        min="0"
                        step="1"
                        required
                    />
                    <span className="text-sm text-muted-foreground">points</span>
                </div>
            </div>

            <Button type="submit">
                Save Tier Goals
            </Button>
        </form>
    );
}
