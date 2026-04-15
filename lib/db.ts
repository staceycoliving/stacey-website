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
  // Pool config — tight caps because DIRECT_URL on Supabase is actually
  // the Supavisor *session-mode* pooler (Port 5432, not raw postgres),
  // and session mode has a strict pool_size cap (default ~15). With many
  // Vercel invocations we hit MaxClientsInSessionMode fast.
  //
  //  - max: 2 — keeps each invocation tiny so 6-8 concurrent Vercel
  //    functions still fit under the Supavisor pool_size.
  //  - idleTimeoutMillis: 10s — release connections back to Supavisor
  //    promptly.
  //  - connectionTimeoutMillis: 15s — cold-start handshake needs time.
  //
  // Mid-term fix: raise Supavisor pool_size in the Supabase dashboard
  // (Project → Settings → Database → Connection Pool) and then bump
  // pg.Pool max back up.
  const pool = new pg.Pool({
    connectionString: env.DIRECT_URL,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
