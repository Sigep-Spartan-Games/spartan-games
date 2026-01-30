// app/admin/layout.tsx
import { Suspense } from "react";
import AdminTabs from "./admin-tabs";

function AdminTabsSkeleton() {
  return <div className="h-12 rounded-2xl border bg-muted/20" />;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage Spartan Games settings.
        </p>
      </div>

      <Suspense fallback={<AdminTabsSkeleton />}>
        <AdminTabs />
      </Suspense>

      {children}
    </div>
  );
}
