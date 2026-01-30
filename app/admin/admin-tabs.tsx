// app/admin/admin-tabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/scoring", label: "Points / Scoring" },
  { href: "/admin/submissions", label: "Past Submissions" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="rounded-2xl border p-2">
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => {
          const active =
            pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
