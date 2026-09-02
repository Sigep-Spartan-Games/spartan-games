// app/admin/settings/collapsible-section.tsx
"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    variant?: "default" | "danger";
}

export default function CollapsibleSection({
    title,
    description,
    children,
    defaultOpen = false,
    variant = "default",
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const contentId = useId();

    const titleClass = variant === "danger"
        ? "text-lg font-semibold text-destructive"
        : "text-lg font-semibold";

    return (
        <section className="overflow-hidden rounded-lg border bg-card">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls={contentId}
                className="flex min-h-14 w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6"
            >
                <div>
                    <h2 className={titleClass}>{title}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
                <ChevronDown
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div id={contentId} className="border-t px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                    <div className="pt-4">
                        {children}
                    </div>
                </div>
            )}
        </section>
    );
}
