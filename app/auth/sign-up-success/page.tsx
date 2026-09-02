import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBanner } from "@/components/ui/status-banner";

export default function Page() {
  return (
    <AuthShell>
      <Card className="shadow-lg shadow-foreground/[0.04]">
        <CardHeader>
          <CardTitle className="text-2xl">Thank you for signing up!</CardTitle>
          <CardDescription>Check your email to confirm</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <StatusBanner variant="success">
            You&apos;ve successfully signed up. Please check your email to confirm your account before signing in.
          </StatusBanner>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/login">Go to login</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
