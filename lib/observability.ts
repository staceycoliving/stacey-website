// Thin wrapper around @sentry/nextjs so the rest of the codebase doesn't have
// to import Sentry directly. Two helpers:
//
//   logEvent(scope, msg, ctx)   — info-level structured log + Sentry breadcrumb
//   reportError(err, ctx)        — captures the exception with full context
//
// Both write structured JSON to console (Vercel-friendly, grep-able) and
// never throw out of error-handling paths.

import "server-only";
import * as Sentry from "@sentry/nextjs";

type Tags = Record<string, string | number | boolean | undefined | null>;

type ErrorContext = {
  /** Logical area: "stripe-webhook", "apaleo-availability", "cron-daily", … */
  scope?: string;
  /** Booking ID, tenant ID, slug, anything that helps locate the request. */
  tags?: Tags;
  /** Free-form structured data dumped into Sentry's "extra" panel. */
  extra?: Record<string, unknown>;
};

type LogContext = {
  scope: string;
  tags?: Tags;
};

// ─── Structured console log ─────────────────────────────────

function emitConsole(level: "info" | "warn" | "error", scope: string, msg: string, tags: Tags = {}) {
  // Vercel parses each console.log line as JSON when it looks like one,
  // so structured logs become filterable in the Vercel dashboard.
  const entry = {
    level,
    scope,
    msg,
    ts: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(tags).filter(([, v]) => v !== undefined && v !== null)
    ),
  };
  const json = JSON.stringify(entry);
  if (level === "error") console.error(json);
  else if (level === "warn") console.warn(json);
  else console.log(json);
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Info-level log + Sentry breadcrumb. Use for "I just did X" messages
 * inside a request flow so that when something errors later in the same
 * request, the breadcrumbs show what led up to it.
 */
export function logEvent(ctx: LogContext, msg: string) {
  emitConsole("info", ctx.scope, msg, ctx.tags);
  try {
    Sentry.addBreadcrumb({
      category: ctx.scope,
      message: msg,
      level: "info",
      data: ctx.tags,
    });
  } catch {
    // breadcrumbs must never throw
  }
}

/**
 * Warn-level log + Sentry breadcrumb. Use for "expected weirdness" —
 * something a normal user might cause that we don't want to alert on
 * but want to be able to find later (e.g. webhook for unknown booking).
 */
export function logWarn(ctx: LogContext, msg: string) {
  emitConsole("warn", ctx.scope, msg, ctx.tags);
  try {
    Sentry.addBreadcrumb({
      category: ctx.scope,
      message: msg,
      level: "warning",
      data: ctx.tags,
    });
  } catch {
    // breadcrumbs must never throw
  }
}

/**
 * Log an error to console (always) and Sentry (if SENTRY_DSN is configured).
 * Captures everything from logEvent breadcrumbs in the same request, so the
 * Sentry issue shows the full flow that led to the failure.
 * Safe to call from any server-side code; never throws.
 */
export function reportError(err: unknown, ctx: ErrorContext = {}) {
  const message = err instanceof Error ? err.message : String(err);
  emitConsole("error", ctx.scope ?? "error", message, ctx.tags);

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
