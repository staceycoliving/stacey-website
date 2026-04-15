import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { ensureRentPayment, chargeRentPayment } from "@/lib/rent-charge";

/**
 * POST /api/admin/run-monthly-rent
 *
 * Manually triggers the monthly rent collection for the current month.
 * Same logic as the cron, but only for tenants with a SEPA mandate set up
 * (skip legacy tenants without Stripe customer).
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
      stripeCustomerId: { not: null },
      sepaMandateId: { not: null },
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
    },
  });

  let created = 0;
  let charged = 0;
  let skipped = 0;
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
    if (result === "failed")
      errors.push(`${tenant.firstName} ${tenant.lastName}: charge failed`);
  }

  return Response.json({
    month: monthStart.toISOString().slice(0, 7),
    total: tenants.length,
    created,
    charged,
    skipped,
    errors,
  });
}
