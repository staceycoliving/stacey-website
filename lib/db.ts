import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./env";

/**
 * Two-pool architecture, officially recommended by both Supabase and
 * Prisma for this stack.
 *
 *  - `prisma` uses **DATABASE_URL** (Supavisor transaction pooler, port
 *    6543). This pooler multiplexes connections across many short-lived
 *    queries, so we can open a much larger pg.Pool without hitting the
 *    session-mode cap. Use it for every normal query.
 *
 *  - `prismaDirect` uses **DIRECT_URL** (Supavisor session pooler, port
 *    5432). Session mode keeps a dedicated connection per client for the
 *    whole session, which is required for `prisma.$transaction(async (tx)
 *    => …)` interactive transactions and for anything that relies on
 *    transaction-scoped state. Only import this in the handful of files
 *    that need interactive transactions (Stripe webhook, booking create,
 *    withdraw, rent adjustment).
 *
 * Transaction pooler caveat: it doesn't support named prepared statements.
 * Prisma's adapter-pg emits unnamed queries via pg's extended protocol,
 * which the transaction pooler handles fine in practice. If we ever see
 * `prepared statement "..." does not exist` errors, the workaround is to
 * append `?pgbouncer=true` to DATABASE_URL.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  prismaDirect: PrismaClient;
};

function createPrismaPooled() {
  // Transaction-mode pooler, scales horizontally, low connection footprint.
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function createPrismaSession() {
  // Session-mode pooler, dedicated connections, needed for interactive
  // `$transaction(async tx => …)` calls. Kept deliberately small so it
  // doesn't exhaust the session pool's strict pool_size (default ~15 on
  // Nano compute).
  const pool = new pg.Pool({
    connectionString: env.DIRECT_URL,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaPooled();
export const prismaDirect =
  globalForPrisma.prismaDirect ?? createPrismaSession();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDirect = prismaDirect;
}
