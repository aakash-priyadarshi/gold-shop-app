"use client";

import { SellerAiIntegrationPanel } from "@/components/shop/SellerAiIntegrationPanel";
import { T } from "@/components/ui/T";

export default function SellerAiIntegrationPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          <T>Seller tools</T>
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          <T>AI integrations</T>
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          <T>
            Give an AI only the permissions you choose, keep the key private,
            and approve every supported write yourself.
          </T>
        </p>
      </div>
      <SellerAiIntegrationPanel />
    </div>
  );
}
