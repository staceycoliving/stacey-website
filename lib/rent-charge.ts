import "server-only";
import { stripe } from "./stripe";
import { reportError, logEvent } from "./observability";
import type { Prisma, PrismaClient, RentPayment, Tenant } from "./generated/prisma/client";

// ── Timezone-safe local-date helpers ────────────────────────────────
// Vercel Node runs in UTC, local macOS in CET. Anything that needs
// "what calendar day is this in Germany" goes through these helpers
// instead of `Date.getMonth()/getDate()` which read whatever the server
// process tz happens to be.
const TZ = "Europe/Berlin";
const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseLocalDate(input: Date | string): { year: number; month: number; day: number } {
  const d = input instanceof Date ? input : new Date(input);
  // en-CA → "YYYY-MM-DD" → easy split
  const [y, m, day] = dateFmt.format(d).split("-").map((s) => parseInt(s, 10));
  return { year: y, month: m - 1, day }; // month 0-indexed, like JS
}

/** First day of the given local month, expressed as the UTC instant that
 *  CET-local midnight on that day points at. Matches how the cron stored
 *  rent.month (`new Date(year, month, 1)` evaluated in CET). */
function makeLocalMonthStart(year: number, month: number): Date {
  // Try midnight at +02:00 first (CEST); fall back to +01:00 (CET) if
  // the resulting wall time isn't in DST. For simplicity in this codebase
  // (Germany is on CEST April-October, which covers all our move-in
  // scenarios in scope), use +02:00. The 1-day range query accommodates
  // the half-hour edge cases anyway.
  return new Date(Date.UTC(year, month, 1) - 2 * 60 * 60 * 1000);
}
function makeLocalMonthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0) - 2 * 60 * 60 * 1000);
}

/** Aggregate `paidAmount - amount` over all PAID rent payments where the
 *  tenant overpaid (i.e. paid more than the corrected pro-rata). Used by
 *  the deposit settlement to roll the credit into the final refund. */
export async function computeRentOverpayment(
  tx: Prisma.TransactionClient | PrismaClient,
  tenantId: string
): Promise<number> {
  const paidRents = await tx.rentPayment.findMany({
    where: { tenantId, status: "PAID" },
    select: { amount: true, paidAmount: true },
  });
  return paidRents.reduce(
    (sum, r) => sum + Math.max(0, r.paidAmount - r.amount),
    0
  );
}

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

/** Reconcile the move-out month's rent against the current moveOut date.
 *  Use case: tenant paid the full month's rent on the 1st (cron), then
 *  the move-out gets shortened mid-month → tenant overpaid.
 *
 *  We do NOT issue a Stripe refund here. Instead, we lower the
 *  RentPayment.amount to the correct pro-rata, leaving paidAmount
 *  untouched. The credit (paidAmount − amount) is then automatically
 *  rolled into the deposit settlement at end of stay (alongside open
 *  debts, extras, defects). This gives the admin one consolidated
 *  payout instead of a refund + a deposit return + a separate offset.
 *
 *  Underpayment (e.g. moveOut shifted later) is surfaced as a warning
 *  for manual handling, auto-charging extra would need a fresh SEPA
 *  pull. */
