"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
    void import("@/lib/reportUserFacingError").then(({ reportUserFacingError }) => {
      reportUserFacingError({
        title: "Page crash",
        description: error.message || "Unknown error",
        stack: error.stack,
        frustrationType: "boundary",
        userTriggered: false,
      });
    });
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
