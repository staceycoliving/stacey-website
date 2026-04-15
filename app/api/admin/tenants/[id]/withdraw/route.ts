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
 * Policy (per Matteo):
 * - 14-day window starts on DEPOSIT payment (depositPaidAt), since that's
 *   when the lease becomes binding.
 * - Booking Fee (€195) is NOT refunded — contractually non-refundable.
 * - Deposit is refunded via Stripe.
 * - If the tenant already moved in (moveIn < cancellationDate), we keep a
 *   pro-rata share of the monthly rent for the days they actually used the
 *   apartment. Pro-rata uses the actual days of the move-in month (28/30/31)
 *   to stay consistent with our monthly-rent cron.
 * - Booking → CANCELLED with reason. We snapshot cancellationDate +
 *   proRataRentRetained + depositRefundedAmount on the booking so the
 *   numbers survive the tenant delete.
 * - Tenant record is deleted, room becomes vacant.
 *
 * Body:
 *   - confirmExpired?: boolean   (required when past 14d)
 *   - cancellationDate?: ISO date string (default: today)
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

  // ─── Guard: no completed rent payments (separate flow needed) ──
  const paidRents = await prisma.rentPayment.count({
    where: { tenantId: id, status: "PAID" },
  });
  if (paidRents > 0) {
    return Response.json(
      {
        error:
          "Tenant has paid rent payments. Use the manual refund/cancellation workflow.",
      },
      { status: 400 }
    );
  }

  // ─── Pro-rata rent calculation ───────────────────────────────
  // If the tenant already moved in by cancellationDate, retain rent for
  // days used. Use actual days of the move-in month for consistency with
  // the monthly-rent cron (avoid the 30/360 method).
  const moveIn = new Date(tenant.moveIn);
  moveIn.setHours(0, 0, 0, 0);

  let daysOccupied = 0;
  let proRataRentCents = 0;
  if (moveIn < cancellationDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    daysOccupied = Math.max(
      0,
      Math.floor((cancellationDate.getTime() - moveIn.getTime()) / msPerDay)
    );
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

  const depositPaid = booking.depositAmount ?? 0;
  const refundAmountCents = Math.max(0, depositPaid - proRataRentCents);

  // ─── Stripe refund (with reduced amount if pro-rata applies) ──
  let refundId: string | null = null;
  let paymentIntentId: string | null = null;

  if (booking.depositPaymentLinkId && refundAmountCents > 0) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_link: booking.depositPaymentLinkId,
        limit: 1,
      });
      const session = sessions.data[0];
      if (session?.payment_intent) {
        paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: refundAmountCents,
          reason: "requested_by_customer",
          metadata: {
            tenantId: id,
            bookingId: booking.id,
            context: withinDeadline ? "14-day-widerruf" : "widerruf-override",
            proRataRentRetained: String(proRataRentCents),
            daysOccupied: String(daysOccupied),
          },
        });
        refundId = refund.id;
      }
    } catch (err) {
      reportError(err, {
        scope: "withdraw",
        tags: {
          tenantId: id,
          bookingId: booking.id,
          depositPaymentLinkId: booking.depositPaymentLinkId,
        },
      });
      return Response.json(
        {
          error: "Stripe refund failed",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      );
    }
  }

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
        depositRefundedAmount: refundAmountCents,
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
        refundId: refundId ?? "none",
        paymentIntentId: paymentIntentId ?? "none",
        daysOccupied,
        proRataRentCents,
        refundAmountCents,
      },
    },
    "tenant withdrawn"
  );

  await audit(request, {
    module: "tenant",
    action: withinDeadline ? "withdraw" : "withdraw_after_deadline",
    entityType: "tenant",
    entityId: id,
    summary: `Widerruf ${tenant.firstName} ${tenant.lastName} (${withinDeadline ? "within" : "AFTER"} 14-day window) — refund €${(refundAmountCents / 100).toFixed(2)}, retained pro-rata €${(proRataRentCents / 100).toFixed(2)}`,
    metadata: {
      refundId,
      paymentIntentId,
      bookingId: booking.id,
      withinDeadline,
      depositPaidAt: booking.depositPaidAt?.toISOString() ?? null,
      cancellationDate: cancellationDate.toISOString(),
      daysOccupied,
      proRataRentCents,
      refundAmountCents,
      bookingFeeRetainedCents: booking.bookingFeePaidAt ? 19500 : 0,
    },
  });

  return Response.json({
    ok: true,
    refunded: Boolean(refundId),
    refundId,
    refundAmountCents,
    proRataRentRetainedCents: proRataRentCents,
    daysOccupied,
    bookingFeeRetained: Boolean(booking.bookingFeePaidAt),
    withinDeadline,
  });
}
