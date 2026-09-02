"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl space-y-5 py-12">
      <StatusBanner variant="error" title="Something went wrong">
        This page could not be loaded. Your data has not been changed.
      </StatusBanner>
      <Button onClick={reset}>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
