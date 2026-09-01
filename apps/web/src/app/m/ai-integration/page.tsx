import { SellerAiIntegrationPanel } from "@/components/shop/SellerAiIntegrationPanel";
import { T } from "@/components/ui/T";

export default function MobileSellerAiIntegrationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-24">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
        <T>Seller tools</T>
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        <T>AI integrations</T>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <T>
          Create a scoped AI key, keep it private, and approve every supported
          write yourself.
        </T>
      </p>
      <div className="mt-5">
        <SellerAiIntegrationPanel />
      </div>
    </div>
  );
}
