import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { rentPaymentId, action, amount, paidAt } = body;

  if (!rentPaymentId || !action) {
    return Response.json(
      { error: "rentPaymentId and action required" },
      { status: 400 }
    );
  }

  const rentPayment = await prisma.rentPayment.findUnique({
    where: { id: rentPaymentId },
  });
  if (!rentPayment) {
    return Response.json({ error: "RentPayment not found" }, { status: 404 });
  }

  if (action === "mark_paid") {
    // amount: explicit paid amount in cents. If omitted, mark full amount
    // as paid (one-click "pay in full"). If passed, can be partial
    // (< rentPayment.amount, status → PARTIAL) or over-payment
    // (> rentPayment.amount, status → PAID, excess recorded in paidAmount
    // for later deposit-settlement credit).
    const paidAmountCents =
      amount !== undefined && amount !== null
        ? Math.round(Number(amount))
        : rentPayment.amount;
    if (!Number.isFinite(paidAmountCents) || paidAmountCents < 0) {
      return Response.json({ error: "amount invalid" }, { status: 400 });
    }

    const paidAtDate = paidAt ? new Date(paidAt) : new Date();
    if (Number.isNaN(paidAtDate.getTime())) {
      return Response.json({ error: "paidAt invalid" }, { status: 400 });
    }

    const status = paidAmountCents >= rentPayment.amount ? "PAID" : "PARTIAL";

    const updated = await prisma.rentPayment.update({
      where: { id: rentPaymentId },
      data: {
        status,
        paidAmount: paidAmountCents,
        // Only set paidAt when fully paid, a partial payment is still
        // "open" from an accounting standpoint.
        paidAt: status === "PAID" ? paidAtDate : null,
      },
    });

    await audit(request, {
      module: "rent",
      action: status === "PAID" ? "mark_paid" : "mark_partial",
      entityType: "rentPayment",
      entityId: rentPaymentId,
      summary: `Marked ${status.toLowerCase()} · €${(paidAmountCents / 100).toFixed(2)}`,
      metadata: {
        tenantId: rentPayment.tenantId,
        month: rentPayment.month,
        amountCents: paidAmountCents,
        paidAt: paidAtDate,
      },
    });

    return Response.json(updated);
  }

  if (action === "adjust") {
    if (amount === undefined) {
      return Response.json({ error: "amount required for adjust" }, { status: 400 });
    }
    const adjCents = Math.round(Number(amount));
    if (!Number.isFinite(adjCents) || adjCents < 0) {
      return Response.json({ error: "amount invalid" }, { status: 400 });
    }
    const updated = await prisma.rentPayment.update({
      where: { id: rentPaymentId },
      data: {
        paidAmount: adjCents,
        status: adjCents >= rentPayment.amount ? "PAID" : "PARTIAL",
      },
    });
    return Response.json(updated);
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
