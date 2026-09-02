"use client";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { useToast } from "@/hooks/use-toast";
import { getDashboardRoute, UserRole } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { sanitizeRedirectUrl } from "@/lib/redirect-validation";
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
      // desktop_exchange is the API-mediated fallback code (passed through OAuth state)
      const desktopExchange =
        searchParams.get("desktop_exchange") ||
        sessionStorage.getItem("orivraa_desktop_exchange") ||
        localStorage.getItem("orivraa_desktop_exchange");
      if (desktopPort || desktopExchange) {
        sessionStorage.removeItem("orivraa_desktop_port");
        localStorage.removeItem("orivraa_desktop_port");
        sessionStorage.removeItem("orivraa_desktop_exchange");
        localStorage.removeItem("orivraa_desktop_exchange");

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

        // ── Strategy 4: API-mediated exchange (ultimate fallback) ──
        // Store tokens on the API with a one-time code. The desktop app
        // polls the API to retrieve them. This works through any network
        // restriction (firewalls, PNA, etc.) since it's just a normal
        // HTTPS request to the API.
        if (desktopExchange) {
          try {
            const apiBaseUrl =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            const baseUrl = apiBaseUrl.endsWith("/api")
              ? apiBaseUrl
              : `${apiBaseUrl}/api`;
            await fetch(`${baseUrl}/auth/desktop-exchange/${desktopExchange}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                user_json: userJson || null,
              }),
            });
            console.log("[Desktop OAuth] API exchange: tokens stored for pickup");
          } catch (e) {
            console.warn("[Desktop OAuth] API exchange failed:", e);
          }
        }

        // Try sending tokens to the desktop app with retries.
        // We use multiple strategies because browsers may block cross-origin
        // requests from HTTPS pages to http://127.0.0.1 (Private Network Access).
        //
        // Strategy 1: fetch with mode:'no-cors' — sends the request without a
        //   CORS preflight. The response is opaque (status 0) but the server
        //   still receives the data. We send as text/plain (simple content type)
        //   so no preflight is triggered.
        // Strategy 2: Image beacon — a GET request via <img> that bypasses CORS
        //   entirely. Tokens are sent as query params (GET).
        // Strategy 3: fetch with CORS (legacy) — works in browsers that allow
        //   PNA with proper headers.
        const callbackUrl = `http://127.0.0.1:${desktopPort}/auth-callback`;
        const tokenBody = JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          user_json: userJson || null,
        });

        let desktopSendSuccess = false;

        // ── Strategy 1: no-cors fetch (most reliable) ──
        for (let attempt = 0; attempt < 3 && !desktopSendSuccess; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((r) => setTimeout(r, attempt * 500));
            }
            const resp = await fetch(callbackUrl, {
              method: "POST",
              mode: "no-cors",
              headers: { "Content-Type": "text/plain" },
              body: tokenBody,
            });
            // no-cors responses are opaque (status 0) — treat as sent
            if (resp.ok || resp.status === 0 || resp.type === "opaque") {
              desktopSendSuccess = true;
            }
          } catch (_) {
            console.warn(
              `[Desktop OAuth] no-cors attempt ${attempt + 1} failed`,
            );
          }
        }

        // ── Strategy 2: Image beacon fallback (GET with query params) ──
        if (!desktopSendSuccess && desktopPort) {
          try {
            const params = new URLSearchParams({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (userJson) params.set("user_json", userJson);
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = `${callbackUrl}?${params.toString()}`;
              // Give the beacon 2 seconds to fire
              setTimeout(resolve, 2000);
            });
            // The image beacon doesn't give us a status, but if it didn't
            // throw, assume it was sent. The desktop app's polling will
            // confirm receipt.
            desktopSendSuccess = true;
          } catch (_) {
            console.warn("[Desktop OAuth] Image beacon fallback failed");
          }
        }

        // ── Strategy 2.5: Form submission to hidden iframe ──
        // Form submissions bypass CORS entirely (they navigate the target
        // frame). The server receives the data as form-encoded POST.
        if (!desktopSendSuccess && desktopPort) {
          try {
            await new Promise<void>((resolve) => {
              const iframe = document.createElement("iframe");
              iframe.name = `orivraa-desktop-form-target-${Date.now()}`;
              iframe.style.display = "none";
              document.body.appendChild(iframe);

              const form = document.createElement("form");
              form.method = "POST";
              form.action = callbackUrl;
              form.target = iframe.name;
              form.enctype = "application/x-www-form-urlencoded";

              const input = document.createElement("input");
              input.type = "hidden";
              input.name = "token_data";
              input.value = tokenBody;
              form.appendChild(input);

              document.body.appendChild(form);
              form.submit();

              // Clean up after 2 seconds
              setTimeout(() => {
                form.remove();
                iframe.remove();
                resolve();
              }, 2000);
            });
            // Form submission doesn't give us a status, but the server
            // should have received the data
            desktopSendSuccess = true;
          } catch (_) {
            console.warn("[Desktop OAuth] Form submission fallback failed");
          }
        }

        // ── Strategy 3: CORS fetch (legacy, works in some browsers) ──
        if (!desktopSendSuccess) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              if (attempt > 0) {
                await new Promise((r) => setTimeout(r, attempt * 500));
              }
              const resp = await fetch(callbackUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: tokenBody,
              });
              if (resp.ok) {
                desktopSendSuccess = true;
                break;
              }
            } catch (_) {
              console.warn(
                `[Desktop OAuth] CORS attempt ${attempt + 1} failed`,
              );
            }
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

        // Set user role cookie for Edge Middleware routing
        const raw = sessionStorage.getItem("orivraa_oauth_remember_me");
        const rememberMe = raw !== "0"; // default true when absent
        const maxAge = rememberMe ? REMEMBERED_TOKEN_MAX_AGE : undefined;
        setAuthCookieOAuth("orivraa_user_role", user.role, maxAge);

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
        const storedReturnTo = sanitizeRedirectUrl(
          sessionStorage.getItem("orivraa_oauth_return_to"),
          "",
        );
        sessionStorage.removeItem("orivraa_oauth_return_to");
        const canReturnInternally =
          !shouldUseMobileRoute &&
          storedReturnTo.charAt(0) === "/" &&
          storedReturnTo.charAt(1) !== "/" &&
          !storedReturnTo.includes(":");
        window.location.assign(
          canReturnInternally ? storedReturnTo : dashboardRoute,
        );
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
