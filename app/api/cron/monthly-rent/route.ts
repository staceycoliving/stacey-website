import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Current month (1st of the month, 00:00:00)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Find all active tenants (no moveOut or moveOut > this month)
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { moveOut: null },
        { moveOut: { gt: monthStart } },
      ],
      moveIn: { lte: monthStart }, // Only tenants who have already moved in
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

    const amount = tenant.monthlyRent;
    if (amount <= 0) {
      console.warn(`Tenant ${tenant.id} (${tenant.firstName} ${tenant.lastName}) has no rent set`);
      skipped++;
      continue;
    }

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

    // If SEPA is set up, charge automatically
    if (tenant.stripeCustomerId && tenant.sepaMandateId) {
      try {
        const pi = await stripe.paymentIntents.create({
          amount,
          currency: "eur",
          customer: tenant.stripeCustomerId,
          payment_method: tenant.sepaMandateId,
          payment_method_types: ["sepa_debit"],
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
        console.error(`SEPA charge failed for tenant ${tenant.id}:`, err.message);
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
