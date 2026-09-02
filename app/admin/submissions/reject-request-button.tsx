"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveEditRequest } from "./actions";

export function RejectRequestButton({
  requestId,
  teamId,
}: {
  requestId: string;
  teamId: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleReject = async () => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("request_id", requestId);
    formData.append("status", "rejected");
    formData.append("team", teamId);

    try {
      const result = await resolveEditRequest(formData);
      if (result?.success) {
        // We trigger the refresh but don't await its completion to avoid
        // the button appearing hung if the page re-render is slow.
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to reject request:", err);
    } finally {
      // Small timeout to allow the refresh signal to start before resetting UI
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReject}
      disabled={isLoading}
      className={`h-11 w-full rounded-control border border-destructive bg-transparent px-4 text-sm font-medium text-destructive hover:bg-destructive/10 ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {isLoading ? "Rejecting..." : "Reject"}
    </button>
  );
}
