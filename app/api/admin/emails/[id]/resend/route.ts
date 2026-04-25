import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/emails/[id]/resend
 *
 * Takes an existing SentEmail log entry and re-fires the same template
 * against the same tenant. Thin wrapper that delegates to
 * POST /api/admin/emails/resend so we have one code path for all resends.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const logEntry = await prisma.sentEmail.findUnique({ where: { id } });
  if (!logEntry) {
    return Response.json({ error: "SentEmail not found" }, { status: 404 });
  }

  // We only support resending tenant-linked emails. Booking-only logs
  // (pre-deposit bookings) or team notifications have no tenantId to
  // re-run the template against.
  if (logEntry.entityType !== "tenant" || !logEntry.entityId) {
    // Fall back to trying to match by recipient email, for legacy rows
    // without entityId linkage.
    const tenant = await prisma.tenant.findFirst({
      where: { email: logEntry.recipient },
    });
    if (!tenant) {
      return Response.json(
        {
          error:
            "This email is not linked to a tenant and no tenant matches the recipient, resend from the tenant folio or Quick Send.",
        },
        { status: 400 }
      );
    }
    logEntry.entityType = "tenant";
    logEntry.entityId = tenant.id;
  }

  // Delegate to the main resend endpoint.
  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}/api/admin/emails/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward auth cookie so the downstream call is authenticated
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      templateKey: logEntry.templateKey,
      tenantId: logEntry.entityId,
    }),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    return Response.json(
      { error: body.error ?? "Resend failed" },
      { status: res.status }
    );
  }

  await audit(request, {
    module: "email",
    action: "resend_from_log",
    entityType: "sentEmail",
    entityId: id,
    summary: `Resent ${logEntry.templateKey} to ${logEntry.recipient} (from log ${id})`,
    metadata: {
      templateKey: logEntry.templateKey,
      originalSentAt: logEntry.sentAt,
      tenantId: logEntry.entityId,
    },
  });

  return Response.json({ ok: true, sentTo: body.sentTo });
}
