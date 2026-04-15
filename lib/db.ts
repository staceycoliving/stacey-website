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
  // Cap the pool:
  //  - max: 3 — keep each Vercel invocation within a small footprint so
  //    parallel admin-dashboard loads don't exhaust Supabase's direct-
  //    connection limit (~60).
  //  - idleTimeoutMillis: 10s — close idle sockets quickly so serverless
  //    functions don't hold connections between invocations.
  //  - connectionTimeoutMillis: 5s — fail fast instead of hanging.
  const pool = new pg.Pool({
    connectionString: env.DIRECT_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
