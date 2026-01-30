import { getCachedUser, getCachedAdminProfile } from "@/lib/cached-data";
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

  const cls =
    variant === "desktop"
      ? "sg-nav-link rounded-md px-3 py-2"
      : "sg-nav-link flex items-center justify-center rounded-md px-2 py-2 text-xs";

  return (
    <Link href="/admin" className={cls}>
      Admin
    </Link>
  );
}
