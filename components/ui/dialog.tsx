"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  close: () => void;
  titleId: string;
  descriptionId: string;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLElement>("[data-app-dialog]");
      const firstFocusable = dialog?.querySelector<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      firstFocusable?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>("[data-app-dialog]");
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <DialogContext.Provider
      value={{
        close: () => onOpenChange(false),
        titleId,
        descriptionId,
      }}
    >
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-5">
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 cursor-default bg-foreground/45 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
        />
        <div className="relative z-[101] w-full sm:max-w-lg">{children}</div>
      </div>
    </DialogContext.Provider>,
    document.body,
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export function DialogContent({ children, className, onClose }: DialogContentProps) {
  const context = React.useContext(DialogContext);
  const close = onClose ?? context?.close;

  return (
    <div
      data-app-dialog
      role="dialog"
      aria-modal="true"
      aria-labelledby={context?.titleId}
      aria-describedby={context?.descriptionId}
      className={cn(
        "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-lg border bg-card p-5 text-card-foreground shadow-2xl shadow-foreground/20 sm:max-h-[85dvh] sm:rounded-lg sm:p-6",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {close ? (
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      ) : null}
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return <div className={cn("mb-5 space-y-1.5 pr-10", className)}>{children}</div>;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  const context = React.useContext(DialogContext);
  return (
    <h2 id={context?.titleId} className={cn("text-xl font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  const context = React.useContext(DialogContext);
  return (
    <p
      id={context?.descriptionId}
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    >
      {children}
    </p>
  );
}
