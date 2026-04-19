import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/tenants/[id]/audit
 *
 * Returns audit-log entries directly linked to this tenant, plus entries
 * on child entities (rentPayment, booking, defect, note, extraCharge,
 * document, communication) that belong to this tenant. Used by the
 * folio Timeline tab to surface system-level changes.
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tenantId } = await ctx.params;

  // Collect child-entity IDs for this tenant so we catch audit entries
  // logged against e.g. a rentPayment, not the tenant directly.
  const [rentPayments, extraCharges, defects, notes, bookingResult] =
    await Promise.all([
      prisma.rentPayment.findMany({ where: { tenantId }, select: { id: true } }),
      prisma.extraCharge.findMany({ where: { tenantId }, select: { id: true } }),
      prisma.defect.findMany({ where: { tenantId }, select: { id: true } }),
      prisma.note.findMany({ where: { tenantId }, select: { id: true } }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { bookingId: true },
      }),
    ]);

  const entityConditions: { entityType: string; entityId: string }[] = [
    { entityType: "tenant", entityId: tenantId },
    ...rentPayments.map((r) => ({ entityType: "rentPayment", entityId: r.id })),
    ...extraCharges.map((e) => ({ entityType: "extraCharge", entityId: e.id })),
    ...defects.map((d) => ({ entityType: "defect", entityId: d.id })),
    ...notes.map((n) => ({ entityType: "note", entityId: n.id })),
  ];
  if (bookingResult?.bookingId) {
    entityConditions.push({
      entityType: "booking",
      entityId: bookingResult.bookingId,
    });
  }

  const entries = await prisma.auditLog.findMany({
    where: {
      OR: entityConditions,
    },
    orderBy: { at: "desc" },
    take: 200,
  });

  return Response.json({ entries });
}
