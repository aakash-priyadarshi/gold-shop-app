import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://81c9a5e5d7c0c5e96006c979ee379258@o105835.ingest.us.sentry.io/4511604651982848";

Sentry.init({
  dsn,
  enabled: true,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
