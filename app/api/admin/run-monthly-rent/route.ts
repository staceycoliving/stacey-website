import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { ensureRentPayment, chargeRentPayment } from "@/lib/rent-charge";

/**
 * POST /api/admin/run-monthly-rent
 *
 * Manually triggers the monthly rent collection for the current month.
 *
 * We always create RentPayment records for every active tenant (regardless
 * of payment method) so the rent roll is complete. Stripe charge is
 * attempted only for SEPA tenants with a valid mandate — BANK_TRANSFER
 * tenants are skipped and marked "bank-transfer" for the admin to tick off
 * manually once the money lands.
 *
 * Charge timing: we still respect the move-in-day rule — `chargeRentPayment`
 * skips with "skipped_too_early" if today is before the tenant's move-in.
 */
export async function POST() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [{ moveOut: null }, { moveOut: { gt: monthStart } }],
      moveIn: { lte: monthEnd },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      monthlyRent: true,
      moveIn: true,
      moveOut: true,
      stripeCustomerId: true,
      sepaMandateId: true,
      paymentMethod: true,
    },
  });

  let created = 0;
  let charged = 0;
  let skipped = 0;
  let skippedBankTransfer = 0;
  const errors: string[] = [];

  for (const tenant of tenants) {
    const rent = await ensureRentPayment(prisma, {
      tenantId: tenant.id,
      monthStart,
      monthEnd,
      moveIn: tenant.moveIn,
      moveOut: tenant.moveOut,
      fullRentCents: tenant.monthlyRent,
    });
    if (!rent) {
      skipped++;
      continue;
    }
    if (rent.status !== "PENDING") {
      // Already PROCESSING / PAID / FAILED — leave alone
      skipped++;
      continue;
    }
    created++;

    const result = await chargeRentPayment(prisma, {
      rentPayment: rent,
      tenant,
      triggerLabel: "manual_run",
    });
    if (result === "charged") charged++;
    if (result === "skipped_bank_transfer") skippedBankTransfer++;
    if (result === "failed")
      errors.push(`${tenant.firstName} ${tenant.lastName}: charge failed`);
  }

  return Response.json({
    month: monthStart.toISOString().slice(0, 7),
    total: tenants.length,
    created,
    charged,
    skipped,
    skippedBankTransfer,
    errors,
  });
}
