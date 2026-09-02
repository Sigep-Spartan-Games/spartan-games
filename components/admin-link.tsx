import {
  getCachedUser,
  getCachedAdminProfile,
  getPendingEditRequestsCount,
} from "@/lib/cached-data";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default async function AdminLink({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile" | "compact";
}) {
  const user = await getCachedUser();

  if (!user) return null;

  // Check admin profile
  const profile = await getCachedAdminProfile(user.id);

  if (!profile?.is_admin) return null;

  const pendingCount = await getPendingEditRequestsCount();

  const cls =
    variant === "desktop"
      ? "sg-nav-link relative flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold"
      : variant === "compact"
        ? "sg-nav-link relative flex h-11 w-11 items-center justify-center rounded-control"
        : "sg-nav-link relative flex min-h-14 items-center justify-center rounded-control px-2 text-sm font-semibold";

  return (
    <Link href="/admin" className={cls}>
      <ShieldCheck aria-hidden="true" className="h-4 w-4" />
      {variant !== "compact" ? <span>Admin</span> : <span className="sr-only">Admin</span>}
      {pendingCount > 0 && (
        <span
          className={
            variant === "desktop"
              ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-competition px-1 text-[10px] font-bold text-competition-foreground"
              : "absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-competition px-1 text-[10px] font-bold text-competition-foreground"
          }
        >
          {pendingCount}
        </span>
      )}
    </Link>
  );
}
