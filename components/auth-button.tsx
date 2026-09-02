import Link from "next/link";
import { Button } from "./ui/button";
import { getCachedUser } from "@/lib/cached-data";
import { AccountMenu } from "./account-menu";
import { UserRound } from "lucide-react";

export async function AuthButton() {
  const user = await getCachedUser();

  return user ? (
    <AccountMenu email={user.email} />
  ) : (
    <div className="flex gap-2">
      {/* Desktop: full buttons */}
      <div className="hidden md:flex gap-2">
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant={"default"}>
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      </div>

      {/* Mobile: compact sign in button */}
      <Button asChild size="sm" variant={"default"} className="md:hidden">
        <Link href="/auth/login">
          <UserRound aria-hidden="true" className="h-4 w-4" />
          Sign in
        </Link>
      </Button>
    </div>
  );
}
