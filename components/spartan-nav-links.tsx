"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  const base =
    variant === "desktop"
      ? "sg-nav-link rounded-md px-3 py-2"
      : "sg-nav-link flex-1 min-w-0 flex items-center justify-center rounded-md px-2 py-3 text-sm font-medium";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={base}
    >
      {label}
    </Link>
  );
}

export function SpartanNavLinks({
  admin,
  variant,
}: {
  admin: boolean;
  variant: "desktop" | "mobile";
}) {
  if (variant === "desktop") {
    const desktopItems = [
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/submit", label: "Submit" },
      { href: "/teams", label: "Teams" },
    ];

    return (
      <>
        {desktopItems.map((it) => (
          <NavLink
            key={it.href}
            href={it.href}
            label={it.label}
            variant="desktop"
          />
        ))}
        {admin && <NavLink href="/admin" label="Admin" variant="desktop" />}
      </>
    );
  }

  // MOBILE: only these three (centered row)
  const mobileItems = [
    { href: "/leaderboard", label: "Board" },
    { href: "/submit", label: "Submit" },
    { href: "/teams", label: "Teams" },
  ];

  return (
    <>
      {mobileItems.map((it) => (
        <NavLink
          key={it.href}
          href={it.href}
          label={it.label}
          variant="mobile"
        />
      ))}
    </>
  );
}
