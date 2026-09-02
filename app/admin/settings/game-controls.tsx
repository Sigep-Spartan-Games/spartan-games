"use client";

import { useRef, useState, useTransition } from "react";
import { Flag, Loader2, Mail, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isStarting = variant === "primary";
  const ActionIcon = isStarting ? Play : Flag;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-col rounded-lg border bg-muted/15 p-4"
    >
      {sendEmail ? <input type="hidden" name="sendEmail" value="on" /> : null}

      <div className="flex items-start gap-3">
        <div
          className={
            isStarting
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-competition/10 text-competition"
          }
        >
          <ActionIcon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isStarting
              ? "Close registration and open activity submissions."
              : "Close submissions and reopen team registration."}
          </p>
        </div>
      </div>

      <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-control border bg-card px-3 py-2">
        <Checkbox
          checked={sendEmail}
          onCheckedChange={(checked) => setSendEmail(checked === true)}
          aria-label={`Send an email when selecting ${label}`}
        />
        <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs leading-snug text-muted-foreground">
          Send notification email to all users
        </span>
      </label>

      <Button
        type="submit"
        variant={isStarting ? "default" : "competition"}
        disabled={isPending}
        className="mt-3 w-full"
      >
        {isPending ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ActionIcon aria-hidden="true" />
            {label}
          </>
        )}
      </Button>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isPending) setConfirmOpen(open);
        }}
      >
        <DialogContent onClose={() => !isPending && setConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirm {label.toLowerCase()}</DialogTitle>
            <DialogDescription>{confirmMessage}</DialogDescription>
          </DialogHeader>

          {sendEmail ? (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/[0.05] p-4">
              <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                A notification email will be sent to all registered users.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isStarting ? "default" : "competition"}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm ${label.toLowerCase()}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
    <section aria-labelledby="quick-actions-heading" className="space-y-3">
      <div>
        <h3 id="quick-actions-heading" className="text-sm font-semibold">
          Quick actions
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Start or end the competition, with an optional notification to all users.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
    </section>
  );
}
