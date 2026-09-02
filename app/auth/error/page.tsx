import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBanner } from "@/components/ui/status-banner";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <StatusBanner variant="error">
      {params?.error ? `Code error: ${params.error}` : "An unspecified error occurred."}
    </StatusBanner>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthShell>
      <Card className="shadow-lg shadow-foreground/[0.04]">
        <CardHeader>
          <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
