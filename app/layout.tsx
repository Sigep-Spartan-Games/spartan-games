import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";

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

function DesktopTopNav() {
  return (
    <header className="sticky top-0 z-50 hidden border-b bg-background/80 backdrop-blur md:block">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Spartan Games
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/leaderboard"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Leaderboard
          </Link>
          <Link
            href="/teams"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Teams
          </Link>
          <Link
            href="/submit"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Submit
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Admin
          </Link>
        </nav>
        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <Suspense>
            <AuthButton />
          </Suspense>
        )}
      </div>
    </header>
  );
}

function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/90 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-4xl grid-cols-4 px-2 py-2">
        <Link
          href="/"
          className="flex flex-col items-center justify-center rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Home
        </Link>
        <Link
          href="/leaderboard"
          className="flex flex-col items-center justify-center rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Board
        </Link>
        <Link
          href="/submit"
          className="flex flex-col items-center justify-center rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Submit
        </Link>
        <Link
          href="/teams"
          className="flex flex-col items-center justify-center rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Teams
        </Link>
        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <Suspense>
            <AuthButton />
          </Suspense>
        )}
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DesktopTopNav />
          <MobileBottomNav />

          {/* Mobile: leave space for bottom nav */}
          <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-5 md:pb-8 md:pt-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
