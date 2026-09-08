// Tab-scoped only. Never replace the admin's shared cookies/localStorage tokens.
const KEY = "orivraa-support-session";
let exitingToken: string | null = null;
const sessionStartedListeners = new Set<() => void>();

export function onSupportSessionStarted(listener: () => void) {
  sessionStartedListeners.add(listener);
  return () => sessionStartedListeners.delete(listener);
}

export function getSupportToken(): string | null {
  return typeof window === "undefined"
    ? null
    : exitingToken || sessionStorage.getItem(KEY);
}
export function storeSupportToken(token: string) {
  if (!/^osa_[a-f0-9]{64}$/.test(token))
    throw new Error("Invalid support credential");
  sessionStorage.setItem(KEY, token);
  sessionStorage.removeItem('gold-shop-preferences');
  sessionStartedListeners.forEach((listener) => listener());
}
export function getPreferenceStorage(): Storage {
  return getSupportToken() ? sessionStorage : localStorage;
}
export function exitSupportSession() {
  // Keep this document in support mode until navigation completes. Parallel
  // requests must never fall back to the admin credential during teardown.
  exitingToken = getSupportToken();
  sessionStorage.removeItem(KEY);
  window.location.replace("/dashboard/admin/support-access");
}

// Older screens use fetch directly. Enforce the same tab identity for API calls,
// even if those screens supply the normal admin token themselves.
if (typeof window !== "undefined" && typeof window.fetch === "function") {
  const originalFetch = window.fetch.bind(window);
  const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const apiBase = new URL(
    rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`,
    window.location.origin,
  );
  window.fetch = (input, init) => {
    const token = getSupportToken();
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      window.location.origin,
    );
    if (
      token &&
      url.origin === apiBase.origin &&
      (url.pathname === apiBase.pathname ||
        url.pathname.startsWith(`${apiBase.pathname}/`))
    ) {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      );
      headers.set("Authorization", `Bearer ${token}`);
      return originalFetch(input, { ...init, headers, cache: "no-store" });
    }
    return originalFetch(input, init);
  };
}
