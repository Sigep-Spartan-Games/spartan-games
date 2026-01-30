import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist } from "next/font/google";
import "./globals.css";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { isAdmin } from "@/lib/is-admin";
import { SpartanNavLinks } from "@/components/spartan-nav-links";
import SigepEmblem from "@/app/assets/SigepEmblem.png";
import BalancedMan from "@/app/assets/Balanced-Man-Logo-ALT.pdf-2-863x667.png";
import Spartan from "@/app/assets/spartan.png";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Spartan Games",
  description: "SigEp Spartan Games tracker",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

function DesktopTopNav({ admin }: { admin: boolean }) {
  return (
    <header className="sg-nav border-b sticky top-0 z-50 hidden md:block">
      {/* keep original height/layout; only style */}
      <div className="spartan-nav border-b border-amber-200/15">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight text-amber-100 drop-shadow-[0_1px_10px_rgba(255,200,80,0.18)]"
          >
            <Image
              src={Spartan}
              alt="SigEp Logo"
              width={70}
              height={70}
              className="h-100 w-100 object-contain"
              priority
            />
            <span className="whitespace-nowrap">Spartan Games</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {/* <Link
              href="/leaderboard"
              className="spartan-link rounded-md px-3 py-2"
            >
              Leaderboard
            </Link>
            <Link href="/teams" className="spartan-link rounded-md px-3 py-2">
              Teams
            </Link>
            <Link href="/submit" className="spartan-link rounded-md px-3 py-2">
              Submit
            </Link>

            {admin && (
              <Link
                href="/admin"
                className="spartan-link-strong rounded-md px-3 py-2"
              >
                Admin
              </Link>
            )} */}
            <SpartanNavLinks admin={admin} variant="desktop" />
          </nav>

          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav({ admin }: { admin: boolean }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* keep your original layout sizing; only style */}
      <div className="sg-nav border-t border-amber-200/15">
        <div className="mx-auto max-w-4xl px-2 py-2">
          {/* Top row: centered nav (3 items) */}
          <div className="flex items-center justify-center">
            <div className="grid w-full max-w-sm grid-cols-3 gap-1">
              <SpartanNavLinks admin={admin} variant="mobile" />
            </div>
          </div>

          {/* Bottom row: Admin (left if applicable) + Auth (right) */}
          <div className="mt-2 flex items-center justify-between">
            {admin ? (
              <Link
                href="/admin"
                className="sg-nav-link rounded-md px-3 py-2 text-xs"
              >
                Admin
              </Link>
            ) : (
              <span />
            )}

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
    </nav>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await isAdmin();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <div className="sg-bg" />
        <div className="sg-top-glow" />
        {/* Global background across the whole site */}
        <div className="spartan-site-bg" />
        <div className="spartan-site-glow" />

        <DesktopTopNav admin={admin} />
        <MobileBottomNav admin={admin} />

        {/* keep your original spacing EXACTLY */}
        <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-5 md:pb-8 md:pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
