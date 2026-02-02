"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange(false)}
            />
            {/* Content */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                {children}
            </div>
        </div>
    );
}

interface DialogContentProps {
    children: React.ReactNode;
    className?: string;
    onClose?: () => void;
}

export function DialogContent({
    children,
    className,
    onClose,
}: DialogContentProps) {
    return (
        <div
            className={cn(
                "relative max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-amber-200/20 bg-[hsl(345,40%,7%)] p-6 shadow-xl",
                className
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-md p-1 text-amber-200/60 transition-colors hover:bg-amber-200/10 hover:text-amber-200"
                >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </button>
            )}
            {children}
        </div>
    );
}

interface DialogHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
    return (
        <div className={cn("mb-4 space-y-1.5", className)}>
            {children}
        </div>
    );
}

interface DialogTitleProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
    return (
        <h2 className={cn("text-xl font-semibold text-amber-100", className)}>
            {children}
        </h2>
    );
}

interface DialogDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            {children}
        </p>
    );
}
