"use client";

import { useTransition } from "react";
import { resolveEditRequest } from "./actions";

type RejectRequestButtonProps = {
  requestId: string;
  teamId: string;
};

export function RejectRequestButton({
  requestId,
  teamId,
}: RejectRequestButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleReject = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("request_id", requestId);
      formData.append("status", "rejected");
      formData.append("team", teamId);
      await resolveEditRequest(formData);
    });
  };

  return (
    <button
      onClick={handleReject}
      disabled={isPending}
      className={`h-9 w-full rounded-md border border-destructive bg-transparent px-4 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPending ? "Rejecting..." : "Reject"}
    </button>
  );
}
