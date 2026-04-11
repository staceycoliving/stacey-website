// Centralised, validated environment variables.
//
// Every env var the app reads goes through here. Anything required without a
// default will throw at module load if it's missing or has the wrong shape, so
// a typo in Vercel fails the build instead of crashing later at request time.
//
// Usage: `import { env } from "@/lib/env"` then `env.STRIPE_SECRET_KEY` etc.
// Never read process.env directly anywhere else in the codebase.
//
// `server-only` makes the build fail if a Client Component imports this file,
// so we can keep secret env vars and the validated `env` object in one place.

import "server-only";
import { z } from "zod";

// Server-only schema. These vars must NEVER be referenced from client-side code.
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database (Supabase)
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // apaleo PMS (SHORT stay)
  APALEO_CLIENT_ID: z.string().min(1),
  APALEO_CLIENT_SECRET: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).startsWith("whsec_"),

  // Resend (transactional email)
  RESEND_API_KEY: z.string().min(1).startsWith("re_"),

  // Yousign (lease signing)
  YOUSIGN_API_KEY: z.string().min(1),
  YOUSIGN_BASE_URL: z.string().url().default("https://api-sandbox.yousign.app/v3"),

  // Admin
  ADMIN_PASSWORD: z.string().min(8),

  // Vercel cron auth
  CRON_SECRET: z.string().min(16),

  // Optional: comma-separated whitelist for outgoing emails (test mode)
  TEST_MODE_EMAILS: z.string().optional().default(""),

  // Optional: Sentry server-side DSN (errors only sent if set)
  SENTRY_DSN: z.string().url().optional(),

  // Force-enable Sentry in non-production (for debugging)
  SENTRY_FORCE: z.string().optional(),

  // Optional: Upstash Redis for rate limiting (allows all requests if not set)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Client-safe schema. These vars are bundled into the browser.
const clientSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z.string().url(),
});

// ─── Parse + expose ───

function formatErrors(errors: z.ZodError["issues"]): string {
  return errors
    .map((err) => `  ${err.path.join(".")}: ${err.message}`)
    .join("\n");
}

const _serverEnv = serverSchema.safeParse(process.env);
if (!_serverEnv.success) {
  console.error(
    "❌ Invalid server environment variables:\n" + formatErrors(_serverEnv.error.issues)
  );
  throw new Error("Invalid server environment variables");
}

const _clientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
});
if (!_clientEnv.success) {
  console.error(
    "❌ Invalid public environment variables:\n" + formatErrors(_clientEnv.error.issues)
  );
  throw new Error("Invalid public environment variables");
}

export const env = {
  ..._serverEnv.data,
  ..._clientEnv.data,
};
