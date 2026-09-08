"use client";
import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SupportAccessPanel } from "@/components/support-access/SupportAccessPanel";
export default function Page() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="mx-auto max-w-3xl p-4">
          <SupportAccessPanel />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
