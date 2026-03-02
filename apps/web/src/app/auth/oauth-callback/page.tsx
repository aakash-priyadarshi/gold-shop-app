"use client";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { useToast } from "@/hooks/use-toast";
import { getDashboardRoute, UserRole } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const error = searchParams.get("error");
      const setupRequired = searchParams.get("setupRequired");

      if (error) {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: decodeURIComponent(error),
        });
        router.push("/auth/login");
        return;
      }

      if (!accessToken || !refreshToken) {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Invalid OAuth response. Please try again.",
        });
        router.push("/auth/login");
        return;
      }

      // ── Desktop OAuth: send tokens back to Orivraa Desktop via localhost ──
      const desktopPort = sessionStorage.getItem("orivraa_desktop_port");
      if (desktopPort) {
        sessionStorage.removeItem("orivraa_desktop_port");
        try {
          // Fetch user profile to include with token payload
          localStorage.setItem(TOKEN_KEY, accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          let userJson: string | undefined;
          try {
            const response = await api.get("/auth/me");
            userJson = JSON.stringify(response.data);
          } catch (_) {
            // User profile fetch failed — still send tokens
          }

          await fetch(`http://127.0.0.1:${desktopPort}/auth-callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              user_json: userJson || null,
            }),
          });

          // Show desktop-specific success message (the browser tab can be closed)
          const overlay = document.createElement("div");
          overlay.style.cssText =
            "position:fixed;inset:0;background:#0f172a;color:#f3dd99;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;font-family:sans-serif;z-index:99999";
          overlay.innerHTML = `
            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#e5a31e,#f3dd99);display:flex;align-items:center;justify-content:center;font-size:28px">✓</div>
            <h2 style="margin:0;font-size:20px">Signed in successfully!</h2>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0">You can close this tab and return to <strong>Orivraa Desktop</strong>.</p>
          `;
          document.body.appendChild(overlay);

          // Try to auto-close the tab
          setTimeout(() => {
            try { window.close(); } catch (_) {}
          }, 2000);
          return;
        } catch (err) {
          console.error("Failed to send tokens to desktop app:", err);
          // Fall through to normal web flow
        }
      }

      try {
        // Store tokens
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

        // Fetch user profile
        const response = await api.get("/auth/me");
        const user = response.data;

        // Check if shop setup is required (SHOPKEEPER via Google OAuth)
        // Check both shopId (flat) and shop.id (nested) for compatibility
        const hasShop = user.shopId || user.shop?.id;
        if (
          setupRequired === "shop" ||
          (user.role === "SHOPKEEPER" && !hasShop)
        ) {
          toast({
            title: "Almost there!",
            description:
              "Please complete your shop details to finish registration.",
          });
          window.location.href = "/auth/complete-shop-setup";
          return;
        }

        toast({
          title: "Welcome!",
          description: `Signed in as ${user.firstName} ${user.lastName}`,
        });

        // Redirect to appropriate dashboard
        // Use window.location.href instead of router.push to force full page reload
        // This ensures NextAuth session and all auth state is properly refreshed
        const dashboardRoute = getDashboardRoute(user.role as UserRole);
        window.location.href = dashboardRoute;
      } catch (error: any) {
        console.error("OAuth callback error:", error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);

        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Failed to complete sign in. Please try again.",
        });
        router.push("/auth/login");
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <AuthBackground />
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gold-500 border-r-gold-300 animate-spin"></div>
        </div>
        <p className="text-sm text-gray-600 font-medium">
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
        <div className="min-h-screen flex items-center justify-center">
          <AuthBackground />
          <div className="flex flex-col items-center gap-4 z-10">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gold-500 border-r-gold-300 animate-spin"></div>
            </div>
          </div>
        </div>
      }
    >
      <OAuthCallbackHandler />
    </Suspense>
  );
}
