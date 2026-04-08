import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

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

  await prisma.tenant.delete({ where: { id: tenantId } });

  return Response.json({ ok: true });
}
