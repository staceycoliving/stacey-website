import "server-only";
import type { NextRequest } from "next/server";
import { prisma } from "./db";
import { reportError } from "./observability";

interface AuditEntry {
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append an audit-log row. Fire-and-forget by design — failures are reported
 * via Sentry but never block the calling request.
 *
 * Pass `request` so the helper can capture path + IP.
 */
export async function audit(
  request: NextRequest | null,
  entry: AuditEntry
): Promise<void> {
  try {
    const path = request?.nextUrl.pathname ?? null;
    const ip =
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request?.headers.get("x-real-ip") ??
      null;

    await prisma.auditLog.create({
      data: {
        module: entry.module,
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        summary: entry.summary ?? null,
        metadata: (entry.metadata as object | null) ?? undefined,
        path,
        ip,
      },
    });
  } catch (err) {
    reportError(err, {
      scope: "audit",
      tags: { module: entry.module, action: entry.action },
    });
  }
}
