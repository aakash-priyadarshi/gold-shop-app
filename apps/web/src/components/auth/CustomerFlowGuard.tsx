"use client";

import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface CustomerFlowGuardProps {
  children: React.ReactNode;
  /** Where to redirect when customer flow is off. Defaults to "/" */
  redirectTo?: string;
}

/**
 * Wraps customer-only pages (cart, shop browsing, checkout, customer dashboard,
 * etc). When the admin has disabled the customer flow, visitors are redirected
 * away — typically back to the seller-focused homepage.
 */
export function CustomerFlowGuard({
  children,
  redirectTo = "/",
}: CustomerFlowGuardProps) {
  const router = useRouter();
  const { features, loading } = usePlatformFeatures();

  useEffect(() => {
    if (!loading && !features.customerFlowEnabled) {
      router.replace(redirectTo);
    }
  }, [loading, features.customerFlowEnabled, redirectTo, router]);

  if (loading || !features.customerFlowEnabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
      </div>
    );
  }

  return <>{children}</>;
}
