"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowRightLeft,
  Crown,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/ui/status-banner";

export type AdminAccessProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_admin: boolean;
  is_owner: boolean;
};

type AdminAccessAction = (formData: FormData) => Promise<void>;
type PendingAction = {
  kind: "add" | "remove" | "transfer";
  profile: AdminAccessProfile;
};

function getDisplayName(profile: AdminAccessProfile): string {
  const fullName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || profile.email || `User ${profile.id.slice(0, 8)}`;
}

function toOption(profile: AdminAccessProfile): ComboboxOption {
  const name = getDisplayName(profile);
  return {
    value: profile.id,
    label: name,
    description: profile.email && profile.email !== name ? profile.email : undefined,
  };
}

export default function AdminAccessSection({
  currentUserId,
  profiles,
  grantAction,
  revokeAction,
  transferAction,
}: {
  currentUserId: string;
  profiles: AdminAccessProfile[];
  grantAction: AdminAccessAction;
  revokeAction: AdminAccessAction;
  transferAction: AdminAccessAction;
}) {
  const [addUserId, setAddUserId] = useState("");
  const [transferUserId, setTransferUserId] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [transferConfirmation, setTransferConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentProfile = profiles.find((profile) => profile.id === currentUserId);
  const isOwner = currentProfile?.is_owner === true;
  const admins = profiles.filter((profile) => profile.is_admin);
  const nonAdmins = profiles.filter((profile) => !profile.is_admin);
  const addOptions = useMemo(() => nonAdmins.map(toOption), [nonAdmins]);
  const transferOptions = useMemo(
    () => profiles.filter((profile) => profile.id !== currentUserId).map(toOption),
    [currentUserId, profiles],
  );

  const selectedAddProfile = profiles.find((profile) => profile.id === addUserId);
  const selectedTransferProfile = profiles.find(
    (profile) => profile.id === transferUserId,
  );

  function openConfirmation(action: PendingAction) {
    setTransferConfirmation("");
    setPendingAction(action);
  }

  function closeConfirmation() {
    if (isPending) return;
    setPendingAction(null);
    setTransferConfirmation("");
  }

  function confirmAction() {
    if (!pendingAction) return;

    const formData = new FormData();
    formData.set("targetUserId", pendingAction.profile.id);
    if (pendingAction.kind === "transfer") {
      formData.set("confirmation", transferConfirmation);
    }

    const action =
      pendingAction.kind === "add"
        ? grantAction
        : pendingAction.kind === "remove"
          ? revokeAction
          : transferAction;

    startTransition(async () => {
      await action(formData);
    });
  }

  const targetName = pendingAction ? getDisplayName(pendingAction.profile) : "";
  const dialogTitle =
    pendingAction?.kind === "add"
      ? "Add administrator"
      : pendingAction?.kind === "remove"
        ? "Remove administrator"
        : "Transfer ownership";
  const dialogDescription =
    pendingAction?.kind === "add"
      ? `${targetName} will receive full operational administrator access.`
      : pendingAction?.kind === "remove"
        ? `${targetName} will immediately lose access to all administrator pages and actions.`
        : `${targetName} will become the application owner and control administrator access. You will remain an ordinary administrator.`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Current administrators</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The owner controls access. Administrators can continue managing games,
            scoring, teams, submissions, and settings.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          {admins.map((profile) => (
            <div
              key={profile.id}
              className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {profile.is_owner ? (
                  <Crown aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {getDisplayName(profile)}
                  </p>
                  <Badge variant={profile.is_owner ? "achievement" : "secondary"}>
                    {profile.is_owner ? "Owner" : "Admin"}
                  </Badge>
                  {profile.id === currentUserId ? (
                    <span className="text-xs text-muted-foreground">You</span>
                  ) : null}
                </div>
                {profile.email && profile.email !== getDisplayName(profile) ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                ) : null}
              </div>

              {isOwner && !profile.is_owner ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove administrator access from ${getDisplayName(profile)}`}
                  onClick={() =>
                    openConfirmation({ kind: "remove", profile })
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {!isOwner ? (
        <StatusBanner variant="info" title="Owner-managed access">
          Only the application owner can add or remove administrators and transfer
          ownership.
        </StatusBanner>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-muted/15 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
                  <UserPlus aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Add an administrator</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Promote an existing registered account. This does not change
                    application ownership.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Combobox
                  options={addOptions}
                  value={addUserId}
                  onChange={setAddUserId}
                  placeholder="Search registered users..."
                  emptyMessage="No eligible users found"
                  ariaLabel="Select a user to add as an administrator"
                />
                <Button
                  type="button"
                  className="w-full"
                  disabled={!selectedAddProfile}
                  onClick={() =>
                    selectedAddProfile &&
                    openConfirmation({ kind: "add", profile: selectedAddProfile })
                  }
                >
                  <UserPlus aria-hidden="true" />
                  Add administrator
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-destructive/25 bg-destructive/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-destructive/10 text-destructive">
                  <ArrowRightLeft aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-destructive">
                    Transfer ownership
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    The recipient will control administrator access. You will remain
                    an ordinary administrator.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Combobox
                  options={transferOptions}
                  value={transferUserId}
                  onChange={setTransferUserId}
                  placeholder="Search registered users..."
                  emptyMessage="No eligible users found"
                  ariaLabel="Select a user to receive ownership"
                />
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={!selectedTransferProfile}
                  onClick={() =>
                    selectedTransferProfile &&
                    openConfirmation({
                      kind: "transfer",
                      profile: selectedTransferProfile,
                    })
                  }
                >
                  <ArrowRightLeft aria-hidden="true" />
                  Transfer ownership
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && closeConfirmation()}
      >
        <DialogContent onClose={closeConfirmation}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {pendingAction?.kind === "transfer" ? (
            <label className="mb-5 block space-y-1.5">
              <span className="text-sm font-medium">
                Type <span className="font-mono">TRANSFER</span> to confirm
              </span>
              <Input
                value={transferConfirmation}
                onChange={(event) => setTransferConfirmation(event.target.value)}
                autoComplete="off"
                disabled={isPending}
              />
            </label>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeConfirmation}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={pendingAction?.kind === "add" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={
                isPending ||
                (pendingAction?.kind === "transfer" &&
                  transferConfirmation !== "TRANSFER")
              }
            >
              {isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" />
                  Processing...
                </>
              ) : pendingAction?.kind === "add" ? (
                "Add administrator"
              ) : pendingAction?.kind === "remove" ? (
                "Remove administrator"
              ) : (
                "Transfer ownership"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
