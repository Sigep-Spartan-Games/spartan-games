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
import { Button } from "@/components/ui/button";

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
          "flex items-center justify-center rounded-control text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          buttonSize === "icon" ? "h-11 w-11" : "h-11 px-3 text-xs border",
          className,
        )}
        title={buttonText}
        aria-label={buttonText}
      >
        {buttonSize === "icon" ? <Trash2 className="h-4 w-4" /> : buttonText}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
