import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Cinzel } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import AdminLink from "@/components/admin-link";
import { SpartanNavLinks } from "@/components/spartan-nav-links";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import Spartan from "@/app/assets/spartan.png";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f3" },
    { media: "(prefers-color-scheme: dark)", color: "#17121b" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Spartan Games",
  description: "SigEp Spartan Games tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spartan Games",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  display: "swap",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

function NavSkeleton({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={
        mobile
          ? "h-14 flex-1 animate-pulse rounded-control bg-muted"
          : "h-10 w-64 animate-pulse rounded-control bg-muted"
      }
    />
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-control border border-primary/15 bg-primary/10">
        <Image
          src={Spartan}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain dark:invert"
          priority
        />
      </span>
      <span
        className={`${cinzel.className} truncate text-base font-semibold tracking-[0.035em] text-foreground ${compact ? "max-w-[10rem]" : "text-lg"}`}
      >
        Spartan Games
      </span>
    </Link>
  );
}

function DesktopHeader() {
  return (
    <header className="sg-nav sticky top-0 z-40 hidden border-b md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-6 lg:px-8">
        <Brand />
        <div className="flex-1" />
        <Suspense fallback={<NavSkeleton />}>
          <nav aria-label="Primary navigation" className="flex items-center gap-1">
            <SpartanNavLinks admin={false} variant="desktop" />
            <AdminLink variant="desktop" />
          </nav>
        </Suspense>
        <div className="ml-2 border-l pl-3">
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense fallback={<div className="h-10 w-10 rounded-control bg-muted" />}>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileHeader() {
  return (
    <header className="sg-nav sticky top-0 z-40 border-b md:hidden">
      <div className="flex h-14 items-center gap-1 px-4">
        <div className="min-w-0 flex-1">
          <Brand compact />
        </div>
        <Suspense>
          <AdminLink variant="compact" />
        </Suspense>
        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <Suspense fallback={<div className="h-11 w-11 rounded-control bg-muted" />}>
            <AuthButton />
          </Suspense>
        )}
      </div>
    </header>
  );
}

function MobileNavigation() {
  return (
    <nav
      aria-label="Primary navigation"
      className="sg-nav safe-bottom fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-1.5 md:hidden"
    >
      <div className="mx-auto flex max-w-lg gap-1">
        <Suspense fallback={<NavSkeleton mobile />}>
          <SpartanNavLinks admin={false} variant="mobile" />
        </Suspense>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${geistSans.variable} ${cinzel.variable}`}>
        <ThemeProvider>
          <AppShell
            desktopHeader={<DesktopHeader />}
            mobileHeader={<MobileHeader />}
            mobileNavigation={<MobileNavigation />}
          >
            {children}
          </AppShell>
          <Toaster position="top-center" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
