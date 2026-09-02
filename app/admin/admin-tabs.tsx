// app/admin/admin-tabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, History, Settings, SlidersHorizontal, UsersRound } from "lucide-react";

const TABS = [
  { href: "/admin/scoring", label: "Activities", icon: SlidersHorizontal },
  { href: "/admin/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/admin/teams", label: "Teams", icon: UsersRound },
  { href: "/admin/history", label: "History", icon: History },
  { href: "/admin/announcements", label: "Notices", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="rounded-lg border bg-card p-1.5">
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active =
            pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-control px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
