import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, moveOut, notice } = await request.json();

  if (!tenantId) {
    return Response.json({ error: "tenantId required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (moveOut !== undefined) data.moveOut = moveOut ? new Date(moveOut) : null;
  if (notice !== undefined) data.notice = notice ? new Date(notice) : null;

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data,
  });

  await audit(request, {
    module: "tenant",
    action: "update",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Updated ${tenant.firstName} ${tenant.lastName}`,
    metadata: { moveOut, notice },
  });

  return Response.json({ id: tenant.id, moveOut: tenant.moveOut, notice: tenant.notice });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await request.json();

  if (!tenantId) {
    return Response.json({ error: "tenantId required" }, { status: 400 });
  }

  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });

  await audit(request, {
    module: "tenant",
    action: "delete",
    entityType: "tenant",
    entityId: tenantId,
    summary: t ? `Deleted ${t.firstName} ${t.lastName}` : `Deleted tenant ${tenantId}`,
  });

  return Response.json({ ok: true });
}
