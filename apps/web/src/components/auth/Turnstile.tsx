"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  tabindex?: number;
  "response-field"?: boolean;
  "response-field-name"?: string;
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  className?: string;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function Turnstile({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isRenderedRef = useRef(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || isRenderedRef.current)
      return;
    if (!TURNSTILE_SITE_KEY) {
      console.warn("Turnstile site key not configured");
      return;
    }

    // Clear container
    containerRef.current.innerHTML = "";

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onVerify,
        "error-callback": onError,
        "expired-callback": onExpire,
        theme,
        size,
      });
      isRenderedRef.current = true;
    } catch (error) {
      console.error("Failed to render Turnstile widget:", error);
    }
  }, [onVerify, onError, onExpire, theme, size]);

  useEffect(() => {
    // Check if script is already loaded
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (existingScript) {
      // Script exists, wait for it to load
      window.onTurnstileLoad = renderWidget;
      return;
    }

    // Load Turnstile script with explicit rendering mode
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;

    window.onTurnstileLoad = renderWidget;

    document.head.appendChild(script);

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Widget might already be removed
        }
      }
      isRenderedRef.current = false;
      widgetIdRef.current = null;
    };
  }, [renderWidget]);

  // Don't render anything if no site key
  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  // IMPORTANT: Do NOT add cf-turnstile class or data-sitekey attribute here!
  // We use explicit rendering via window.turnstile.render() in the useEffect.
  // Adding those attributes causes Cloudflare's script to auto-render a second widget.
  return (
    <div ref={containerRef} className={`turnstile-container ${className}`} />
  );
}

// Hook to reset Turnstile widget (useful after form submission error)
export function useTurnstileReset() {
  const reset = useCallback((widgetId: string) => {
    if (window.turnstile && widgetId) {
      window.turnstile.reset(widgetId);
    }
  }, []);

  return reset;
}
