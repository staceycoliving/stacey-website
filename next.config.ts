import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Use a separate distDir in dev to work around a Turbopack persistent
  // cache corruption on macOS. Production (Vercel) uses the default ".next".
  ...(process.env.NODE_ENV === "development" ? { distDir: ".next-d2" } : {}),
};

// withSentryConfig is a no-op when no SENTRY_AUTH_TOKEN is set, so this is safe
// to enable even before you've created a Sentry project — just push and the
// build still works. Once SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are
// set in Vercel, sourcemaps get uploaded automatically.
export default withSentryConfig(nextConfig, {
  silent: true, // Don't print Sentry messages during the build
  widenClientFileUpload: true,
  disableLogger: true,
});
