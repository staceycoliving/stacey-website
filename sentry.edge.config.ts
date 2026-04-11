// Sentry init for the Edge runtime (middleware + edge route handlers).
// We don't use any edge runtime today, but Next.js still imports this file,
// so we need to keep it consistent with the server config.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_FORCE === "1",
  });
}
