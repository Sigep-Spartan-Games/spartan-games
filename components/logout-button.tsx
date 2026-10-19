"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LogoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error("Could not sign out. Please try again.");
        setLoading(false);
        return;
      }

      onOpenChange(false);
      router.replace("/auth/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign Out</DialogTitle>
          <DialogDescription>
            Are you sure you want to sign out?
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LogoutButton({
  variant = "default",
  icon,
}: {
  variant?: "default" | "menu";
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={variant === "menu" ? "sm" : "sm"}
        variant={variant === "menu" ? "ghost" : "outline"}
        className={variant === "menu" ? "w-full justify-start" : undefined}
      >
        {icon}
        <span>Sign out</span>
      </Button>

      <LogoutDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
