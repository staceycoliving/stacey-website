// Sentry init for the browser bundle. Captures uncaught client errors and
// React component errors. Uses NEXT_PUBLIC_SENTRY_DSN so it ships into the
// client bundle.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
    tracesSampleRate: 0.1,
    // Avoid noise from local dev unless explicitly opted in.
    enabled: process.env.NODE_ENV === "production",
    // Don't capture noisy network errors that the user can't act on.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Failed to fetch",
    ],
  });
}
