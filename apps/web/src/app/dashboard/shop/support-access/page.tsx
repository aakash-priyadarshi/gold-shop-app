"use client";
import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SupportAccessPanel } from "@/components/support-access/SupportAccessPanel";
export default function Page() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="mx-auto max-w-3xl p-4">
          <SupportAccessPanel />
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
