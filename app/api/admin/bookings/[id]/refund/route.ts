import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { stripe } from "@/lib/stripe";
import { reportError } from "@/lib/observability";

/**
 * POST /api/admin/bookings/[id]/refund
 *
 * Refunds the booking fee (€195) via Stripe. Intended use: when WE
 * cancel a booking (cancellationKind = CANCELLED_BY_STACEY) and the
 * guest already paid the booking fee. For Widerruf / timeout / lead-
 * abandoned we keep the fee — the UI should only expose this button
 * when kind = CANCELLED_BY_STACEY.
 *
 * Body: {} — refunds the full recorded bookingFeeAmount (or 19500 fallback)
 *         against the bookingFeeSessionId's underlying PaymentIntent.
 */
const DEFAULT_BOOKING_FEE_CENTS = 19_500;

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!booking.bookingFeePaidAt) {
    return Response.json(
      { error: "No booking fee was paid — nothing to refund" },
      { status: 400 }
    );
  }
  if (booking.bookingFeeRefundedAt) {
    return Response.json(
      { error: "Booking fee was already refunded" },
      { status: 400 }
    );
  }
  if (!booking.bookingFeeSessionId) {
    return Response.json(
      {
        error:
          "No Stripe session recorded for this booking fee — refund has to happen manually in Stripe Dashboard",
      },
      { status: 400 }
    );
  }

  // Look up the PaymentIntent behind the Checkout Session
  let paymentIntentId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(
      booking.bookingFeeSessionId
    );
    const pi = session.payment_intent;
    paymentIntentId = typeof pi === "string" ? pi : (pi?.id ?? null);
  } catch (err) {
    reportError(err, {
      scope: "booking-refund",
      tags: { stage: "lookup-pi", bookingId: id },
    });
    return Response.json(
      {
        error:
          "Couldn't look up the Stripe session — refund manually in Stripe Dashboard and click 'Mark refunded manually' afterwards",
      },
      { status: 502 }
    );
  }

  if (!paymentIntentId) {
    return Response.json(
      {
        error:
          "Session exists but no PaymentIntent — refund manually in Stripe Dashboard",
      },
      { status: 500 }
    );
  }

  const amount = DEFAULT_BOOKING_FEE_CENTS; // fixed fee

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: "requested_by_customer",
      metadata: {
        bookingId: id,
        context: "booking-fee-refund-on-stacey-cancel",
      },
    });

    await prisma.booking.update({
      where: { id },
      data: {
        bookingFeeRefundedAt: new Date(),
        bookingFeeRefundAmount: amount,
        bookingFeeRefundId: refund.id,
      },
    });

    await audit(request, {
      module: "booking",
      action: "booking_fee_refund",
      entityType: "booking",
      entityId: id,
      summary: `Refunded booking fee (€${(amount / 100).toFixed(2)}) for ${booking.firstName} ${booking.lastName}`,
      metadata: {
        amountCents: amount,
        stripeRefundId: refund.id,
        paymentIntentId,
      },
    });

    return Response.json({
      ok: true,
      refundId: refund.id,
      amount,
    });
  } catch (err) {
    reportError(err, {
      scope: "booking-refund",
      tags: { stage: "create-refund", bookingId: id },
    });
    return Response.json(
      {
        error: `Refund failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
