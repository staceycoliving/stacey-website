import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { chargeRentPayment } from "@/lib/rent-charge";

/**
 * POST /api/admin/rent-payments/[id]/retry
 *
 * Retries a FAILED (or PENDING) rent charge via the shared
 * chargeRentPayment helper. Re-bundles any open NEXT_RENT adjustments
 * (same behavior as the monthly cron). Returns a short summary for the
 * UI toast.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rent = await prisma.rentPayment.findUnique({
    where: { id },
    include: { tenant: true },
  });
  if (!rent) {
    return Response.json({ error: "RentPayment not found" }, { status: 404 });
  }
  // Only allow retry on FAILED (re-attempt) or PENDING (late fire). Skip
  // PROCESSING/PAID to avoid double-charging.
  if (!["FAILED", "PENDING", "PARTIAL"].includes(rent.status)) {
    return Response.json(
      { error: `Cannot retry a ${rent.status} rent payment` },
      { status: 409 }
    );
  }
  // Bank-transfer tenants can't be auto-retried — admin marks them paid
  // after seeing the bank statement.
  if (rent.tenant.paymentMethod === "BANK_TRANSFER") {
    return Response.json(
      {
        ok: false,
        result: "skipped_bank_transfer",
        message:
          "Mieter zahlt per Überweisung — nach Zahlungseingang manuell auf Paid setzen.",
      },
      { status: 400 }
    );
  }

  // Flip back to PENDING so chargeRentPayment doesn't think it's in flight.
  if (rent.status !== "PENDING") {
    await prisma.rentPayment.update({
      where: { id },
      data: { status: "PENDING" },
    });
  }

  const result = await chargeRentPayment(prisma, {
    rentPayment: { ...rent, status: "PENDING" },
    tenant: rent.tenant,
    triggerLabel: "admin_retry",
  });

  const message =
    result === "charged"
      ? `Retry ausgelöst — Stripe PaymentIntent erstellt (${rent.tenant.firstName} ${rent.tenant.lastName}).`
      : result === "skipped_no_sepa"
        ? "Skipped: Mieter hat keine Zahlungsmethode hinterlegt."
        : result === "skipped_too_early"
          ? "Skipped: Miete noch nicht fällig (vor Move-in)."
          : "Retry fehlgeschlagen. Stripe-Logs prüfen.";

  await audit(request, {
    module: "rent",
    action: "retry_charge",
    entityType: "rentPayment",
    entityId: id,
    summary: `Retry ${result} for ${rent.tenant.firstName} ${rent.tenant.lastName} (${rent.month.toISOString().slice(0, 7)})`,
    metadata: { result, tenantId: rent.tenantId, month: rent.month },
  });

  return Response.json({ ok: result === "charged", result, message });
}
