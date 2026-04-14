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
 *  - calculate_refund   — recompute deposit – defects – open rent – open extras
 *  - send_settlement    — send settlement email (does NOT mark as transferred)
 *  - mark_transferred   — set depositStatus = RETURNED + depositReturnedAt
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
      rentPayments: {
        where: { status: { in: ["PENDING", "FAILED", "PARTIAL"] } },
      },
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

  // ─── calculate_refund ─────────────────────────────────────
  if (action === "calculate_refund") {
    const arrearsAmount = tenant.rentPayments.reduce(
      (sum, rp) => sum + (rp.amount - rp.paidAmount),
      0
    );
    const extrasAmount = tenant.extraCharges.reduce((sum, c) => sum + c.amount, 0);
    const defectsAmount = tenant.defects.reduce(
      (sum, d) => sum + d.deductionAmount,
      0
    );
    const deposit = tenant.depositAmount ?? 0;
    const refund = Math.max(0, deposit - defectsAmount - arrearsAmount - extrasAmount);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        damagesAmount: defectsAmount, // keep tenant.damagesAmount in sync
        arrearsAmount: arrearsAmount + extrasAmount,
        depositRefundAmount: refund,
      },
    });

    return Response.json({
      depositAmount: deposit,
      damagesAmount: defectsAmount,
      arrearsAmount,
      extrasAmount,
      refundAmount: refund,
    });
  }

  // ─── send_settlement ──────────────────────────────────────
  if (action === "send_settlement") {
    if (!tenant.depositRefundIban) {
      return Response.json({ error: "Set IBAN first" }, { status: 400 });
    }

    // Recompute totals so the email is always consistent
    const arrearsAmount = tenant.rentPayments.reduce(
      (sum, rp) => sum + (rp.amount - rp.paidAmount),
      0
    );
    const extrasAmount = tenant.extraCharges.reduce((sum, c) => sum + c.amount, 0);
    const defectsAmount = tenant.defects.reduce(
      (sum, d) => sum + d.deductionAmount,
      0
    );
    const deposit = tenant.depositAmount ?? 0;
    const refund = Math.max(0, deposit - defectsAmount - arrearsAmount - extrasAmount);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        damagesAmount: defectsAmount,
        arrearsAmount: arrearsAmount + extrasAmount,
        depositRefundAmount: refund,
      },
    });

    try {
      await sendDepositReturnNotification({
        firstName: tenant.firstName,
        email: tenant.email,
        locationName: tenant.room.apartment.location.name,
        depositAmount: deposit,
        damagesAmount: defectsAmount,
        arrearsAmount: arrearsAmount + extrasAmount,
        refundAmount: refund,
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
      metadata: { refundAmount: refund, iban: tenant.depositRefundIban },
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
