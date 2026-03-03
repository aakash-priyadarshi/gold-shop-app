"use client";

/**
 * Global Error Boundary — catches errors in the root layout itself.
 * This is the last line of defense; it renders its own <html> shell
 * because the root layout may have crashed.
 *
 * Cannot use any imports (Tailwind, api.ts) — must use inline styles
 * and raw fetch() for crash reporting.
 */

import { useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reportStatus, setReportStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const handleReport = async () => {
    setReportStatus("sending");
    try {
      let userRole = "guest";
      let userId: string | undefined;
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
            );
            userRole = payload.role || "guest";
            userId = payload.sub;
          }
        }
      } catch {}

      // Determine API base URL from env or fallback
      const apiUrl =
        (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
        "https://api.orivraa.com/api";
      const base = apiUrl.endsWith("/api") ? apiUrl : `${apiUrl}/api`;

      const token = localStorage.getItem("token");

      await fetch(`${base}/crash-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          errorMessage: error?.message || "Unknown fatal error",
          errorStack: error?.stack,
          page: window.location.pathname + window.location.search,
          userAction: "Fatal error (root layout crashed)",
          platform: (window as any).__TAURI__ ? "desktop" : "web",
          userRole,
          userId,
          userAgent: navigator.userAgent,
        }),
      });
      setReportStatus("sent");
    } catch {
      setReportStatus("error");
    }
  };
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#f1f5f9",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: "2rem" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 1.5rem",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(229, 163, 30, 0.2), rgba(243, 221, 153, 0.1))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ⚠
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#f3dd99",
              margin: "0 0 0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              margin: "0 0 1.5rem",
            }}
          >
            An unexpected error occurred. You can try again or go back to the
            home page.
          </p>
          {error?.message && (
            <details style={{ marginBottom: "1.5rem", textAlign: "left" }}>
              <summary
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px 8px 0 0",
                  fontSize: "0.75rem",
                  color: "#fca5a5",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Error details (click to expand)
              </summary>
              <pre
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "0.75rem 1rem",
                  borderRadius: "0 0 8px 8px",
                  fontSize: "0.75rem",
                  color: "#fca5a5",
                  overflow: "auto",
                  maxHeight: 200,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {error.message}
              </pre>
            </details>
          )}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                background: "linear-gradient(135deg, #e5a31e, #c9942a)",
                color: "#0f172a",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "10px 24px",
                background: "transparent",
                color: "rgba(212,175,55,0.8)",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 8,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Go home
            </button>
            <button
              onClick={handleReport}
              disabled={reportStatus === "sending" || reportStatus === "sent"}
              style={{
                padding: "10px 24px",
                background:
                  reportStatus === "sent"
                    ? "rgba(34,197,94,0.15)"
                    : "transparent",
                color:
                  reportStatus === "sent"
                    ? "#4ade80"
                    : reportStatus === "error"
                      ? "#f87171"
                      : "#93c5fd",
                border: `1px solid ${
                  reportStatus === "sent"
                    ? "rgba(34,197,94,0.3)"
                    : reportStatus === "error"
                      ? "rgba(248,113,113,0.3)"
                      : "rgba(147,197,253,0.3)"
                }`,
                borderRadius: 8,
                fontSize: "0.875rem",
                cursor:
                  reportStatus === "sending" || reportStatus === "sent"
                    ? "default"
                    : "pointer",
                opacity: reportStatus === "sending" ? 0.6 : 1,
              }}
            >
              {reportStatus === "sending"
                ? "Sending..."
                : reportStatus === "sent"
                  ? "Reported \u2713"
                  : reportStatus === "error"
                    ? "Retry Report"
                    : "\uD83D\uDEE1 Report Error"}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
