/**
 * Silent capture of errors shown to users (destructive toasts, error
 * boundaries, API 5xx). Posted to POST /crash-reports for the admin inbox.
 *
 * Uses fetch (not axios) so a failing API cannot recurse through interceptors.
 */

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE_URL = rawApiUrl.endsWith("/api")
  ? rawApiUrl
  : `${rawApiUrl}/api`;

const DEDUPE_WINDOW_MS = 2 * 60 * 1000;
const SESSION_MAX_PER_MINUTE = 8;

const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|ia_archiver|prerender|headless|bingpreview|applewebkit\/compatible/i;

/** Validation / session noise — not product bugs. */
const SKIP_PATTERNS: RegExp[] = [
  /session expired/i,
  /your session timed out/i,
  /upgrade required/i,
  /pop-?ups? blocked/i,
  /^copied$/i,
  /copied to clipboard/i,
  /please (fill|enter|select|choose|provide)/i,
  /\bis required\b/i,
  /required field/i,
  /invalid (email|password|pin|otp|phone)/i,
  /incorrect (password|pin|otp)/i,
  /wrong password/i,
  /clipboard/i,
  /invalid credentials/i,
  /balance must be paid before completing/i,
  /cash drawer kick needs a paired thermal printer/i,
  /printer not configured/i,
  /stripe connect is not available/i,
  /no item with sku/i,
  /shop\.address should not be empty/i,
  /tax-exempt invoices require both a reason and supporting evidence reference/i,
  /captcha (verification required|expired|verification failed)/i,
  /invalid captcha/i,
  /file (?:is )?too large/i,
  /maximum (?:file )?size/i,
  /unsupported file type/i,
];

const recentKeys = new Map<string, number>();
const sessionHits: number[] = [];

export type UserFacingErrorReport = {
  title?: string;
  description?: string;
  page?: string;
  stack?: string;
  userAction?: string;
  frustrationType?: string;
  userTriggered?: boolean;
  userDescription?: string;
  screenshotUrl?: string;
  /** Default true. Pass false to show a destructive toast without logging it. */
  reportToAdmin?: boolean;
};

export function formatUserFacingErrorCopy(input: {
  title?: string;
  description?: string;
  page?: string;
}): string {
  const title = (input.title || "").trim();
  const description = (input.description || "").trim();
  const page = (input.page || "").trim();
  const lines: string[] = [];
  if (title) lines.push(title);
  if (description && description !== title) lines.push(description);
  if (page) {
    if (lines.length) lines.push("");
    lines.push(`Page: ${page}`);
  }
  return lines.join("\n").trim();
}

export function shouldSkipUserFacingError(
  title?: string,
  description?: string,
): boolean {
  const text = `${title || ""} ${description || ""}`.trim();
  if (!text) return true;
  return SKIP_PATTERNS.some((re) => re.test(text));
}

export function dedupeKey(message: string, page: string): string {
  return `${message.trim().toLowerCase()}|${page}`;
}

export function resetUserFacingErrorReporterForTests() {
  recentKeys.clear();
  sessionHits.length = 0;
}

function prune(now: number) {
  for (const [key, ts] of Array.from(recentKeys.entries())) {
    if (now - ts > DEDUPE_WINDOW_MS) recentKeys.delete(key);
  }
  while (sessionHits.length && now - sessionHits[0] > 60_000) {
    sessionHits.shift();
  }
}

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  return !!(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

function readJwtUser(): { userId?: string; userRole: string } {
  let userRole = "guest";
  let userId: string | undefined;
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    if (token) {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
        ) as { role?: string; sub?: string };
        userRole = payload.role || "guest";
        userId = payload.sub;
      }
    }
  } catch {
    /* ignore malformed JWT */
  }
  if (userRole === "guest") {
    try {
      const match = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("orivraa_user_role="));
      if (match) {
        userRole = decodeURIComponent(match.slice("orivraa_user_role=".length));
      }
    } catch {
      /* ignore */
    }
  }
  return { userId, userRole };
}

