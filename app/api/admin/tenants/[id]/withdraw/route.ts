import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prismaDirect as prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { stripe } from "@/lib/stripe";
import { reportError, logEvent } from "@/lib/observability";
import { audit } from "@/lib/audit";

/**
 * POST /api/admin/tenants/[id]/withdraw
 *
 * 14-Tage-Widerruf workflow.
 *
 * Refund logic (per Matteo, 15.04.2026):
 *
 *   totalCollected = depositPaid + Σ(PAID RentPayments)
 *   proRataOwed    = monthlyRent × daysOccupied / daysInMoveInMonth
 *   refundTotal    = totalCollected − proRataOwed
 *
 *   daysOccupied counts INCLUSIVELY: move-in day + cancellation day both
 *   count as full rent days (matches monthly-rent cron's startDay/endDay
 *   logic).
 *
 *   Pro-rata uses the actual days in the move-in month (pragmatic single-
 *   month divisor; cross-month edge cases at 14-day window are rare).
 *
 *   We *check what was actually paid* via RentPayment.status = PAID; we
 *   never assume a charge succeeded just because it was scheduled. If the
 *   move-in day SEPA pull failed or the tenant never set up a payment
 *   method, the rent side of the refund is simply zero.
 *
 *   Refunds are issued per Stripe PaymentIntent (deposit first, then PAID
 *   rents oldest-first) until refundTotal is satisfied.
 *
 *   Booking Fee €195 is NOT refunded — contractually non-refundable.
 *   Booking → CANCELLED with cancellationReason + cancellationDate +
 *   proRataRentRetained + depositRefundedAmount snapshotted so accounting
 *   survives the tenant delete.
 *
 * Body:
 *   - confirmExpired?: boolean        (required when past 14d)
 *   - cancellationDate?: ISO YYYY-MM-DD (default: today)
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const confirmExpired = body?.confirmExpired === true;

  // Cancellation date — when the Widerruf actually arrived in our inbox.
  // Default to today, normalize to start-of-day.
  const cancellationDate = body?.cancellationDate
    ? new Date(body.cancellationDate)
    : new Date();
  cancellationDate.setHours(0, 0, 0, 0);

  if (cancellationDate.getTime() > Date.now() + 86_400_000) {
    return Response.json(
      { error: "cancellationDate cannot be in the future" },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { booking: true, room: true },
  });

  if (!tenant) return Response.json({ error: "Tenant not found" }, { status: 404 });
  if (!tenant.booking) {
    return Response.json(
      { error: "Tenant has no linked booking — cannot withdraw" },
      { status: 400 }
    );
  }

  const booking = tenant.booking;

  // ─── Check 14-day window (measured from deposit payment) ─────
  let withinDeadline = true;
  if (booking.depositPaidAt) {
    const ms = cancellationDate.getTime() - new Date(booking.depositPaidAt).getTime();
    withinDeadline = ms <= 14 * 24 * 60 * 60 * 1000;
  }

  if (!withinDeadline && !confirmExpired) {
    return Response.json(
      {
        error: "EXPIRED",
        message:
          "Widerrufsfrist abgelaufen (mehr als 14 Tage seit Kautionszahlung). Pass confirmExpired=true to override.",
      },
      { status: 409 }
    );
  }

  // ─── Pro-rata rent calculation ───────────────────────────────
  // Days inclusive on both ends — move-in day AND cancellation day count
  // as full rent days (matches monthly-rent cron's startDay/endDay logic).
  // Use actual days of the move-in month; cross-month edge cases at 14d
  // window are rare enough to ignore for now.
  const moveIn = new Date(tenant.moveIn);
  moveIn.setHours(0, 0, 0, 0);

  let daysOccupied = 0;
  let proRataRentCents = 0;
  if (moveIn <= cancellationDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    daysOccupied =
      Math.max(0, Math.floor((cancellationDate.getTime() - moveIn.getTime()) / msPerDay)) + 1;
    if (daysOccupied > 0 && tenant.monthlyRent > 0) {
      const daysInMoveInMonth = new Date(
        moveIn.getFullYear(),
        moveIn.getMonth() + 1,
        0
      ).getDate();
      proRataRentCents = Math.round(
        (tenant.monthlyRent * daysOccupied) / daysInMoveInMonth
      );
    }
  }

  // ─── Sum what was actually paid (deposit + paid rents) ───────
  const depositPaid = booking.depositAmount ?? 0;

  const paidRents = await prisma.rentPayment.findMany({
    where: { tenantId: id, status: "PAID" },
    orderBy: { month: "asc" },
  });
  const paidRentsCents = paidRents.reduce((s, r) => s + r.paidAmount, 0);

  const totalCollectedCents = depositPaid + paidRentsCents;
  const refundTotalCents = Math.max(0, totalCollectedCents - proRataRentCents);

  // ─── Stripe refunds — distribute across PaymentIntents ──────
  // Order: deposit first, then paid rents oldest-first. Each PI gets a
  // partial or full refund until refundTotalCents is satisfied.
  const refundsExecuted: { paymentIntentId: string; refundId: string; amount: number; source: string }[] = [];
  let remaining = refundTotalCents;

  if (remaining > 0) {
    // Build the queue of refundable charges
    const queue: { paymentIntentId: string; max: number; source: string; rentPaymentId?: string }[] = [];

    // Deposit PI
    if (booking.depositPaymentLinkId && depositPaid > 0) {
      try {
        const sessions = await stripe.checkout.sessions.list({
          payment_link: booking.depositPaymentLinkId,
          limit: 1,
        });
        const session = sessions.data[0];
        const pi =
          session?.payment_intent &&
          (typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id);
        if (pi) queue.push({ paymentIntentId: pi, max: depositPaid, source: "deposit" });
      } catch (err) {
        reportError(err, {
          scope: "withdraw",
          tags: { stage: "lookup-deposit-pi", tenantId: id, bookingId: booking.id },
        });
      }
    }

    // Rent PIs (oldest first)
    for (const r of paidRents) {
      if (r.stripePaymentIntentId && r.paidAmount > 0) {
        queue.push({
          paymentIntentId: r.stripePaymentIntentId,
          max: r.paidAmount,
          source: `rent_${r.month.toISOString().slice(0, 7)}`,
          rentPaymentId: r.id,
        });
      }
    }

    for (const q of queue) {
      if (remaining <= 0) break;
      const amount = Math.min(q.max, remaining);
      try {
        const refund = await stripe.refunds.create({
          payment_intent: q.paymentIntentId,
          amount,
          reason: "requested_by_customer",
          metadata: {
            tenantId: id,
            bookingId: booking.id,
            context: withinDeadline ? "14-day-widerruf" : "widerruf-override",
            source: q.source,
            proRataRentRetained: String(proRataRentCents),
            daysOccupied: String(daysOccupied),
          },
        });
        refundsExecuted.push({
          paymentIntentId: q.paymentIntentId,
          refundId: refund.id,
          amount,
          source: q.source,
        });
        remaining -= amount;
      } catch (err) {
        reportError(err, {
          scope: "withdraw",
          tags: {
            stage: "refund-distribute",
            tenantId: id,
            bookingId: booking.id,
            paymentIntentId: q.paymentIntentId,
            source: q.source,
          },
        });
        return Response.json(
          {
            error: "Stripe refund failed",
            details: err instanceof Error ? err.message : String(err),
            partialRefunds: refundsExecuted,
          },
          { status: 500 }
        );
      }
    }
  }

  const actuallyRefundedCents = refundsExecuted.reduce((s, r) => s + r.amount, 0);

  // ─── DB: Snapshot cancellation data on Booking + delete tenant ──
  const cancellationReason = withinDeadline
    ? "Widerruf (14-day cancellation)"
    : "Widerruf (admin override after deadline)";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancellationReason,
        cancellationDate,
        proRataRentRetained: proRataRentCents,
        depositRefundedAmount: actuallyRefundedCents, // total refunded across all PIs
        depositStatus:
          tenant.depositStatus === "RECEIVED" ? "RETURNED" : tenant.depositStatus,
      },
    });

    // Tenant has FK cascade on rentPayments / extraCharges / etc. — delete cleanly.
    await tx.tenant.delete({ where: { id } });
  });

  logEvent(
    {
      scope: "withdraw",
      tags: {
        tenantId: id,
        bookingId: booking.id,
        refundCount: refundsExecuted.length,
        actuallyRefundedCents,
        depositPaid,
        paidRentsCents,
        daysOccupied,
        proRataRentCents,
      },
    },
    "tenant withdrawn"
  );

  await audit(request, {
    module: "tenant",
    action: withinDeadline ? "withdraw" : "withdraw_after_deadline",
    entityType: "tenant",
    entityId: id,
    summary: `Widerruf ${tenant.firstName} ${tenant.lastName} (${withinDeadline ? "within" : "AFTER"} 14-day window) — refund €${(actuallyRefundedCents / 100).toFixed(2)} across ${refundsExecuted.length} PI(s), retained pro-rata €${(proRataRentCents / 100).toFixed(2)} for ${daysOccupied} day${daysOccupied === 1 ? "" : "s"}`,
    metadata: {
      bookingId: booking.id,
      withinDeadline,
      cancellationDate: cancellationDate.toISOString(),
      depositPaidAt: booking.depositPaidAt?.toISOString() ?? null,
      depositPaid,
      paidRentsCents,
      paidRentsCount: paidRents.length,
      totalCollectedCents,
      daysOccupied,
      proRataRentCents,
      refundTotalCents,
      actuallyRefundedCents,
      bookingFeeRetainedCents: booking.bookingFeePaidAt ? 19500 : 0,
      refunds: refundsExecuted,
    },
  });

  return Response.json({
    ok: true,
    refunded: refundsExecuted.length > 0,
    refunds: refundsExecuted,
    actuallyRefundedCents,
    refundTotalCents,
    depositPaid,
    paidRentsCents,
    proRataRentRetainedCents: proRataRentCents,
    daysOccupied,
    bookingFeeRetained: Boolean(booking.bookingFeePaidAt),
    withinDeadline,
  });
}
