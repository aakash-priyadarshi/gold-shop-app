import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://a4441c29112069bd06a2e419d466045d@o105835.ingest.us.sentry.io/4511874239561728";

Sentry.init({
  dsn,
  enabled: true,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
