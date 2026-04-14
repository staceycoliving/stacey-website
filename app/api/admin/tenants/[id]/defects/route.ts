import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { description, deductionAmount, photos } = await request.json();

  if (!description || typeof description !== "string") {
    return Response.json({ error: "description required" }, { status: 400 });
  }
  const deduction = Math.round(Number(deductionAmount));
  if (!Number.isFinite(deduction) || deduction < 0) {
    return Response.json({ error: "deductionAmount invalid" }, { status: 400 });
  }

  const defect = await prisma.defect.create({
    data: {
      tenantId: id,
      description: description.trim(),
      deductionAmount: deduction,
      photos: Array.isArray(photos) ? photos : [],
    },
  });

  // Keep Tenant.damagesAmount in sync (running total)
  const total = await prisma.defect.aggregate({
    where: { tenantId: id },
    _sum: { deductionAmount: true },
  });
  await prisma.tenant.update({
    where: { id },
    data: { damagesAmount: total._sum.deductionAmount ?? 0 },
  });

  return Response.json({ id: defect.id });
}
