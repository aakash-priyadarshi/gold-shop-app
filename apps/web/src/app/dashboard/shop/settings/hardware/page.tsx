"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import HardwareSettingsPanel from "@/components/shop/HardwareSettingsPanel";
import { T } from "@/components/ui/T";

export default function DesktopHardwareSettingsPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-950">
          <HardwareSettingsPanel
            backHref="/dashboard/shop/settings?tab=preferences"
            showMobileHelp={false}
          />
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-sm text-muted-foreground">
          <T>Invoice Print sends to a thermal receipt printer when one is paired or listed by the Orivraa Desktop app, otherwise the A4 / office print dialog. Use the chevron on Print to pick either type.</T>
        </p>
      </DashboardLayout>
    </ShopGuard>
  );
}
