"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ConfirmDeleteButtonProps {
  action: (formData: FormData) => Promise<void>;
  payload: Record<string, string>;
  title?: string;
  description?: string;
  className?: string;
  buttonSize?: "sm" | "icon" | "default";
  buttonText?: string;
}

export function ConfirmDeleteButton({
  action,
  payload,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  className,
  buttonSize = "icon",
  buttonText = "Delete",
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });
      await action(formData);
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors",
          buttonSize === "icon" ? "h-8 w-8" : "h-8 px-3 text-xs border",
          className,
        )}
        title={buttonText}
      >
        {buttonSize === "icon" ? <Trash2 className="h-4 w-4" /> : buttonText}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
