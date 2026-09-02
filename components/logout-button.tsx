"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LogoutButton({
  variant = "default",
  icon,
}: {
  variant?: "default" | "menu";
  icon?: React.ReactNode;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
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
    </>
  );
}
