import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { calculateProRataRent } from "@/lib/rent-charge";

/**
 * GET /api/admin/finance/preview-rent
 *
 * Dry-run of run-monthly-rent: returns the list of tenants who would be
 * included in the next collection pass for the current month, with their
 * pro-rata amount, mandate status, and existing RentPayment status (so the
 * admin can review before actually firing the run).
 */
export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // All tenants who overlap with the current month. We include those
  // without SEPA too, so the admin sees they'd be skipped and why.
  const tenants = await prisma.tenant.findMany({
    where: {
      moveIn: { lte: monthEnd },
      OR: [{ moveOut: null }, { moveOut: { gt: monthStart } }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      monthlyRent: true,
      moveIn: true,
      moveOut: true,
      stripeCustomerId: true,
      sepaMandateId: true,
      paymentMethod: true,
      room: {
        select: {
          roomNumber: true,
          apartment: { select: { location: { select: { name: true } } } },
        },
      },
    },
  });

  // Existing RentPayments for this month — so we show who's already been
  // created/charged.
  const existing = await prisma.rentPayment.findMany({
    where: { month: { gte: monthStart, lt: nextMonthStart } },
    select: {
      tenantId: true,
      status: true,
      amount: true,
      paidAmount: true,
    },
  });
  const existingByTenant = new Map(existing.map((e) => [e.tenantId, e]));

  // NEXT_RENT adjustments that would be bundled into the charge (un-paid).
  const adjustments = await prisma.extraCharge.findMany({
    where: {
      chargeOn: "NEXT_RENT",
      paidAt: null,
      tenantId: { in: tenants.map((t) => t.id) },
    },
    select: { tenantId: true, amount: true, type: true },
  });
  const adjByTenant = new Map<string, number>();
  for (const a of adjustments) {
    const signed = a.type === "DISCOUNT" ? -a.amount : a.amount;
    adjByTenant.set(a.tenantId, (adjByTenant.get(a.tenantId) ?? 0) + signed);
  }

  type Row = {
    tenantId: string;
    name: string;
    location: string;
    room: string;
    baseRent: number;
    adjustment: number;
    total: number;
    paymentMethod: "SEPA" | "BANK_TRANSFER";
    status:
      | "will_charge"
      | "bank_transfer"
      | "skipped_no_sepa"
      | "skipped_before_move_in"
      | "already_paid"
      | "already_processing"
      | "already_failed";
    reason: string;
  };

  const rows: Row[] = tenants.map((t) => {
    const base = calculateProRataRent({
      fullRentCents: t.monthlyRent,
      monthStart,
      monthEnd,
      moveIn: new Date(t.moveIn),
      moveOut: t.moveOut ? new Date(t.moveOut) : null,
    });
    const adj = adjByTenant.get(t.id) ?? 0;
    const total = base + adj;
    const e = existingByTenant.get(t.id);
    let status: Row["status"];
    let reason: string;

    if (e) {
      if (e.status === "PAID") {
        status = "already_paid";
        reason = "bereits bezahlt";
      } else if (e.status === "PROCESSING") {
        status = "already_processing";
        reason = "läuft gerade";
      } else if (e.status === "FAILED") {
        status = "already_failed";
        reason = "fehlgeschlagen — Retry nötig";
      } else if (t.paymentMethod === "BANK_TRANSFER") {
        // RentPayment exists, status PENDING, tenant pays by bank transfer
        status = "bank_transfer";
        reason = "zahlt per Überweisung — manuell markieren";
      } else {
        // SEPA, PENDING / PARTIAL
        status = !t.sepaMandateId
          ? "skipped_no_sepa"
          : new Date(t.moveIn) > now
            ? "skipped_before_move_in"
            : "will_charge";
        reason =
          status === "skipped_no_sepa"
            ? "keine Zahlungsmethode"
            : status === "skipped_before_move_in"
              ? "Move-in in der Zukunft"
              : "wird eingezogen";
      }
    } else {
      if (t.paymentMethod === "BANK_TRANSFER") {
        status = "bank_transfer";
        reason = "zahlt per Überweisung — Record wird erstellt, manuell markieren";
      } else if (!t.sepaMandateId) {
        status = "skipped_no_sepa";
        reason = "keine Zahlungsmethode";
      } else if (new Date(t.moveIn) > now) {
        status = "skipped_before_move_in";
        reason = "Move-in in der Zukunft";
      } else {
        status = "will_charge";
        reason = "wird neu erstellt + eingezogen";
      }
    }

    return {
      tenantId: t.id,
      name: `${t.firstName} ${t.lastName}`,
      location: t.room?.apartment.location.name ?? "—",
      room: t.room?.roomNumber ?? "—",
      baseRent: base,
      adjustment: adj,
      total,
      paymentMethod: t.paymentMethod,
      status,
      reason,
    };
  });

  // Order: will_charge first, then problematic, then done
  const ORDER: Record<Row["status"], number> = {
    will_charge: 0,
    already_failed: 1,
    skipped_no_sepa: 2,
    skipped_before_move_in: 3,
    bank_transfer: 4,
    already_processing: 5,
    already_paid: 6,
  };
  rows.sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name)
  );

  const summary = {
    willCharge: rows.filter((r) => r.status === "will_charge").length,
    willChargeTotal: rows
      .filter((r) => r.status === "will_charge")
      .reduce((s, r) => s + r.total, 0),
    bankTransfer: rows.filter((r) => r.status === "bank_transfer").length,
    bankTransferTotal: rows
      .filter((r) => r.status === "bank_transfer")
      .reduce((s, r) => s + r.total, 0),
    skippedNoSepa: rows.filter((r) => r.status === "skipped_no_sepa").length,
    skippedBeforeMoveIn: rows.filter(
      (r) => r.status === "skipped_before_move_in"
    ).length,
    alreadyPaid: rows.filter((r) => r.status === "already_paid").length,
    alreadyProcessing: rows.filter((r) => r.status === "already_processing")
      .length,
    alreadyFailed: rows.filter((r) => r.status === "already_failed").length,
  };

  return Response.json({
    month: monthStart.toISOString().slice(0, 7),
    summary,
    rows,
  });
}
