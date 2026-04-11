// Thin wrapper around @sentry/nextjs so the rest of the codebase doesn't have
// to import Sentry directly. Use `reportError(err, ctx)` in any catch block
// where you'd otherwise just call console.error.

import "server-only";
import * as Sentry from "@sentry/nextjs";

type ErrorContext = {
  /** Logical area: "stripe-webhook", "apaleo-availability", "cron-daily", … */
  scope?: string;
  /** Booking ID, tenant ID, slug, anything that helps locate the request. */
  tags?: Record<string, string | number | boolean | undefined | null>;
  /** Free-form structured data dumped into Sentry's "extra" panel. */
  extra?: Record<string, unknown>;
};

/**
 * Log an error to console (always) and Sentry (if SENTRY_DSN is configured).
 * Safe to call from any server-side code; never throws.
 */
export function reportError(err: unknown, ctx: ErrorContext = {}) {
  const message = err instanceof Error ? err.message : String(err);
  // Always log so Vercel logs still have the trace
  console.error(`[${ctx.scope ?? "error"}]`, message, ctx.tags ?? {}, err);

  try {
    Sentry.withScope((scope) => {
      if (ctx.scope) scope.setTag("area", ctx.scope);
      if (ctx.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) {
          if (v !== undefined && v !== null) scope.setTag(k, String(v));
        }
      }
      if (ctx.extra) scope.setExtras(ctx.extra);
      Sentry.captureException(err);
    });
  } catch {
    // Sentry must never throw out of error handling
  }
}
