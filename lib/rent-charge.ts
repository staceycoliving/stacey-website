import "server-only";
import { stripe } from "./stripe";
import { reportError, logEvent } from "./observability";
import type { Prisma, PrismaClient, RentPayment, Tenant } from "./generated/prisma/client";

/**
 * Helpers for monthly rent: pro-rata calculation, when-to-charge logic,
 * idempotent RentPayment creation, and the actual Stripe charge call.
 *
 * Centralised so the cron, the post-deposit hook, and the post-SEPA-setup
 * hook all behave the same way.
 *
 * Charge timing rule: the first month's rent is **never charged before the
 * tenant's move-in date**, even if SEPA was set up earlier. After move-in
 * day, charges run as soon as a SEPA mandate exists.
 */

/** Pro-rata rent for the portion of a month a tenant occupies the room.
 *  Uses actual days in the month (matches how we handle Widerruf pro-rata).
 *  Always returns a positive integer in cents (or the full rent if the
 *  tenant covers the whole month). */
export function calculateProRataRent(args: {
  fullRentCents: number;
  monthStart: Date;
  monthEnd: Date;
  moveIn: Date;
  moveOut: Date | null;
}): number {
  if (args.fullRentCents <= 0) return 0;

  const daysInMonth = args.monthEnd.getDate();

  let startDay = 1;
  if (
    args.moveIn.getFullYear() === args.monthStart.getFullYear() &&
    args.moveIn.getMonth() === args.monthStart.getMonth()
  ) {
    startDay = args.moveIn.getDate();
  }

  let endDay = daysInMonth;
  if (
    args.moveOut &&
    args.moveOut.getFullYear() === args.monthStart.getFullYear() &&
    args.moveOut.getMonth() === args.monthStart.getMonth()
  ) {
    endDay = args.moveOut.getDate();
  }

  const rentDays = endDay - startDay + 1;
  if (rentDays >= daysInMonth) return args.fullRentCents;
  return Math.round((args.fullRentCents * rentDays) / daysInMonth);
}

/** Should this RentPayment be charged today?
 *  True iff today is on/after both:
 *    - the start of the rent month, AND
 *    - the tenant's move-in date
 *  (Last condition stops us charging the first month's rent before the
 *  tenant has actually moved in.) */
export function isChargeableNow(args: {
  rentPaymentMonth: Date;
  moveIn: Date;
  today?: Date;
}): boolean {
  const today = args.today ?? new Date();
  today.setHours(0, 0, 0, 0);
  const month = new Date(args.rentPaymentMonth);
  month.setHours(0, 0, 0, 0);
  const moveIn = new Date(args.moveIn);
  moveIn.setHours(0, 0, 0, 0);
  return today >= month && today >= moveIn;
}

/** Idempotent: create the RentPayment for (tenantId, monthStart) if it
 *  doesn't exist yet. Returns the existing or new record.
 *  Status is always PENDING; the caller decides whether to charge. */
export async function ensureRentPayment(
  tx: Prisma.TransactionClient | PrismaClient,
  args: {
    tenantId: string;
    monthStart: Date;
    monthEnd: Date;
    moveIn: Date;
    moveOut: Date | null;
    fullRentCents: number;
  }
): Promise<RentPayment | null> {
  if (args.fullRentCents <= 0) return null;

  const existing = await tx.rentPayment.findUnique({
    where: { tenantId_month: { tenantId: args.tenantId, month: args.monthStart } },
  });
  if (existing) return existing;

  const amount = calculateProRataRent({
    fullRentCents: args.fullRentCents,
    monthStart: args.monthStart,
    monthEnd: args.monthEnd,
    moveIn: args.moveIn,
    moveOut: args.moveOut,
  });

  return tx.rentPayment.create({
    data: {
      tenantId: args.tenantId,
      month: args.monthStart,
      amount,
      status: "PENDING",
    },
  });
}

/** Charge a single PENDING/FAILED RentPayment via Stripe (off-session SEPA).
 *  Updates the record on success/failure. No-op if the tenant has no SEPA
 *  mandate yet or the rent is not yet chargeable today. */
export async function chargeRentPayment(
  prisma: PrismaClient,
  args: {
    rentPayment: RentPayment;
    tenant: Pick<
      Tenant,
      "id" | "firstName" | "lastName" | "stripeCustomerId" | "sepaMandateId" | "moveIn"
    >;
    /** Optional metadata key for tracing the charge origin (cron / webhook / setup). */
    triggerLabel: string;
  }
): Promise<"charged" | "skipped_no_sepa" | "skipped_too_early" | "failed"> {
  const { rentPayment, tenant, triggerLabel } = args;
  if (!tenant.stripeCustomerId || !tenant.sepaMandateId) return "skipped_no_sepa";
  if (!isChargeableNow({
    rentPaymentMonth: rentPayment.month,
    moveIn: tenant.moveIn,
  })) return "skipped_too_early";

  try {
    const pi = await stripe.paymentIntents.create({
      amount: rentPayment.amount,
      currency: "eur",
      customer: tenant.stripeCustomerId,
      payment_method: tenant.sepaMandateId,
      off_session: true,
      confirm: true,
      metadata: {
        type: "long_stay_rent",
        tenantId: tenant.id,
        rentPaymentId: rentPayment.id,
        month: rentPayment.month.toISOString(),
        trigger: triggerLabel,
      },
    });

    await prisma.rentPayment.update({
      where: { id: rentPayment.id },
      data: {
        status: "PROCESSING",
        stripePaymentIntentId: pi.id,
        lastRetryAt: new Date(),
      },
    });
    logEvent(
      { scope: "rent-charge", tags: { tenantId: tenant.id, rentPaymentId: rentPayment.id, trigger: triggerLabel } },
      `charged rent (${triggerLabel})`,
    );
    return "charged";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reportError(err, {
      scope: "rent-charge",
      tags: { tenantId: tenant.id, rentPaymentId: rentPayment.id, trigger: triggerLabel },
    });
    await prisma.rentPayment.update({
      where: { id: rentPayment.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: message,
      },
    });
    return "failed";
  }
}
