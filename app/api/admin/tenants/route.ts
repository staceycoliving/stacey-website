import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reconcileMoveOutPayment } from "@/lib/rent-charge";

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, moveOut, notice } = await request.json();

  if (!tenantId) {
    return Response.json({ error: "tenantId required" }, { status: 400 });
  }

  const before = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { moveOut: true },
  });
  if (!before) return Response.json({ error: "Tenant not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (moveOut !== undefined) data.moveOut = moveOut ? new Date(moveOut) : null;
  if (notice !== undefined) data.notice = notice ? new Date(notice) : null;

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data,
  });

  // If the tenant has a moveOut set, run reconcile. It's idempotent: if
  // RentPayment.amount already matches the pro-rata for the current
  // moveOut, it does nothing. We do NOT refund here — the helper just
  // lowers RentPayment.amount so the overpayment surfaces as a credit in
  // the deposit settlement. Surfaces a warning if the tenant is
  // underpaid (needs manual charge).
  let reconcile: Awaited<ReturnType<typeof reconcileMoveOutPayment>> | null = null;
  if (tenant.moveOut) {
    reconcile = await reconcileMoveOutPayment(prisma, tenantId, "tenant_patch");
  }

  await audit(request, {
    module: "tenant",
    action: "update",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Updated ${tenant.firstName} ${tenant.lastName}${
      reconcile?.adjusted
        ? ` — €${(reconcile.overpaymentCents / 100).toFixed(2)} Mietüberzahlung gemerkt für Endabrechnung`
        : ""
    }`,
    metadata: {
      moveOut,
      notice,
      reconcile: reconcile ?? null,
    },
  });

  return Response.json({
    id: tenant.id,
    moveOut: tenant.moveOut,
    notice: tenant.notice,
    reconcile,
  });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { tenantId, reason, reasonNote } = body;

  if (!tenantId) {
    return Response.json({ error: "tenantId required" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string") {
    return Response.json(
      { error: "reason required for hard-delete (data cleanup audit)" },
      { status: 400 }
    );
  }

  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!t) return Response.json({ error: "Tenant not found" }, { status: 404 });

  await prisma.tenant.delete({ where: { id: tenantId } });

  const fullReason = reasonNote ? `${reason} — ${reasonNote.trim()}` : reason;

  await audit(request, {
    module: "tenant",
    action: "hard_delete",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Hard-deleted ${t.firstName} ${t.lastName} (${reason})`,
    metadata: { reason, reasonNote: reasonNote ?? null, fullReason },
  });

  return Response.json({ ok: true });
}
