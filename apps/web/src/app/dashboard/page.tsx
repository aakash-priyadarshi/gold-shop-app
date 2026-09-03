"use client";

import { T } from "@/components/ui/T";
import { getDashboardRoute, useAuth } from "@/hooks/useAuth";
import { sanitizeRedirectUrl } from "@/lib/redirect-validation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardIndexPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(sanitizeRedirectUrl("/dashboard"))}`,
      );
      return;
    }
    router.replace(getDashboardRoute(user.role));
  }, [isAuthenticated, isLoading, router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-yellow-600 border-t-transparent" />
        <p className="text-gray-600">
          <T>Loading dashboard...</T>
        </p>
      </div>
    </div>
  );
}
