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

const TIER_LABELS: Record<string, string> = {
  gold: "Gold",
  purple: "Purple",
  red: "Red",
};

const TIER_COLORS: Record<string, string> = {
  gold: "border-achievement/30 bg-achievement/10 text-achievement",
  purple: "border-primary/30 bg-primary/10 text-primary",
  red: "border-competition/30 bg-competition/10 text-competition",
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
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending}
        aria-label={`Tier for ${team.name}`}
        className={`h-11 w-full min-w-24 cursor-pointer rounded-control border bg-background px-2 text-xs text-foreground ${team.tier ? TIER_COLORS[team.tier] : ""}`}
      >
        <option value="" disabled>Select...</option>
        <option value="gold">Gold</option>
        <option value="purple">Purple</option>
        <option value="red">Red</option>
      </select>

      <Dialog open={showConfirm} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent onClose={handleCancel}>
          <DialogHeader>
            <DialogTitle>Confirm tier change</DialogTitle>
            <DialogDescription>
              Change {team.name} from {team.tier ? TIER_LABELS[team.tier] : "No Tier"} to {TIER_LABELS[selectedTier]}?
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
