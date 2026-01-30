"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLink({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const isActive =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/admin?");

  const base =
    variant === "desktop"
      ? "sg-nav-link rounded-md px-3 py-2"
      : "sg-nav-link flex-1 min-w-0 flex items-center justify-center rounded-md px-2 py-2 text-xs";

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const supabase = createClient();

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        if (alive) setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (alive) setIsAdmin(Boolean(profile?.is_admin));
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (isAdmin !== true) return null;

  return (
    <Link
      href="/admin"
      aria-current={isActive ? "page" : undefined}
      className={base}
    >
      {variant === "mobile" ? "Admin" : "Admin"}
    </Link>
  );
}
