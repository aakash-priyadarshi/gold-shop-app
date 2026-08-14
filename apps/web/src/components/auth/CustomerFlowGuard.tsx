"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface CustomerFlowGuardProps {
  children: React.ReactNode;
  /** Where to redirect when customer flow is off. Defaults to "/" */
  redirectTo?: string;
}

const SELLER_PREVIEW_ROLES = new Set(["SHOPKEEPER", "SALES", "ADMIN"]);

/**
 * Wraps customer-only pages (cart, shop browsing, checkout, customer dashboard,
 * etc). When the admin has disabled the customer flow, visitors are redirected
 * away — typically back to the seller-focused homepage.
 * Shopkeepers can still open /shop/:id as a listing preview from POS.
 */
export function CustomerFlowGuard({
  children,
  redirectTo = "/",
}: CustomerFlowGuardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { features, loading } = usePlatformFeatures();
  const sellerPreview = Boolean(user && SELLER_PREVIEW_ROLES.has(user.role));

  useEffect(() => {
    if (!loading && !features.customerFlowEnabled && !sellerPreview) {
      router.replace(redirectTo);
    }
  }, [loading, features.customerFlowEnabled, sellerPreview, redirectTo, router]);

  if (sellerPreview) {
    return <>{children}</>;
  }

  if (loading || !features.customerFlowEnabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
      </div>
    );
  }

  return <>{children}</>;
}
