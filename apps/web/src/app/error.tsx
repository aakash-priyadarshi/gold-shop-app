"use client";

/**
 * App-level Error Boundary — catches errors from any page under app/.
 * Unlike global-error.tsx, this one is rendered inside the root layout
 * so it has access to the theme, fonts, and navigation.
 */

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Orivraa Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-content bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        {/* Gold warning icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-400/20 to-gold-600/10 dark:from-gold-400/30 dark:to-gold-600/20">
          <svg
            className="h-8 w-8 text-gold-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gold-100 mb-3">
          Something went wrong
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          This page ran into an unexpected error. You can try again, go back, or
          navigate to the home page.
        </p>

        {/* Error details — always shown as collapsible so users can report bugs */}
        {error?.message && (
          <details className="mb-6 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-left">
            <summary className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 cursor-pointer select-none hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded-t-lg">
              Error details (click to expand)
            </summary>
            <pre className="px-3 pb-3 text-xs text-red-600 dark:text-red-400 overflow-auto max-h-48 whitespace-pre-wrap break-words">
              {error.message}
              {process.env.NODE_ENV === "development" && error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-gold-600 hover:to-gold-700 transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
            Try again
          </button>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Go back
          </button>

          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-gold-300/40 dark:border-gold-600/30 px-5 py-2.5 text-sm font-medium text-gold-700 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-all"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
