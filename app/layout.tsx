import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist } from "next/font/google";
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
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
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
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight text-amber-100 drop-shadow-[0_1px_10px_rgba(255,200,80,0.18)]"
          >
            <Image
              src={Spartan}
              alt="Spartan Games"
              width={70}
              height={70}
              className="h-100 w-100 object-contain"
              priority
            />
            <span className="whitespace-nowrap text-xl">Spartan Games</span>
          </Link>

          <Suspense fallback={<DesktopNavSkeleton />}>
            <nav className="flex items-center gap-1 text-sm">
              <SpartanNavLinks admin={false} variant="desktop" />
              <AdminLink variant="desktop" />
            </nav>
          </Suspense>

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

function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="sg-nav border-t border-amber-200/15">
        <div className="mx-auto max-w-4xl px-2 py-4">
          {/* Top row: main nav buttons */}
          <div className="flex items-center justify-center">
            <Suspense fallback={<MobileNavSkeleton />}>
              <div className="flex w-full max-w-sm gap-1">
                <SpartanNavLinks admin={false} variant="mobile" />
                <AdminLink variant="mobile" />
              </div>
            </Suspense>
          </div>

          {/* Bottom row: Auth */}
          <div className="mt-2 flex items-center justify-center">
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
