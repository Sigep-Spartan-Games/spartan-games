"use client";

import { useRef, useState, useTransition } from "react";

interface GameControlButtonProps {
  action: (formData: FormData) => Promise<void>;
  label: string;
  confirmMessage: string;
  variant?: "primary" | "secondary";
}

function GameControlButton({
  action,
  label,
  confirmMessage,
  variant = "primary",
}: GameControlButtonProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [sendEmail, setSendEmail] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirm(confirmMessage)) return;

    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      action(formData);
    });
  };

  const buttonClass =
    variant === "primary"
      ? "h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
      : "h-10 rounded-md border px-4 text-sm font-medium disabled:opacity-50";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
      {/* Hidden input for sendEmail when checkbox is checked */}
      {sendEmail && <input type="hidden" name="sendEmail" value="on" />}

      <button type="submit" disabled={isPending} className={buttonClass}>
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing…
          </span>
        ) : (
          label
        )}
      </button>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
          className="h-4 w-4 rounded border-primary accent-primary"
        />
        <span className="text-xs text-muted-foreground">
          Send notification email to all users
        </span>
      </label>
    </form>
  );
}

export default function GameControls({
  startGamesAction,
  endGamesAction,
}: {
  startGamesAction: (formData: FormData) => Promise<void>;
  endGamesAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Quick Actions</div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <GameControlButton
          action={startGamesAction}
          label="Start Games"
          confirmMessage="Are you sure you want to START the games? This will close registration and open submissions."
          variant="primary"
        />

        <GameControlButton
          action={endGamesAction}
          label="End Games"
          confirmMessage="Are you sure you want to END the games? This will close submissions and open registration."
          variant="secondary"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Start Games closes team registration and opens submissions. End Games
        does the opposite. Check the box to notify all users via email.
      </p>
    </div>
  );
}
