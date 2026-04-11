// Rate limiting via Upstash Redis (REST API, no persistent connection so it
// works in serverless cold starts and Vercel edge runtime).
//
// Each route picks one of the named limiters below based on its risk profile:
//
//   - bookingLimiter   for /api/booking, /api/checkout/* — anything that
//                      hits Stripe or apaleo and could cost real money or
//                      trigger spam to the team. Tight limit.
//   - readLimiter      for /api/availability — high-volume reads, looser.
//   - leaseLimiter     for /api/lease — generates a docx + creates a Yousign
//                      signing session. Tight.
//   - adminAuthLimiter for /api/admin/auth — brute-force password protection.
//                      Very tight, per-IP.
//
// If UPSTASH_REDIS_REST_URL is not set, every limiter is a no-op (allows the
// request through). This way the app keeps running locally and on Preview
// deploys without needing the env var.
//
// Usage in a route:
//
//   const ok = await checkRateLimit(bookingLimiter, request);
//   if (!ok.success) return rateLimitResponse(ok);
//   // … your handler …

import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = UPSTASH_URL && UPSTASH_TOKEN
  ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
  : null;

function makeLimiter(prefix: string, requests: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `stacey:${prefix}`,
  });
}

// ─── Limiters ───────────────────────────────────────────────

/** 5 booking attempts per IP per minute. Hits Stripe + apaleo + DB. */
export const bookingLimiter = makeLimiter("booking", 5, "1 m");

/** 30 availability reads per IP per minute. */
export const readLimiter = makeLimiter("read", 30, "1 m");

/** 3 lease generations per IP per minute. Heavy: docx + Yousign. */
export const leaseLimiter = makeLimiter("lease", 3, "1 m");

/** 5 admin login attempts per IP per minute. Brute force protection. */
export const adminAuthLimiter = makeLimiter("admin-auth", 5, "1 m");

// ─── Helpers ────────────────────────────────────────────────

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/** Identifier for a request: real client IP or a static fallback. */
function getClientId(req: NextRequest): string {
  // Vercel sets x-forwarded-for with the real client IP first
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Run a rate-limit check. If the limiter is null (no Redis configured),
 * the request is always allowed — but we still return a "result" so callers
 * don't have to special-case it.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  request: NextRequest,
): Promise<LimitResult> {
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
  const id = getClientId(request);
  const { success, limit, remaining, reset } = await limiter.limit(id);
  return { success, limit, remaining, reset };
}

/** Build a 429 response with the rate-limit headers Vercel + browsers expect. */
export function rateLimitResponse(result: LimitResult) {
  return Response.json(
    {
      error: "Too many requests",
      retryAfter: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
        "Retry-After": String(Math.max(0, Math.ceil((result.reset - Date.now()) / 1000))),
      },
    },
  );
}
