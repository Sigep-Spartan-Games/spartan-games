"use client";

import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBanner } from "@/components/ui/status-banner";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/auth/login/actions";

const initialState: LoginState = { ok: false, error: "" };

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-lg shadow-foreground/[0.04]">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email and password to access the competition.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction}>
            <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="ml-auto inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>

              {!state.ok && state.error ? (
                <StatusBanner variant="error">{state.error}</StatusBanner>
              ) : null}

              <SubmitButton className="w-full">Login</SubmitButton>
            </div>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/sign-up" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
