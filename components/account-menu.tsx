"use client";

import Link from "next/link";
import { Check, Laptop, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function AccountMenu({ email }: { email?: string | null }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open account menu">
          <UserRound aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block text-sm">Account</span>
          {email ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {mounted
          ? themes.map((item) => {
              const Icon = item.icon;
              const selected = theme === item.value;
              return (
                <DropdownMenuItem
                  key={item.value}
                  onSelect={() => setTheme(item.value)}
                >
                  <Icon aria-hidden="true" />
                  {item.label} theme
                  {selected ? <Check aria-hidden="true" className="ml-auto" /> : null}
                </DropdownMenuItem>
              );
            })
          : null}
        <DropdownMenuSeparator />
        <div className="p-1">
          <LogoutButton variant="menu" icon={<LogOut aria-hidden="true" />} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
