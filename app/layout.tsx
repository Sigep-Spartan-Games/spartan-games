import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Cinzel } from "next/font/google";
import "./globals.css";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import AdminLink from "@/components/admin-link";
import { SpartanNavLinks } from "@/components/spartan-nav-links";
import Spartan from "@/app/assets/spartan.png";
// import AuthRefresh from "@/components/auth-refresh";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

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
  weight: ["400", "500", "600", "700"],
});

function DesktopNavSkeleton() {
  return (
    <div className="flex items-center gap-1 text-sm">
      <div className="h-9 w-64 rounded-md bg-muted/20" />
    </div>
  );
}

function MobileNavSkeleton() {
  return (
    <div className="flex w-full max-w-sm gap-1">
      <div className="h-12 w-full rounded-md bg-muted/20" />
    </div>
  );
}

function DesktopTopNav() {
  return (
    <header className="sg-nav border-b sticky top-0 z-50 hidden md:block">
      <div className="spartan-nav border-b border-amber-200/15">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          {/* Left: Logo + Auth */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-amber-100 drop-shadow-[0_1px_10px_rgba(255,200,80,0.18)]"
            >
              <Image
                src={Spartan}
                alt="Spartan Games"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
              <span className={`whitespace-nowrap text-lg tracking-wide ${cinzel.className}`}>Spartan Games</span>
            </Link>

            <div className="border-l border-amber-200/20 pl-4">
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>

          {/* Center: Nav Links (pushed to the right with flex-1) */}
          <div className="flex-1" />

          <Suspense fallback={<DesktopNavSkeleton />}>
            <nav className="flex items-center gap-1 text-sm">
              <SpartanNavLinks admin={false} variant="desktop" />
              <AdminLink variant="desktop" />
            </nav>
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="sg-nav border-t border-amber-200/15">
        <div className="mx-auto max-w-lg px-2 py-1.5">
          {/* Single row: nav buttons + auth */}
          <div className="flex items-center gap-1">
            <Suspense fallback={<MobileNavSkeleton />}>
              <div className="flex flex-1 gap-0.5">
                <SpartanNavLinks admin={false} variant="mobile" />
                <AdminLink variant="mobile" />
              </div>
            </Suspense>

            {/* Auth button inline */}
            <div className="shrink-0 border-l border-amber-200/15 pl-1.5">
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        {/* <AuthRefresh /> */}
        <div className="sg-bg" />
        <div className="sg-top-glow" />
        <div className="spartan-site-bg" />
        <div className="spartan-site-glow" />

        <DesktopTopNav />
        <MobileBottomNav />

        <main className="mx-auto w-full max-w-4xl px-4 pb-32 pt-5 md:pb-8 md:pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
