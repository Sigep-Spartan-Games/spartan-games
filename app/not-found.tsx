import Link from "next/link";
import { MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MapPinOff aria-hidden="true" className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The page you requested does not exist or is no longer available.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/leaderboard">Return to leaderboard</Link>
      </Button>
    </div>
  );
}
