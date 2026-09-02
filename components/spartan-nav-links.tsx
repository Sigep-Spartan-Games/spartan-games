"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, CirclePlus, UsersRound, UserRound } from "lucide-react";

const items = [
  { href: "/leaderboard", desktopLabel: "Leaderboard", mobileLabel: "Board", icon: Trophy },
  { href: "/submit", desktopLabel: "Submit", mobileLabel: "Submit", icon: CirclePlus },
  { href: "/teams", desktopLabel: "Teams", mobileLabel: "Teams", icon: UsersRound },
  { href: "/profile", desktopLabel: "Profile", mobileLabel: "Profile", icon: UserRound },
];

function NavLink({
  href,
  label,
  variant,
  icon: Icon,
}: {
  href: string;
  label: string;
  variant: "desktop" | "mobile";
  icon: typeof Trophy;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={
        variant === "desktop"
          ? "sg-nav-link inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold"
          : "sg-nav-link flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control px-1 text-[11px] font-semibold"
      }
    >
      <Icon aria-hidden="true" className={variant === "mobile" ? "h-5 w-5" : "h-4 w-4"} />
      <span>{label}</span>
    </Link>
  );
}

export function SpartanNavLinks({
  variant,
}: {
  admin: boolean;
  variant: "desktop" | "mobile";
}) {
  const visibleItems = variant === "desktop" ? items.slice(0, 3) : items;

  return (
    <>
      {visibleItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={variant === "desktop" ? item.desktopLabel : item.mobileLabel}
          variant={variant}
          icon={item.icon}
        />
      ))}
    </>
  );
}
