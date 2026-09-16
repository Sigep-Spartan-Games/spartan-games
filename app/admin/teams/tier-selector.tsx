"use client";

import { useState, useTransition } from "react";

import { updateTeamTier } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TierKey = "gold" | "purple" | "red";

const TIER_LABELS: Record<TierKey, string> = {
  gold: "Gold",
  purple: "Purple",
  red: "Red",
};

const TIER_COLORS: Record<TierKey, string> = {
  gold: "border-achievement/30 bg-achievement/10 text-foreground",
  purple: "border-primary/30 bg-primary/10 text-primary",
  red: "border-competition/30 bg-competition/10 text-competition",
};

const OPTION_CLASS = "bg-popover text-popover-foreground";

type Team = {
  id: string;
  name: string;
  tier: TierKey | null;
};

export default function TierSelector({
  team,
  locked = false,
}: {
  team: Team;
  locked?: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierKey | "">(
    team.tier ?? "",
  );
  const [isPending, startTransition] = useTransition();

  const handleChange = (newTier: string) => {
    if (newTier in TIER_LABELS && newTier !== team.tier) {
      const tier = newTier as TierKey;
      setSelectedTier(tier);
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
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending || locked}
        title={locked ? "Team tiers are locked once the games start." : undefined}
        aria-label={`Tier for ${team.name}`}
        className={cn(
          "h-11 w-full min-w-24 rounded-control border bg-background px-2 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark]",
          locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
          selectedTier ? TIER_COLORS[selectedTier] : undefined,
        )}
      >
        <option className={OPTION_CLASS} value="" disabled>
          Select...
        </option>
        <option className={OPTION_CLASS} value="gold">
          Gold
        </option>
        <option className={OPTION_CLASS} value="purple">
          Purple
        </option>
        <option className={OPTION_CLASS} value="red">
          Red
        </option>
      </select>

      <Dialog open={showConfirm} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent onClose={handleCancel}>
          <DialogHeader>
            <DialogTitle>Confirm tier change</DialogTitle>
            <DialogDescription>
              Change {team.name} from {team.tier ? TIER_LABELS[team.tier] : "No Tier"} to {selectedTier ? TIER_LABELS[selectedTier] : "No Tier"}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
