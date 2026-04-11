// Sentry init for the Node.js server runtime (API routes, server components,
// cron jobs, webhooks). Loaded by instrumentation.ts on boot.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    // Capture 100% of errors but only 10% of transactions to keep quota down.
    tracesSampleRate: 0.1,
    // Don't spam Sentry from local dev unless explicitly opted in.
    enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_FORCE === "1",
  });
}
