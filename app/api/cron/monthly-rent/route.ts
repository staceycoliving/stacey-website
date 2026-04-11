import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { reportError } from "@/lib/observability";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Current month (1st of the month, 00:00:00)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Find all active tenants who live here this month
  // Include tenants who moved in during this month (anteilig)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { moveOut: null },
        { moveOut: { gt: monthStart } },
      ],
      moveIn: { lte: monthEnd }, // Moved in by end of this month
    },
  });

  let created = 0;
  let charged = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    // Check if RentPayment already exists for this month (idempotent)
    const existing = await prisma.rentPayment.findUnique({
      where: {
        tenantId_month: {
          tenantId: tenant.id,
          month: monthStart,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const fullRent = tenant.monthlyRent;
    if (fullRent <= 0) {
      console.warn(`Tenant ${tenant.id} (${tenant.firstName} ${tenant.lastName}) has no rent set`);
      skipped++;
      continue;
    }

    // Calculate pro-rata amount
    const moveInDate = new Date(tenant.moveIn);
    const moveOutDate = tenant.moveOut ? new Date(tenant.moveOut) : null;

    let startDay = 1; // default: full month
    let endDay = daysInMonth;

    // Move-in month: charge from move-in day
    if (moveInDate.getFullYear() === now.getFullYear() && moveInDate.getMonth() === now.getMonth()) {
      startDay = moveInDate.getDate();
    }

    // Move-out month: charge until move-out day
    if (moveOutDate && moveOutDate.getFullYear() === now.getFullYear() && moveOutDate.getMonth() === now.getMonth()) {
      endDay = moveOutDate.getDate();
    }

    const rentDays = endDay - startDay + 1;
    const amount = rentDays >= daysInMonth
      ? fullRent
      : Math.round(fullRent * rentDays / daysInMonth);

    // Create RentPayment record
    const rentPayment = await prisma.rentPayment.create({
      data: {
        tenantId: tenant.id,
        month: monthStart,
        amount,
        status: "PENDING",
      },
    });
    created++;

    // If payment method is set up, charge automatically (off-session)
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
        reportError(err, {
          scope: "cron-monthly-rent",
          tags: {
            tenantId: tenant.id,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            rentPaymentId: rentPayment.id,
            amount,
          },
        });
        await prisma.rentPayment.update({
          where: { id: rentPayment.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            failureReason: err.message,
          },
        });
      }
    }
    // Tenants without SEPA stay as PENDING (manual follow-up)
  }

  return Response.json({
    message: `Monthly rent: ${created} created, ${charged} SEPA charged, ${skipped} skipped`,
    created,
    charged,
    skipped,
    total: tenants.length,
  });
}
