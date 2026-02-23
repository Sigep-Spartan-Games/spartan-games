"use client";

import { useFormStatus } from "react-dom";
import { resolveEditRequest } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-9 w-full rounded-md border border-destructive bg-transparent px-4 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {pending ? "Rejecting..." : "Reject"}
    </button>
  );
}

export function RejectRequestButton({
  requestId,
  teamId,
}: {
  requestId: string;
  teamId: string;
}) {
  return (
    <form action={resolveEditRequest} className="w-full">
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="status" value="rejected" />
      <input type="hidden" name="team" value={teamId} />
      <SubmitButton />
    </form>
  );
}
