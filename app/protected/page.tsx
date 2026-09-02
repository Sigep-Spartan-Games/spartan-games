import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

export default function ProtectedPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Account" description="Your authenticated Spartan Games session." />
      <StatusBanner variant="info">
          This is a protected page that you can only see as an authenticated
          user
      </StatusBanner>
    </div>
  );
}
