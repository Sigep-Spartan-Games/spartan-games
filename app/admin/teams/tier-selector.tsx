// app/admin/teams/tier-selector.tsx
"use client";

import { useState, useTransition } from "react";
import { updateTeamTier } from "./actions";

const TIER_LABELS: Record<string, string> = {
    gold: "🥇 Gold",
    purple: "🟣 Purple",
    red: "🔴 Red",
};

const TIER_COLORS: Record<string, string> = {
    gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
    purple: "bg-purple-500/20 text-purple-600 border-purple-500/30 dark:text-purple-300",
    red: "bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400",
};

type Team = {
    id: string;
    name: string;
    tier: "gold" | "purple" | "red" | null;
};

export default function TierSelector({ team }: { team: Team }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedTier, setSelectedTier] = useState(team.tier ?? "");
    const [isPending, startTransition] = useTransition();

    const handleChange = (newTier: string) => {
        if (newTier !== team.tier) {
            setSelectedTier(newTier);
            setShowConfirm(true);
        }
    };

    const handleConfirm = () => {
        startTransition(async () => {
            const formData = new FormData();
            formData.set("id", team.id);
            formData.set("tier", selectedTier);
            await updateTeamTier(formData);
            setShowConfirm(false);
        });
    };

    const handleCancel = () => {
        setSelectedTier(team.tier ?? "");
        setShowConfirm(false);
    };

    return (
        <div className="relative">
            <select
                value={selectedTier}
                onChange={(e) => handleChange(e.target.value)}
                disabled={isPending}
                className={`h-7 w-24 rounded border bg-background text-[11px] cursor-pointer text-foreground px-1 ${team.tier ? TIER_COLORS[team.tier] : ""}`}
            >
                <option value="" disabled>Select...</option>
                <option value="gold">🥇 Gold</option>
                <option value="purple">🟣 Purple</option>
                <option value="red">🔴 Red</option>
            </select>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="rounded-xl border bg-background p-6 shadow-lg max-w-sm mx-4">
                        <h3 className="text-lg font-semibold mb-2">Confirm Tier Change</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Change <strong>{team.name}</strong> from{" "}
                            <span className={`px-1 rounded ${team.tier ? TIER_COLORS[team.tier] : ""}`}>
                                {team.tier ? TIER_LABELS[team.tier] : "No Tier"}
                            </span>{" "}
                            to{" "}
                            <span className={`px-1 rounded ${TIER_COLORS[selectedTier]}`}>
                                {TIER_LABELS[selectedTier]}
                            </span>
                            ?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={handleCancel}
                                disabled={isPending}
                                className="h-9 rounded-md border px-4 text-sm hover:bg-muted/50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isPending}
                                className="h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium"
                            >
                                {isPending ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
