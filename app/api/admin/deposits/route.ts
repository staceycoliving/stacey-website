import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { sendDepositReturnNotification } from "@/lib/email";
import { audit } from "@/lib/audit";

/**
 * PATCH /api/admin/deposits
 *
 * Actions:
 *  - set_iban           — store IBAN for refund transfer
 *  - calculate_refund   — recompute deposit + overpayment – defects – open rent – open extras
 *  - send_settlement    — send settlement email (does NOT mark as transferred)
 *  - mark_transferred   — set depositStatus = RETURNED + depositReturnedAt
 *
 * Overpayment: aggregated across all PAID rent payments where paidAmount > amount.
 * Source is the moveOut reconcile that lowers RentPayment.amount (e.g. tenant
 * shortened stay after the cron already collected the full month).
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, action, iban } = await request.json();

  if (!tenantId || !action) {
    return Response.json({ error: "tenantId and action required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      rentPayments: true, // need both unpaid (arrears) and PAID (for overpayment)
      extraCharges: { where: { paidAt: null } },
      defects: true,
      room: { include: { apartment: { include: { location: true } } } },
    },
  });

  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  // ─── set_iban ─────────────────────────────────────────────
  if (action === "set_iban") {
    if (!iban) {
      return Response.json({ error: "iban required" }, { status: 400 });
    }
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { depositRefundIban: String(iban).trim() },
    });
    return Response.json({ id: updated.id, depositRefundIban: updated.depositRefundIban });
  }

  // Aggregate the same totals for both calculate_refund and send_settlement —
  // refund = max(0, deposit + overpayment + discounts − defects − arrears − charges).
  // Adjustments with chargeOn=NEXT_RENT are ignored here (they flow through
  // the monthly SEPA instead); only DEPOSIT_SETTLEMENT entries count.
  function computeTotals() {
    const unpaidRows = tenant!.rentPayments.filter((rp) =>
      ["PENDING", "FAILED", "PARTIAL"].includes(rp.status)
    );
    const arrearsAmount = unpaidRows.reduce(
      (sum, rp) => sum + Math.max(0, rp.amount - rp.paidAmount),
      0
    );
    const overpaymentAmount = tenant!.rentPayments
      .filter((rp) => rp.status === "PAID")
      .reduce((sum, rp) => sum + Math.max(0, rp.paidAmount - rp.amount), 0);
    const depositBoundAdj = tenant!.extraCharges.filter(
      (c) => c.chargeOn === "DEPOSIT_SETTLEMENT"
    );
    const chargesAmount = depositBoundAdj
      .filter((c) => c.type === "CHARGE")
      .reduce((sum, c) => sum + c.amount, 0);
    const discountsAmount = depositBoundAdj
      .filter((c) => c.type === "DISCOUNT")
      .reduce((sum, c) => sum + c.amount, 0);
    const defectsAmount = tenant!.defects.reduce(
      (sum, d) => sum + d.deductionAmount,
      0
    );
    const deposit = tenant!.depositAmount ?? 0;
    const refund = Math.max(
      0,
      deposit +
        overpaymentAmount +
        discountsAmount -
        defectsAmount -
        arrearsAmount -
        chargesAmount
    );
    return {
      deposit,
      defectsAmount,
      arrearsAmount,
      chargesAmount,
      discountsAmount,
      overpaymentAmount,
      refund,
    };
  }

  // ─── calculate_refund ─────────────────────────────────────
  if (action === "calculate_refund") {
    const t = computeTotals();

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        damagesAmount: t.defectsAmount, // keep tenant.damagesAmount in sync
        arrearsAmount: t.arrearsAmount + t.chargesAmount,
        rentOverpaymentAmount: t.overpaymentAmount,
        depositRefundAmount: t.refund,
      },
    });

    return Response.json({
      depositAmount: t.deposit,
      damagesAmount: t.defectsAmount,
      arrearsAmount: t.arrearsAmount,
      chargesAmount: t.chargesAmount,
      discountsAmount: t.discountsAmount,
      overpaymentAmount: t.overpaymentAmount,
      refundAmount: t.refund,
    });
  }

  // ─── send_settlement ──────────────────────────────────────
  if (action === "send_settlement") {
    if (!tenant.depositRefundIban) {
      return Response.json({ error: "Set IBAN first" }, { status: 400 });
    }

    const t = computeTotals();

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        damagesAmount: t.defectsAmount,
        arrearsAmount: t.arrearsAmount + t.chargesAmount,
        rentOverpaymentAmount: t.overpaymentAmount,
        depositRefundAmount: t.refund,
      },
    });

    try {
      await sendDepositReturnNotification({
        firstName: tenant.firstName,
        email: tenant.email,
        locationName: tenant.room!.apartment.location.name,
        depositAmount: t.deposit,
        damagesAmount: t.defectsAmount,
        arrearsAmount: t.arrearsAmount + t.chargesAmount,
        overpaymentAmount: t.overpaymentAmount + t.discountsAmount,
        refundAmount: t.refund,
        iban: tenant.depositRefundIban,
      });
    } catch (err) {
      return Response.json(
        { error: "Email send failed", details: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }

    await audit(request, {
      module: "deposit",
      action: "send_settlement",
      entityType: "tenant",
      entityId: tenantId,
      summary: `Sent settlement email to ${tenant.firstName} ${tenant.lastName}`,
      metadata: {
        refundAmount: t.refund,
        overpaymentAmount: t.overpaymentAmount,
        discountsAmount: t.discountsAmount,
        chargesAmount: t.chargesAmount,
        iban: tenant.depositRefundIban,
      },
    });

    return Response.json({ ok: true, sentTo: tenant.email });
  }

  // ─── mark_transferred ─────────────────────────────────────
  if (action === "mark_transferred") {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        depositStatus: "RETURNED",
        depositReturnedAt: new Date(),
      },
    });

    await audit(request, {
      module: "deposit",
      action: "mark_transferred",
      entityType: "tenant",
      entityId: tenantId,
      summary: `Marked deposit transferred for ${tenant.firstName} ${tenant.lastName}`,
      metadata: {
        refundAmount: tenant.depositRefundAmount,
        iban: tenant.depositRefundIban,
      },
    });

    return Response.json({ id: updated.id, depositStatus: updated.depositStatus });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
