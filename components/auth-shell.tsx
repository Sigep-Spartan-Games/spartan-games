import Image from "next/image";

import SpartanIcon from "@/app/icon.png";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-competition to-achievement"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src={SpartanIcon}
            alt=""
            className="h-16 w-16 object-contain"
            priority
          />
          <p className="mt-3 font-serif text-2xl font-semibold tracking-tight">
            Spartan Games
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Compete together. Build consistency.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
