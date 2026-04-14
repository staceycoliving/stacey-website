import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; defectId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, defectId } = await ctx.params;
  await prisma.defect.delete({ where: { id: defectId } });

  // Recompute Tenant.damagesAmount
  const total = await prisma.defect.aggregate({
    where: { tenantId: id },
    _sum: { deductionAmount: true },
  });
  await prisma.tenant.update({
    where: { id },
    data: { damagesAmount: total._sum.deductionAmount ?? 0 },
  });

  return Response.json({ ok: true });
}
