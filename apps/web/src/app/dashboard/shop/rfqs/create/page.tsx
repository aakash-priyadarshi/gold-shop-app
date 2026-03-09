"use client";

import { T } from "@/components/ui/T";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect to the new Walk-in Quotes section
 * The walk-in RFQ feature has been moved to /dashboard/shop/quotes
 * for better separation between online RFQs and walk-in quotes
 */
export default function CreateWalkInRfqRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/shop/quotes/create");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">
        <T>Redirecting to Walk-in Quotes...</T>
      </p>
    </div>
  );
}
