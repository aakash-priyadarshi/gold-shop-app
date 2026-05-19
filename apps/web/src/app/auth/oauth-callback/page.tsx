"use client";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { useToast } from "@/hooks/use-toast";
import { getDashboardRoute, UserRole } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const REMEMBERED_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

function setAuthCookieOAuth(name: string, value: string, maxAge?: number) {
  if (typeof document === "undefined") return;
  const domain = window.location.hostname.endsWith("orivraa.com")
    ? "; domain=.orivraa.com"
    : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const expiry = maxAge ? `; max-age=${maxAge}` : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/${domain}; SameSite=Lax${secure}${expiry}`;
}

/** Stores tokens honouring the "Remember Me" checkbox the user set before
 *  the Google OAuth redirect. Falls back to remembered (persistent) when no
 *  preference is recorded (e.g. register flows that don't show the checkbox). */
function storeOAuthTokens(accessToken: string, refreshToken: string) {
  const raw = sessionStorage.getItem("orivraa_oauth_remember_me");
  const rememberMe = raw !== "0"; // default true when absent
  sessionStorage.removeItem("orivraa_oauth_remember_me");

  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem("orivraa_remember_me", "1");
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem("orivraa_remember_me");
  }

  const maxAge = rememberMe ? REMEMBERED_TOKEN_MAX_AGE : undefined;
  setAuthCookieOAuth(TOKEN_KEY, accessToken, maxAge);
  setAuthCookieOAuth(REFRESH_TOKEN_KEY, refreshToken, maxAge);
}

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

      const isMobileHost = window.location.hostname.startsWith("m.");
      const fromMobile = document.cookie
        .split(";")
        .some((cookie) => cookie.trim() === "orivraa_mobile=1");
      const mobileRedirect = searchParams.get("mobileRedirect") === "1";

      if (fromMobile && !isMobileHost) {
        const params = new URLSearchParams(searchParams.toString());
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        params.set("mobileRedirect", "1");
        document.cookie = `orivraa_mobile=; domain=.orivraa.com; path=/; SameSite=Lax${secure}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        window.location.href = `https://m.orivraa.com/auth/oauth-callback?${params.toString()}`;
        return;
      }

      // ── Desktop OAuth: send tokens back to Orivraa Desktop via localhost ──
      // desktop_port comes from: 1) URL param (passed through OAuth state), 2) sessionStorage, 3) localStorage
      const desktopPort =
        searchParams.get("desktop_port") ||
        sessionStorage.getItem("orivraa_desktop_port") ||
        localStorage.getItem("orivraa_desktop_port");
      if (desktopPort) {
        sessionStorage.removeItem("orivraa_desktop_port");
        localStorage.removeItem("orivraa_desktop_port");

        // Store tokens first so api.get("/auth/me") works
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

        let userJson: string | undefined;
        try {
          const response = await api.get("/auth/me");
          userJson = JSON.stringify(response.data);
        } catch (_) {
          // User profile fetch failed — still send tokens
        }

        // Try sending tokens to the desktop app with retries
        let desktopSendSuccess = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              // Wait before retry (500ms, 1000ms)
              await new Promise((r) => setTimeout(r, attempt * 500));
            }
            const resp = await fetch(
              `http://127.0.0.1:${desktopPort}/auth-callback`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  user_json: userJson || null,
                }),
              },
            );
            if (resp.ok) {
              desktopSendSuccess = true;
              break;
            }
          } catch (_) {
            console.warn(
              `[Desktop OAuth] Attempt ${attempt + 1} failed to reach desktop app`,
            );
          }
        }

        if (desktopSendSuccess) {
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
            try {
              window.close();
            } catch (_) {}
          }, 2000);
          return;
        } else {
          // Desktop app was unreachable — show helpful message and continue to web flow
          console.error(
            "Failed to send tokens to desktop app after 3 attempts",
          );
          toast({
            title: "Desktop app not detected",
            description:
              "Signed in on the web instead. Return to the desktop app and try again if needed.",
          });
          // Fall through to normal web flow below
        }
      }

      try {
        // Store tokens honouring the "Remember Me" preference saved before redirect
        storeOAuthTokens(accessToken, refreshToken);

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
        //
        // Mobile OAuth lands here twice: first on orivraa.com, then on
        // m.orivraa.com so tokens are stored in the mobile origin's localStorage.
        if (fromMobile || mobileRedirect) {
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `orivraa_mobile=; domain=.orivraa.com; path=/; SameSite=Lax${secure}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
        const shouldUseMobileRoute =
          (fromMobile || mobileRedirect || isMobileHost) &&
          user.role === "SHOPKEEPER";
        const dashboardRoute =
          shouldUseMobileRoute && !isMobileHost
            ? "https://m.orivraa.com/m/pos"
            : shouldUseMobileRoute
              ? "/m/pos"
            : getDashboardRoute(user.role as UserRole);
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
