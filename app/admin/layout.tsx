// app/admin/layout.tsx
import AdminTabs from "./admin-tabs";

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

      <AdminTabs />

      {children}
    </div>
  );
}
