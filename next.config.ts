import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Temporary: use a fresh distDir to work around a Turbopack persistent
  // cache corruption on macOS. Can be reverted back to ".next" later.
  distDir: ".next-dev",
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
