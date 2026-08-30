"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

/**
 * Dev/ops page to verify Sentry is receiving events.
 * Visit /sentry-example-page and click the button, then check Sentry Issues.
 */
export default function SentryExamplePage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">(
    "idle",
  );
  const [detail, setDetail] = useState("");

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-stone-50">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Sentry Test</h1>
        <p className="text-sm text-stone-600">
          Click below to send a client error. It should appear under project{" "}
          <code className="text-xs bg-stone-200 px-1 rounded">orivraa-web</code>.
        </p>
        <button
          type="button"
          disabled={status === "sending"}
          className="w-full rounded-lg bg-rose-600 px-4 py-3 text-white font-medium hover:bg-rose-700 disabled:opacity-60"
          onClick={async () => {
            setStatus("sending");
            setDetail("");
            try {
              const client = Sentry.getClient();
              if (!client) {
                setStatus("failed");
                setDetail(
                  "Sentry client is not initialized (missing instrumentation-client.ts load).",
                );
                return;
              }
              const eventId = Sentry.captureException(
                new Error("Orivraa Sentry test error from /sentry-example-page"),
              );
              await Sentry.flush(2000);
              setStatus("sent");
              setDetail(eventId ? `eventId=${eventId}` : "flushed");
            } catch (err) {
              setStatus("failed");
              setDetail(err instanceof Error ? err.message : "unknown error");
            }
          }}
        >
          {status === "sending" ? "Sending…" : "Break the world"}
        </button>
        {status === "sent" && (
          <p className="text-sm text-emerald-700">
            Event sent ({detail}). Open{" "}
            <a
              className="underline"
              href="https://aakash-priyadarshi.sentry.io/issues/?project=orivraa-web"
              target="_blank"
              rel="noreferrer"
            >
              Sentry Issues
            </a>
            .
          </p>
        )}
        {status === "failed" && (
          <p className="text-sm text-rose-700">Failed to send: {detail}</p>
        )}
      </div>
    </main>
  );
}
