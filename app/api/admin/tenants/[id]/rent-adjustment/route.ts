import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/tenants/[id]/rent-adjustment
 *
 * Either a one-off (month set, isPermanent=false) or a permanent change
 * (isPermanent=true → Tenant.monthlyRent is updated as well, takes effect
 * on the next rent cron run).
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { adjustedAmount, reason, isPermanent, month, validFrom } =
    await request.json();

  const adjustedCents = Math.round(Number(adjustedAmount));
  if (!Number.isFinite(adjustedCents) || adjustedCents <= 0) {
    return Response.json({ error: "adjustedAmount must be positive integer cents" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string") {
    return Response.json({ error: "reason required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return Response.json({ error: "Tenant not found" }, { status: 404 });

  const originalAmount = tenant.monthlyRent;

  await prisma.$transaction(async (tx: any) => {
    await tx.rentAdjustment.create({
      data: {
        tenantId: id,
        month: !isPermanent && month ? new Date(month) : null,
        originalAmount,
        adjustedAmount: adjustedCents,
        reason: reason.trim(),
        isPermanent: Boolean(isPermanent),
        validFrom: isPermanent && validFrom ? new Date(validFrom) : null,
      },
    });

    if (isPermanent) {
      await tx.tenant.update({
        where: { id },
        data: { monthlyRent: adjustedCents },
      });
    } else if (month) {
      // Best-effort: if a pending rent payment exists for that month, adjust it
      const monthStart = new Date(month);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      await tx.rentPayment.updateMany({
        where: {
          tenantId: id,
          month: monthStart,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: { amount: adjustedCents },
      });
    }
  });

  return Response.json({ ok: true });
}
