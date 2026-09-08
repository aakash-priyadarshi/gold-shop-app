import * as Sentry from "@sentry/nextjs";
import {
  getSupportToken,
  onSupportSessionStarted,
} from "@/lib/support-session";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://a4441c29112069bd06a2e419d466045d@o105835.ingest.us.sentry.io/4511874239561728";
const supportSession = typeof window !== "undefined" && !!getSupportToken();

Sentry.init({
  dsn,
  enabled: true,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: supportSession ? 0 : 0.1,
  replaysOnErrorSampleRate: supportSession ? 0 : 1.0,
  integrations: supportSession ? [] : [Sentry.replayIntegration()],
});

if (typeof window !== "undefined") {
  onSupportSessionStarted(() => {
    void Sentry.getReplay()?.stop();
  });
}
