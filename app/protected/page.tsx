import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";

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
