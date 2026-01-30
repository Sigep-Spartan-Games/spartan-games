"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ComponentPropsWithoutRef } from "react";

export function SubmitButton({
    children,
    className,
    ...props
}: ComponentPropsWithoutRef<typeof Button>) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className={cn(className)}
            {...props}
        >
            {pending ? "Submitting..." : children}
        </Button>
    );
}
