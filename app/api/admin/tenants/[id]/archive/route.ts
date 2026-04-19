import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * POST /api/admin/tenants/[id]/archive
 *   body: {} → archives
 * DELETE /api/admin/tenants/[id]/archive
 *   → unarchives (restore)
 *
 * Archive is soft-delete: sets `archivedAt` so the tenant still exists
 * in the DB (all historical data preserved) but filtered out of the
 * default tenant list. Recoverable.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  await audit(request, {
    module: "tenant",
    action: "archive",
    entityType: "tenant",
    entityId: id,
    summary: `Archived ${tenant.firstName} ${tenant.lastName}`,
  });

  return Response.json({ id: updated.id, archivedAt: updated.archivedAt });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: { archivedAt: null },
  });

  await audit(request, {
    module: "tenant",
    action: "unarchive",
    entityType: "tenant",
    entityId: id,
    summary: `Unarchived ${tenant.firstName} ${tenant.lastName}`,
  });

  return Response.json({ id: updated.id, archivedAt: null });
}
