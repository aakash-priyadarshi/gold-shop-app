"use client";

import { useEffect } from "react";

const CHUNK_RECOVERY_KEY = "orivraa:chunk-recovery-at";
const CHUNK_RECOVERY_WINDOW_MS = 60_000;
const CHUNK_ERROR_PATTERN =
  /chunkloaderror|loading chunk [^ ]+ failed|failed to fetch dynamically imported module|importing a module script failed/i;

function isUnsupportedServiceWorkerClient(): boolean {
  if (typeof navigator === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  return /bot|crawl|spider|slurp|ia_archiver|prerender|headless/i.test(
    navigator.userAgent,
  );
}

function errorText(reason: unknown): string {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  if (typeof reason === "string") return reason;
  if (reason && typeof reason === "object") {
    const value = reason as { name?: unknown; message?: unknown };
    return [value.name, value.message]
      .filter((part): part is string => typeof part === "string")
      .join(": ");
  }
  return "";
}

export function isChunkLoadError(reason: unknown): boolean {
  return CHUNK_ERROR_PATTERN.test(errorText(reason));
}

/** Refresh an outdated app shell once, avoiding an infinite reload loop. */
export async function recoverFromChunkLoadError(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  let lastRecovery = 0;
  try {
    lastRecovery = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY));
  } catch {
    // Without a readable marker, reloading could loop forever.
    return false;
  }
  if (
    Number.isFinite(lastRecovery) &&
    now - lastRecovery < CHUNK_RECOVERY_WINDOW_MS
  ) {
    return false;
  }
  try {
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(now));
  } catch {
    // Do not reload unless the loop-prevention marker was recorded.
    return false;
  }

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  } catch {
    // Reloading from the network can still recover when SW APIs are unavailable.
  }

  window.location.reload();
  return true;
}

/**
 * Registers the PWA service worker with bot-safe error handling.
 * next-pwa is configured with register:false so failed registrations
 * (e.g. Googlebot) do not surface as unhandled promise rejections in Sentry.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (
      /bot|crawl|spider|slurp|ia_archiver|prerender|headless/i.test(
        navigator.userAgent,
      )
    ) {
      return;
    }

    const handleWindowError = (event: ErrorEvent) => {
      if (!isChunkLoadError(event.error || event.message)) return;
      event.preventDefault();
      void recoverFromChunkLoadError();
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      void recoverFromChunkLoadError();
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    if (isUnsupportedServiceWorkerClient()) {
      return () => {
        window.removeEventListener("error", handleWindowError);
        window.removeEventListener(
          "unhandledrejection",
          handleUnhandledRejection,
        );
      };
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Private mode, unsupported contexts, or crawler environments.
      }
    };

    const handleLoad = () => void register();
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", handleLoad, { once: true });
    }

    return () => {
      window.removeEventListener("load", handleLoad);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return null;
}
