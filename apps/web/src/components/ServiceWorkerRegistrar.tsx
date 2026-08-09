"use client";

import { useEffect } from "react";

function isUnsupportedServiceWorkerClient(): boolean {
  if (typeof navigator === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  return /bot|crawl|spider|slurp|ia_archiver|prerender|headless/i.test(
    navigator.userAgent,
  );
}

/**
 * Registers the PWA service worker with bot-safe error handling.
 * next-pwa is configured with register:false so failed registrations
 * (e.g. Googlebot) do not surface as unhandled promise rejections in Sentry.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (isUnsupportedServiceWorkerClient()) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Private mode, unsupported contexts, or crawler environments.
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);

  return null;
}
