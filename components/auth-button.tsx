import Link from "next/link";
import { Button } from "./ui/button";
import { getCachedUser } from "@/lib/cached-data";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const user = await getCachedUser();

  return user ? (
    <div className="flex items-center gap-2">
      {/* Desktop: show email */}
      <span className="hidden md:inline text-sm text-muted-foreground">
        Hey, {user.email}!
      </span>

      {/* Mobile: user icon */}
      <div className="md:hidden flex items-center justify-center h-10 w-10 rounded-full bg-primary/20 text-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <LogoutButton />
    </div>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4 mr-1"
          >
            <path
              fillRule="evenodd"
              d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
              clipRule="evenodd"
            />
          </svg>
          Sign in
        </Link>
      </Button>
    </div>
  );
}