export async function reconcileMoveOutPayment(
  prisma: PrismaClient,
  tenantId: string,
  triggerLabel: string
): Promise<{
  adjusted: boolean;
  overpaymentCents: number;
  rentPaymentId: string | null;
  oldAmountCents: number;
  newAmountCents: number;
  warnings: string[];
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      monthlyRent: true,
      moveIn: true,
      moveOut: true,
    },
  });

  const empty = {
    adjusted: false,
    overpaymentCents: 0,
    rentPaymentId: null,
    oldAmountCents: 0,
    newAmountCents: 0,
    warnings: [] as string[],
  };

  if (!tenant?.moveOut) return empty;

  // Read date components in CET (Europe/Berlin) so the calculation is
  // independent of the server's process timezone (Vercel Node runs in
  // UTC, local macOS in CET, same code, different `.getMonth()` outputs
  // without a fixed reference).
  const moveOutLocal = parseLocalDate(tenant.moveOut);
  const moveInLocal = parseLocalDate(tenant.moveIn);
  const monthStart = makeLocalMonthStart(moveOutLocal.year, moveOutLocal.month);
  const monthEnd = makeLocalMonthEnd(moveOutLocal.year, moveOutLocal.month);
  const daysInMonth = monthEnd.getUTCDate(); // monthEnd built in UTC
  // Range-query the rent for the move-out month. Avoids exact-Date match
  // pitfalls (the rent.month was stored from CET-local Date construction
  // → 2h offset from a UTC-recomputed monthStart). Window is 2 days wide
  // which always contains exactly the one month-start row.
  const rangeStart = new Date(monthStart.getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(monthStart.getTime() + 24 * 60 * 60 * 1000);

  const rent = await prisma.rentPayment.findFirst({
    where: {
      tenantId,
      month: { gte: rangeStart, lte: rangeEnd },
      status: { in: ["PAID", "PARTIAL"] },
    },
  });
  if (!rent) return empty;

  // Inline the pro-rata calc here too (using CET-local day numbers) so it
  // matches the modal preview regardless of server tz.
  const startDay =
    moveInLocal.year === moveOutLocal.year && moveInLocal.month === moveOutLocal.month
      ? moveInLocal.day
      : 1;
  const endDay = moveOutLocal.day;
  const rentDays = Math.max(0, endDay - startDay + 1);
  const correctAmount =
    rentDays >= daysInMonth
      ? tenant.monthlyRent
      : Math.round((tenant.monthlyRent * rentDays) / daysInMonth);

  if (rent.amount === correctAmount) return empty;

  if (rent.paidAmount < correctAmount) {
    // Underpaid → leave amount as-is, just surface the warning. Admin can
    // add an ExtraCharge or trigger a fresh SEPA pull.
    return {
      ...empty,
      oldAmountCents: rent.amount,
      newAmountCents: correctAmount,
      warnings: [
        `Tenant underpaid by ${(correctAmount - rent.paidAmount) / 100}€ for ${monthStart.toISOString().slice(0, 7)}, needs manual charge`,
      ],
    };
  }

  // Overpaid → set amount to the correct pro-rata. paidAmount stays so
  // the credit (paidAmount − amount) shows up in the deposit settlement.
  await prisma.rentPayment.update({
    where: { id: rent.id },
    data: { amount: correctAmount },
  });

  // Refresh tenant.rentOverpaymentAmount so it stays in sync (lookup-free
  // for the deposit list view).
  const overpayment = await computeRentOverpayment(prisma, tenantId);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { rentOverpaymentAmount: overpayment },
  });

  logEvent(
    {
      scope: "rent-reconcile",
      tags: {
        tenantId,
        rentPaymentId: rent.id,
        oldAmount: rent.amount,
        newAmount: correctAmount,
        overpaymentTotal: overpayment,
        trigger: triggerLabel,
      },
    },
    "moveOut reconcile: lowered rent amount, credit rolled into settlement",
  );

  return {
    adjusted: true,
    overpaymentCents: rent.paidAmount - correctAmount,
    rentPaymentId: rent.id,
    oldAmountCents: rent.amount,
    newAmountCents: correctAmount,
    warnings: [],
  };
}

/** Charge a single PENDING/FAILED RentPayment via Stripe (off-session).
 *  Bundles any open NEXT_RENT adjustments (charges + discounts) into the
 *  same PaymentIntent so the tenant sees one combined pull per month
 *  via whatever payment method is on file (SEPA, card, etc).
 *  Updates the record on success/failure. No-op if the tenant has no
 *  payment method yet or the rent is not yet chargeable today.
 *
 *  Discount handling: sum of discounts is capped at rent + charges so the
 *  PI amount never goes negative. If discounts exceed that budget, the
 *  excess stays unapplied (paidAt=null) and rolls forward to next month. */
export async function chargeRentPayment(
  prisma: PrismaClient,
  args: {
    rentPayment: RentPayment;
    tenant: Pick<
      Tenant,
      | "id"
      | "firstName"
      | "lastName"
      | "stripeCustomerId"
      | "sepaMandateId"
      | "moveIn"
      | "paymentMethod"
    >;
    /** Optional metadata key for tracing the charge origin (cron / webhook / setup). */
    triggerLabel: string;
  }
): Promise<
  | "charged"
  | "skipped_no_sepa"
  | "skipped_too_early"
  | "skipped_bank_transfer"
  | "failed"
