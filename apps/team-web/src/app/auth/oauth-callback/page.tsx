"use client";

import { ALLOWED_ROLES } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || "http://localhost:3000";

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    if (error) {
      toast.error(decodeURIComponent(error));
      router.push("/login");
      return;
    }

    if (!accessToken || !refreshToken) {
      toast.error("Invalid OAuth response. Please try again.");
      router.push("/login");
      return;
    }

    // Decode JWT and check role
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      if (!ALLOWED_ROLES.includes(payload.role)) {
        toast.error(
          "Access denied. Only ADMIN, SUPPORT, and SALES roles can access the team portal.",
        );
        setTimeout(() => {
          window.location.href = MAIN_URL;
        }, 2000);
        return;
      }

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      router.push("/");
    } catch {
      toast.error("Failed to verify credentials.");
      router.push("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-gold-500 border-r-gold-300" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Completing sign in...
        </p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-gold-500 border-r-gold-300" />
          </div>
        </div>
      }
    >
      <OAuthCallbackHandler />
    </Suspense>
  );
}
