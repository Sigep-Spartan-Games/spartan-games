// app/admin/layout.tsx
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import AdminTabs from "./admin-tabs";

function AdminTabsSkeleton() {
  return <div className="h-24 animate-pulse rounded-lg border bg-muted/20 sm:h-14" />;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-competition/10 text-competition">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h1 className="app-page-heading">Admin workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the Spartan Games competition.
          </p>
        </div>
      </div>

      <Suspense fallback={<AdminTabsSkeleton />}>
        <AdminTabs />
      </Suspense>

      {children}
    </div>
  );
}