function requestUrlLooksLikeCrashReports(url?: string): boolean {
  return !!url && /\/crash-reports(?:\?|$|\/)/.test(url);
}

function requestUrlLooksLikeSessionAnalytics(url?: string): boolean {
  return !!url && /\/sessions\/web(?:\?|$|\/)/.test(url);
}

export function isAutomatedUserAgent(userAgent?: string): boolean {
  return BOT_USER_AGENT_PATTERN.test(userAgent || "");
}

/**
 * Fire-and-forget. Never throws. Safe to call from toast(), interceptors,
 * and error boundaries.
 */
export function reportUserFacingError(input: UserFacingErrorReport): void {
  void submitUserFacingError(input);
}

export async function submitUserFacingError(
  input: UserFacingErrorReport,
): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    if (input.reportToAdmin === false) return false;
    if (isAutomatedUserAgent(navigator.userAgent)) return false;

    const title = (input.title || "").trim();
    const description = (input.description || "").trim();
    if (shouldSkipUserFacingError(title, description) && !input.userTriggered) {
      return false;
    }

    const page = (
      input.page || window.location.pathname + window.location.search
    ).slice(0, 2000);
    if (page.includes("/crash-reports")) return false;
    if (page.includes("/system/slack-alert-test")) return false;

    const copy = formatUserFacingErrorCopy({ title, description, page });
    if (!copy) return false;

    const now = Date.now();
    prune(now);
    if (sessionHits.length >= SESSION_MAX_PER_MINUTE) return false;

    const key = dedupeKey(copy, page);
    if (recentKeys.has(key) && !input.userTriggered) return false;
    recentKeys.set(key, now);
    sessionHits.push(now);

    const { userId, userRole } = readJwtUser();
    const body = {
      errorMessage: copy.slice(0, 10000),
      errorStack: input.stack?.slice(0, 20000),
      page,
      userAction: input.userAction?.slice(0, 2000),
      platform: isTauriRuntime() ? "desktop" : "web",
      userRole,
      userId,
      userAgent: navigator.userAgent,
      sessionToken: sessionStorage.getItem("orivraa_ws_token") || undefined,
      userTriggered: input.userTriggered ?? false,
      userDescription: input.userDescription,
      screenshotUrl: input.screenshotUrl,
      frustrationType: input.frustrationType || "toast",
    };

    await fetch(`${API_BASE_URL}/crash-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Axios / fetch 5xx (or no-response network) details for the admin inbox. */
export function reportApiFailure(error: {
  message?: string;
  code?: string;
  config?: { url?: string; method?: string; baseURL?: string };
  response?: { status?: number; statusText?: string; data?: unknown };
}): void {
  const url = String(error.config?.url || "");
  if (requestUrlLooksLikeCrashReports(url)) return;
  if (requestUrlLooksLikeSessionAnalytics(url)) return;
  if (error.code === "ERR_CANCELED") return;
  if (/\b(?:aborted|cancel(?:ed|led))\b/i.test(error.message || "")) {
    return;
  }

  const status = error.response?.status;
  if (status && status < 500) return;

  const method = (error.config?.method || "GET").toUpperCase();
  const path = url.replace(/^https?:\/\/[^/]+/i, "") || url || "(unknown)";
  const apiMessage = extractApiErrorMessage(error.response?.data);
  const title = status ? `Server error ${status}` : "Network error";
  const description = [
    `${method} ${path}`,
    apiMessage || error.message || error.response?.statusText,
  ]
    .filter(Boolean)
    .join(" — ");

  reportUserFacingError({
    title,
    description,
    frustrationType: "api_error",
    userAction: `${method} ${path}`,
  });
}

function extractApiErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const rec = data as Record<string, unknown>;
  if (typeof rec.message === "string") return rec.message;
  if (Array.isArray(rec.message)) return rec.message.map(String).join("; ");
  return "";
}
