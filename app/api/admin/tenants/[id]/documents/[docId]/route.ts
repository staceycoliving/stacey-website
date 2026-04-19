import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; docId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { docId } = await ctx.params;
  const doc = await prisma.tenantDocument.findUnique({ where: { id: docId } });
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.tenantDocument.delete({ where: { id: docId } });

  await audit(request, {
    module: "tenant",
    action: "document_deleted",
    entityType: "tenant",
    entityId: doc.tenantId,
    summary: `Deleted document "${doc.filename}"`,
    metadata: { documentId: docId, filename: doc.filename },
  });

  return Response.json({ ok: true });
}
