"use client";

import { useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

  const handleReject = async () => {
    const formData = new FormData();
    formData.append("request_id", requestId);
    formData.append("status", "rejected");
    formData.append("team", teamId);

    startTransition(async () => {
      try {
        const result = await resolveEditRequest(formData);
        if (result?.success) {
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to reject request:", err);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleReject}
      disabled={isPending}
      className={`h-9 w-full rounded-md border border-destructive bg-transparent px-4 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPending ? "Rejecting..." : "Reject"}
    </button>
  );
}
