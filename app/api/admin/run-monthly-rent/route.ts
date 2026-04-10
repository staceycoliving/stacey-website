import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// POST /api/admin/run-monthly-rent
// Manually triggers the monthly rent collection (same logic as the cron)
// Used for testing or to retry failed charges
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();

  // Manual button: only charge tenants who actually have payment method set up.
  // This avoids creating empty RentPayment records for legacy tenants without
  // Stripe customer setup. The real monthly cron processes ALL active tenants.
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { moveOut: null },
        { moveOut: { gt: monthStart } },
      ],
      moveIn: { lte: monthEnd },
      stripeCustomerId: { not: null },
      sepaMandateId: { not: null },
    },
  });

  let created = 0;
  let charged = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const tenant of tenants) {
    const existing = await prisma.rentPayment.findUnique({
      where: { tenantId_month: { tenantId: tenant.id, month: monthStart } },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const fullRent = tenant.monthlyRent;
    if (fullRent <= 0) {
      skipped++;
      continue;
    }

    // Pro-rata calculation
    const moveInDate = new Date(tenant.moveIn);
    const moveOutDate = tenant.moveOut ? new Date(tenant.moveOut) : null;
    let startDay = 1;
    let endDay = daysInMonth;
    if (moveInDate.getFullYear() === now.getFullYear() && moveInDate.getMonth() === now.getMonth()) {
      startDay = moveInDate.getDate();
    }
    if (moveOutDate && moveOutDate.getFullYear() === now.getFullYear() && moveOutDate.getMonth() === now.getMonth()) {
      endDay = moveOutDate.getDate();
    }
    const rentDays = endDay - startDay + 1;
    const amount = rentDays >= daysInMonth
      ? fullRent
      : Math.round(fullRent * rentDays / daysInMonth);

    const rentPayment = await prisma.rentPayment.create({
      data: {
        tenantId: tenant.id,
        month: monthStart,
        amount,
        status: "PENDING",
      },
    });
    created++;

    if (tenant.stripeCustomerId && tenant.sepaMandateId) {
      try {
        const pi = await stripe.paymentIntents.create({
          amount,
          currency: "eur",
          customer: tenant.stripeCustomerId,
          payment_method: tenant.sepaMandateId,
          off_session: true,
          confirm: true,
          metadata: {
            type: "long_stay_rent",
            tenantId: tenant.id,
            rentPaymentId: rentPayment.id,
            month: monthStart.toISOString(),
          },
        });

        await prisma.rentPayment.update({
          where: { id: rentPayment.id },
          data: {
            status: "PROCESSING",
            stripePaymentIntentId: pi.id,
          },
        });
        charged++;
      } catch (err: any) {
        await prisma.rentPayment.update({
          where: { id: rentPayment.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            failureReason: err.message,
          },
        });
        errors.push(`${tenant.firstName} ${tenant.lastName}: ${err.message}`);
      }
    }
  }

  return Response.json({
    month: monthStart.toISOString().split("T")[0],
    total: tenants.length,
    created,
    charged,
    skipped,
    errors,
  });
}
