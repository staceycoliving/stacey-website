import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/emails/[id]/preview
 *
 * Minimal metadata preview of a logged email. We don't store the rendered
 * HTML per email (would balloon DB size), so we return header info only ,
 * enough for the admin to know what was sent without reconstructing.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const entry = await prisma.sentEmail.findUnique({ where: { id } });
  if (!entry) {
    return Response.json({ error: "SentEmail not found" }, { status: 404 });
  }

  return Response.json({
    id: entry.id,
    templateKey: entry.templateKey,
    recipient: entry.recipient,
    subject: entry.subject,
    entityType: entry.entityType,
    entityId: entry.entityId,
    resendId: entry.resendId,
    status: entry.status,
    error: entry.error,
    triggeredBy: entry.triggeredBy,
    sentAt: entry.sentAt,
  });
}
