"use client";

/**
 * Global Error Boundary — catches errors in the root layout itself.
 * This is the last line of defense; it renders its own <html> shell
 * because the root layout may have crashed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          {process.env.NODE_ENV === "development" && error?.message && (
            <pre
              style={{
                textAlign: "left",
                background: "rgba(0,0,0,0.3)",
                padding: "0.75rem 1rem",
                borderRadius: 8,
                fontSize: "0.75rem",
                color: "#fca5a5",
                overflow: "auto",
                maxHeight: 120,
                margin: "0 0 1.5rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error.message}
            </pre>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                background:
                  "linear-gradient(135deg, #e5a31e, #c9942a)",
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
          </div>
        </div>
      </body>
    </html>
  );
}
