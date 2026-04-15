import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Use DIRECT_URL (not pgbouncer) — required for interactive transactions
  // like prisma.$transaction(async (tx) => ...) used in the Stripe webhook,
  // booking creation, withdraw and rent-adjustment routes.
  //
  // Pool config tuned for Vercel serverless + Supabase direct connections:
  //  - max: 5 — each Vercel function can run a few queries in parallel
  //    without hogging Supabase's direct-connection cap (~60). At 10
  //    concurrent invocations we're at 50 connections, still under limit.
  //  - idleTimeoutMillis: 30s — long enough to reuse a pooled connection
  //    across the lifetime of a warm Vercel function, short enough to
  //    release it before the next cold start.
  //  - connectionTimeoutMillis: 15s — Supabase direct connect can take
  //    several seconds on a cold invocation; 5s was too tight and produced
  //    cold-start 500s on the admin pages (rooms/finance/occupancy).
  const pool = new pg.Pool({
    connectionString: env.DIRECT_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
