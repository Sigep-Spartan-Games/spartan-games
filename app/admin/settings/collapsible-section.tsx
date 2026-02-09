// app/admin/settings/collapsible-section.tsx
"use client";

import { useState } from "react";

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

    const titleClass = variant === "danger"
        ? "text-lg font-semibold text-destructive"
        : "text-lg font-semibold";

    return (
        <div className="rounded-2xl border overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
            >
                <div>
                    <h2 className={titleClass}>{title}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
                <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="px-5 pb-5 pt-0 border-t">
                    <div className="pt-4">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}