> {
  const { rentPayment, tenant, triggerLabel } = args;
  // Bank-transfer tenants are collected manually, never auto-charge.
  if (tenant.paymentMethod === "BANK_TRANSFER") return "skipped_bank_transfer";
  if (!tenant.stripeCustomerId || !tenant.sepaMandateId) return "skipped_no_sepa";
  if (!isChargeableNow({
    rentPaymentMonth: rentPayment.month,
    moveIn: tenant.moveIn,
  })) return "skipped_too_early";

  // Pull in all open NEXT_RENT adjustments (oldest first) so we can bundle
  // them into the same SEPA pull as the base rent.
  const openAdjustments = await prisma.extraCharge.findMany({
    where: {
      tenantId: tenant.id,
      paidAt: null,
      chargeOn: "NEXT_RENT",
    },
    orderBy: { createdAt: "asc" },
  });
  const charges = openAdjustments.filter((a) => a.type === "CHARGE");
  const discounts = openAdjustments.filter((a) => a.type === "DISCOUNT");

  const chargesTotal = charges.reduce((s, c) => s + c.amount, 0);
  // Budget for discounts = rent + charges. Apply discounts oldest-first,
  // fully, until budget runs out. Leftover discounts roll to next month.
  const discountBudget = rentPayment.amount + chargesTotal;
  const appliedDiscounts: typeof discounts = [];
  let discountsApplied = 0;
  for (const d of discounts) {
    if (discountsApplied + d.amount <= discountBudget) {
      appliedDiscounts.push(d);
      discountsApplied += d.amount;
    }
  }
  const finalAmount = rentPayment.amount + chargesTotal - discountsApplied;
  const bundledChargeIds = [
    ...charges.map((c) => c.id),
    ...appliedDiscounts.map((d) => d.id),
  ];

  // Edge case: net 0 (full discount). No Stripe PI needed, mark rent
  // and bundled adjustments as settled in DB directly.
  if (finalAmount <= 0) {
    await prisma.$transaction([
      prisma.rentPayment.update({
        where: { id: rentPayment.id },
        data: {
          status: "PAID",
          paidAmount: rentPayment.amount,
          paidAt: new Date(),
        },
      }),
      ...bundledChargeIds.map((id) =>
        prisma.extraCharge.update({
          where: { id },
          data: { paidAt: new Date() },
        })
      ),
    ]);
    logEvent(
      {
        scope: "rent-charge",
        tags: {
          tenantId: tenant.id,
          rentPaymentId: rentPayment.id,
          trigger: triggerLabel,
          bundledCount: bundledChargeIds.length,
          zeroAmount: true,
        },
      },
      `rent fully offset by discounts (${triggerLabel}), no Stripe charge`,
    );
    return "charged";
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount: finalAmount,
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
        rentAmount: String(rentPayment.amount),
        chargesTotal: String(chargesTotal),
        discountsApplied: String(discountsApplied),
        bundledAdjustmentIds: JSON.stringify(bundledChargeIds),
      },
    });

    await prisma.$transaction([
      prisma.rentPayment.update({
        where: { id: rentPayment.id },
        data: {
          status: "PROCESSING",
          stripePaymentIntentId: pi.id,
          lastRetryAt: new Date(),
        },
      }),
      // Optimistically link bundled adjustments to the PI. paidAt is set
      // in the webhook on success; here we only record the intent.
      ...bundledChargeIds.map((id) =>
        prisma.extraCharge.update({
          where: { id },
          data: { stripePaymentIntentId: pi.id },
        })
      ),
    ]);
    logEvent(
      {
        scope: "rent-charge",
        tags: {
          tenantId: tenant.id,
          rentPaymentId: rentPayment.id,
          trigger: triggerLabel,
          finalAmount,
          chargesTotal,
          discountsApplied,
          bundledCount: bundledChargeIds.length,
        },
      },
      `charged rent + adjustments (${triggerLabel})`,
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
