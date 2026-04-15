import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
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
 *   when the lease is binding.
 * - Booking Fee (€195) is NOT refunded — contractually non-refundable.
 * - Deposit IS refunded via Stripe.
 * - Booking → CANCELLED with cancellationReason indicating in/after deadline.
 * - Tenant record is deleted, room becomes vacant.
 *
 * After the deadline the action still runs (admin override) — caller must
 * pass `confirmExpired: true` so we know the warning was acknowledged.
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

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { booking: true, room: true },
  });

  if (!tenant) return Response.json({ error: "Tenant not found" }, { status: 404 });
  if (!tenant.booking) {
    return Response.json({ error: "Tenant has no linked booking — cannot withdraw" }, { status: 400 });
  }

  const booking = tenant.booking;

  // Compute whether we're inside the 14-day window. Window starts at
  // depositPaidAt — the moment the lease becomes binding.
  let withinDeadline = true;
  if (booking.depositPaidAt) {
    const ms = Date.now() - new Date(booking.depositPaidAt).getTime();
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

  // Guard: no completed rent payments (shouldn't happen within 14 days, but be safe).
  const paidRents = await prisma.rentPayment.count({
    where: { tenantId: id, status: "PAID" },
  });
  if (paidRents > 0) {
    return Response.json(
      { error: "Tenant has paid rent — cannot process simple withdrawal. Handle manually." },
      { status: 400 }
    );
  }

  // ─── Stripe: Find the deposit checkout session & refund the PaymentIntent ──
  let refundId: string | null = null;
  let paymentIntentId: string | null = null;

  if (booking.depositPaymentLinkId) {
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
          reason: "requested_by_customer",
          metadata: {
            tenantId: id,
            bookingId: booking.id,
            context: "14-day-widerruf",
          },
        });
        refundId = refund.id;
      }
    } catch (err) {
      reportError(err, {
        scope: "withdraw",
        tags: { tenantId: id, bookingId: booking.id, depositPaymentLinkId: booking.depositPaymentLinkId },
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

  // ─── DB: Cancel booking, delete tenant ────────────────────────────────────
  const cancellationReason = withinDeadline
    ? "Widerruf (14-day cancellation)"
    : "Widerruf (admin override after deadline)";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancellationReason,
        depositStatus: tenant.depositStatus === "RECEIVED" ? "RETURNED" : tenant.depositStatus,
      },
    });

    // Tenant has FK cascade on its rentPayments / extraCharges / etc. — delete cleanly.
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
      },
    },
    "tenant withdrawn"
  );

  await audit(request, {
    module: "tenant",
    action: withinDeadline ? "withdraw" : "withdraw_after_deadline",
    entityType: "tenant",
    entityId: id,
    summary: `Withdrew ${tenant.firstName} ${tenant.lastName} (${withinDeadline ? "within" : "AFTER"} 14-day window)`,
    metadata: {
      refundId,
      paymentIntentId,
      bookingId: booking.id,
      withinDeadline,
      depositPaidAt: booking.depositPaidAt?.toISOString() ?? null,
    },
  });

  return Response.json({
    ok: true,
    refunded: Boolean(refundId),
    refundId,
    bookingFeeRetained: Boolean(booking.bookingFeePaidAt),
    withinDeadline,
  });
}
