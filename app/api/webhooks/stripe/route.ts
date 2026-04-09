import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import {
  sendDepositPaymentLink,
  sendDepositConfirmation,
  sendTeamNotification,
} from "@/lib/email";

const DEPOSIT_DEADLINE_HOURS = 48;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const metadata = session.metadata || {};

        if (metadata.type === "long_stay_booking_fee") {
          await handleBookingFeePaid(metadata.bookingId, session.id);
        } else if (metadata.type === "long_stay_deposit") {
          await handleDepositPaid(metadata.bookingId);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const metadata = pi.metadata || {};

        if (metadata.type === "long_stay_rent") {
          await handleRentPaymentSucceeded(metadata.rentPaymentId, pi.id, pi.amount_received);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const metadata = pi.metadata || {};

        if (metadata.type === "long_stay_rent") {
          await handleRentPaymentFailed(
            metadata.rentPaymentId,
            pi.last_payment_error?.message || "Payment failed"
          );
        }
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return Response.json({ error: "Handler error" }, { status: 500 });
  }

  return Response.json({ received: true });
}

// ─── Booking Fee Paid → Create Deposit Link ────────────────

async function handleBookingFeePaid(bookingId: string, sessionId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { location: true, room: true },
  });

  if (!booking || booking.status !== "SIGNED") {
    console.warn(`Booking ${bookingId} not found or not in SIGNED status`);
    return;
  }

  const depositAmount = booking.depositAmount || 0;
  if (depositAmount <= 0) {
    console.error(`Booking ${bookingId} has no deposit amount`);
    return;
  }

  // Create Stripe Checkout Session for deposit payment
  const depositSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Security deposit",
            description: `STACEY ${booking.location.name} · ${booking.room?.roomNumber || "Room"} · 2× monthly rent`,
          },
          unit_amount: depositAmount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "long_stay_deposit",
      bookingId: booking.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://stacey.de"}/move-in?deposit=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://stacey.de"}/move-in?deposit=cancelled`,
  });

  const deadline = new Date();
  deadline.setHours(deadline.getHours() + DEPOSIT_DEADLINE_HOURS);

  // Update booking: PAID → DEPOSIT_PENDING
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "DEPOSIT_PENDING",
      bookingFeePaidAt: new Date(),
      depositPaymentLinkId: depositSession.id,
      depositPaymentLinkUrl: depositSession.url,
      depositDeadline: deadline,
    },
  });

  // Send deposit payment email
  sendDepositPaymentLink({
    firstName: booking.firstName,
    email: booking.email,
    locationName: booking.location.name,
    roomCategory: booking.category,
    monthlyRent: booking.monthlyRent || 0,
    depositAmount,
    depositPaymentUrl: depositSession.url!,
    deadlineHours: DEPOSIT_DEADLINE_HOURS,
  }).catch((err) => console.error("Deposit email error:", err));

  console.log(`Booking ${bookingId}: fee paid, deposit link sent, deadline ${deadline.toISOString()}`);
}

// ─── Deposit Paid → Confirm Booking + Create Tenant ────────

async function handleDepositPaid(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { location: true, room: true },
  });

  if (!booking || booking.status !== "DEPOSIT_PENDING") {
    console.warn(`Booking ${bookingId} not found or not in DEPOSIT_PENDING status`);
    return;
  }

  if (!booking.roomId) {
    console.error(`Booking ${bookingId} has no room assigned`);
    return;
  }

  // Transaction: update booking + create tenant
  await prisma.$transaction(async (tx: any) => {
    // Update booking to CONFIRMED
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        depositStatus: "RECEIVED",
        depositPaidAt: new Date(),
      },
    });

    // Create tenant record
    await tx.tenant.create({
      data: {
        roomId: booking.roomId!,
        bookingId: booking.id,
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        phone: booking.phone || null,
        dateOfBirth: booking.dateOfBirth,
        street: booking.street,
        zipCode: booking.zipCode,
        addressCity: booking.addressCity,
        country: booking.country,
        monthlyRent: booking.monthlyRent || 0,
        moveIn: booking.moveInDate!,
        depositAmount: booking.depositAmount,
        depositStatus: "RECEIVED",
      },
    });
  });

  // Send confirmation email
  const moveInStr = booking.moveInDate
    ? booking.moveInDate.toISOString().split("T")[0]
    : "";

  sendDepositConfirmation({
    firstName: booking.firstName,
    email: booking.email,
    locationName: booking.location.name,
    moveInDate: moveInStr,
    depositAmount: booking.depositAmount || 0,
  }).catch((err) => console.error("Deposit confirmation email error:", err));

  // Notify team
  sendTeamNotification({
    stayType: "LONG",
    firstName: booking.firstName,
    lastName: booking.lastName,
    email: booking.email,
    phone: booking.phone,
    locationName: booking.location.name,
    category: booking.category,
    persons: booking.persons,
    moveInDate: moveInStr,
    bookingId: booking.id,
  }).catch((err) => console.error("Team notification error:", err));

  console.log(`Booking ${bookingId}: deposit paid, tenant created, confirmed`);
}

// ─── Rent Payment Succeeded (SEPA) ─────────────────────────

async function handleRentPaymentSucceeded(
  rentPaymentId: string,
  paymentIntentId: string,
  amountReceived: number
) {
  await prisma.rentPayment.update({
    where: { id: rentPaymentId },
    data: {
      status: "PAID",
      paidAmount: amountReceived,
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    },
  });
  console.log(`RentPayment ${rentPaymentId}: paid €${(amountReceived / 100).toFixed(2)}`);
}

// ─── Rent Payment Failed (SEPA) ────────────────────────────

async function handleRentPaymentFailed(
  rentPaymentId: string,
  reason: string
) {
  await prisma.rentPayment.update({
    where: { id: rentPaymentId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureReason: reason,
    },
  });
  console.log(`RentPayment ${rentPaymentId}: failed — ${reason}`);
}
