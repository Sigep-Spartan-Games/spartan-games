"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // critical: don't refresh on auth pages (it fights login redirects)
    if (pathname.startsWith("/auth")) return;

    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      router.refresh();
    });

    return () => sub.subscription.unsubscribe();
  }, [router, pathname]);

  return null;
}
