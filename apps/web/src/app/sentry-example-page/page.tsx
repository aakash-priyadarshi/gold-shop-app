"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

/**
 * Dev/ops page to verify Sentry is receiving events.
 * Visit /sentry-example-page and click the button, then check Sentry Issues.
 */
export default function SentryExamplePage() {
  const [sent, setSent] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-stone-50">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Sentry Test</h1>
        <p className="text-sm text-stone-600">
          Click below to throw a client error. It should appear under project{" "}
          <code className="text-xs bg-stone-200 px-1 rounded">orivraa-web</code>.
        </p>
        <button
          type="button"
          className="w-full rounded-lg bg-rose-600 px-4 py-3 text-white font-medium hover:bg-rose-700"
          onClick={() => {
            setSent(true);
            Sentry.captureException(
              new Error("Orivraa Sentry test error from /sentry-example-page"),
            );
            // Also throw so the global error path is exercised in some setups
            throw new Error("Orivraa Sentry test error (thrown)");
          }}
        >
          Break the world
        </button>
        {sent && (
          <p className="text-sm text-emerald-700">
            Event sent — open{" "}
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
      </div>
    </main>
  );
}
