import {
  getCachedUser,
  getCachedAdminProfile,
  getPendingEditRequestsCount,
} from "@/lib/cached-data";
import Link from "next/link";

export default async function AdminLink({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const user = await getCachedUser();

  if (!user) return null;

  // Check admin profile
  const profile = await getCachedAdminProfile(user.id);

  if (!profile?.is_admin) return null;

  const pendingCount = await getPendingEditRequestsCount();

  const cls =
    variant === "desktop"
      ? "sg-nav-link rounded-md px-3 py-2 flex items-center gap-2"
      : "sg-nav-link flex items-center justify-center rounded-md px-2 py-4 text-base font-medium relative";

  return (
    <Link href="/admin" className={cls}>
      <span>Admin</span>
      {pendingCount > 0 && (
        <span
          className={
            variant === "desktop"
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-pulse"
              : "absolute top-2 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-pulse"
          }
        >
          {pendingCount}
        </span>
      )}
    </Link>
  );
}
