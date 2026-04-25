import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  ensureRentPayment,
  chargeRentPayment,
} from "@/lib/rent-charge";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Find all active tenants who live here this month.
  // Include tenants who moved in during this month (anteilig), even if
  // their move-in is later this month, we create the record now and the
  // daily cron will charge it on the actual move-in day.
  //
  // BANK_TRANSFER tenants get a RentPayment record too (admin marks them
  // paid manually after bank-statement check).
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

  for (const tenant of tenants) {
    if (tenant.monthlyRent <= 0) {
      skipped++;
      continue;
    }

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
      // Already processed in a previous run (PROCESSING / PAID / FAILED)
      skipped++;
      continue;
    }
    created++;

    const result = await chargeRentPayment(prisma, {
      rentPayment: rent,
      tenant,
      triggerLabel: "monthly_cron",
    });
    if (result === "charged") charged++;
    if (result === "skipped_bank_transfer") skippedBankTransfer++;
  }

  return Response.json({
    message: `Monthly rent: ${created} new records, ${charged} SEPA charged, ${skippedBankTransfer} bank-transfer pending, ${skipped} skipped`,
    created,
    charged,
    skipped,
    skippedBankTransfer,
    total: tenants.length,
  });
}
