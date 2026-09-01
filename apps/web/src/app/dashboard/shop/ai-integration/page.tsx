"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SellerAiIntegrationPanel } from "@/components/shop/SellerAiIntegrationPanel";
import { T } from "@/components/ui/T";

export default function SellerAiIntegrationPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              <T>Seller tools</T>
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              <T>AI integrations</T>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              <T>
                Give an AI only the permissions you choose, keep the key
                private, and approve every supported write yourself.
              </T>
            </p>
          </div>
          <SellerAiIntegrationPanel />
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
