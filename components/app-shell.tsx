"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppShell({
  desktopHeader,
  mobileHeader,
  mobileNavigation,
  children,
}: {
  desktopHeader: React.ReactNode;
  mobileHeader: React.ReactNode;
  mobileNavigation: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth/");
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      {desktopHeader}
      {mobileHeader}
      {mobileNavigation}
      <main
        className={cn(
          "mx-auto w-full px-4 pb-[calc(var(--app-nav-height)+max(2rem,env(safe-area-inset-bottom)))] pt-6 sm:px-6 md:pb-10 md:pt-8 lg:px-8",
          isAdminRoute ? "max-w-7xl" : "max-w-6xl",
        )}
      >
        {children}
      </main>
    </>
  );
}
