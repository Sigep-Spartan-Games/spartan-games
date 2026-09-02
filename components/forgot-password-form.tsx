"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-lg shadow-foreground/[0.04]">
        <CardHeader>
          <CardTitle className="text-2xl">
            {success ? "Check Your Email" : "Reset Your Password"}
          </CardTitle>
          <CardDescription>
            {success
              ? "Password reset instructions sent"
              : "Type in your email and we'll send you a link to reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-5">
              <StatusBanner variant="success">
                If you registered using your email and password, you will receive a password reset email.
              </StatusBanner>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send reset email"}
                </Button>
              </div>
              <div className="mt-5 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                  Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
