import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, action, damagesAmount, iban } = await request.json();

  if (!tenantId || !action) {
    return Response.json({ error: "tenantId and action required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      rentPayments: {
        where: { status: { in: ["PENDING", "FAILED"] } },
      },
    },
  });

  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (action === "set_damages") {
    if (damagesAmount === undefined) {
      return Response.json({ error: "damagesAmount required" }, { status: 400 });
    }
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { damagesAmount: Math.round(damagesAmount) },
    });
    return Response.json({ id: updated.id, damagesAmount: updated.damagesAmount });
  }

  if (action === "calculate_refund") {
    // Sum unpaid rent
    const arrearsAmount = tenant.rentPayments.reduce(
      (sum: number, rp: { amount: number; paidAmount: number }) => sum + (rp.amount - rp.paidAmount),
      0
    );
    const deposit = tenant.depositAmount || 0;
    const damages = tenant.damagesAmount || 0;
    const refund = Math.max(0, deposit - damages - arrearsAmount);

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        arrearsAmount,
        depositRefundAmount: refund,
      },
    });

    return Response.json({
      depositAmount: deposit,
      damagesAmount: damages,
      arrearsAmount,
      refundAmount: refund,
    });
  }

  if (action === "set_iban") {
    if (!iban) {
      return Response.json({ error: "iban required" }, { status: 400 });
    }
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { depositRefundIban: iban },
    });
    return Response.json({ id: updated.id, depositRefundIban: updated.depositRefundIban });
  }

  if (action === "mark_transferred") {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        depositStatus: "RETURNED",
        depositReturnedAt: new Date(),
      },
    });
    return Response.json({ id: updated.id, depositStatus: updated.depositStatus });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
