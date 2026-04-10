import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import {
  sendDepositPaymentLink,
  sendDepositConfirmation,
  sendTeamNotification,
} from "@/lib/email";
import { downloadSignedDocument } from "@/lib/yousign";

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
        } else if (metadata.type === "long_stay_payment_setup") {
          await handlePaymentSetupCompleted(metadata.tenantId, session);
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
  } catch (err: any) {
    console.error("Stripe webhook handler error:", err);
    console.error("Error stack:", err?.stack);
    return Response.json({
      error: "Handler error",
      message: err?.message || String(err),
      eventType: event.type,
    }, { status: 500 });
  }

  return Response.json({ received: true });
}

// ─── Booking Fee Paid → Create Deposit Link ────────────────

async function handleBookingFeePaid(bookingId: string, sessionId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { location: true, room: true },
  });

  if (!booking) {
    console.warn(`Booking ${bookingId} not found`);
    return;
  }

  // Allow PENDING (Yousign webhook may not have fired yet) or SIGNED
  if (booking.status !== "SIGNED" && booking.status !== "PENDING") {
    console.warn(`Booking ${bookingId} in unexpected status: ${booking.status}`);
    return;
  }

  const depositAmount = booking.depositAmount || 0;
  if (depositAmount <= 0) {
    console.error(`Booking ${bookingId} has no deposit amount`);
    return;
  }

  // Try to download the signed lease from Yousign (best effort)
  let signedLeasePdf: Buffer | undefined;
  if (booking.signatureRequestId && booking.signatureDocumentId) {
    try {
      const arrayBuffer = await downloadSignedDocument(
        booking.signatureRequestId,
        booking.signatureDocumentId
      );
      signedLeasePdf = Buffer.from(arrayBuffer);
      console.log(`Downloaded signed lease for booking ${bookingId}: ${signedLeasePdf.length} bytes`);
    } catch (err) {
      console.error(`Failed to download signed lease for booking ${bookingId}:`, err);
    }
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
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://stacey-website-one.vercel.app"}/move-in/deposit-success`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://stacey-website-one.vercel.app"}/move-in?deposit=cancelled`,
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

  // Send deposit payment email with signed lease attached
  try {
    await sendDepositPaymentLink({
      firstName: booking.firstName,
      email: booking.email,
      locationName: booking.location.name,
      roomCategory: booking.category,
      monthlyRent: booking.monthlyRent || 0,
      depositAmount,
      depositPaymentUrl: depositSession.url!,
      deadlineHours: DEPOSIT_DEADLINE_HOURS,
      signedLeasePdf,
    });
  } catch (err) {
    console.error("Deposit email error:", err);
  }

  console.log(`Booking ${bookingId}: fee paid, deposit link sent, deadline ${deadline.toISOString()}`);
}

// ─── Deposit Paid → Confirm Booking + Create Tenant ────────

async function handleDepositPaid(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { location: true, room: { include: { tenant: true } } },
  });

  if (!booking || booking.status !== "DEPOSIT_PENDING") {
    console.warn(`Booking ${bookingId} not found or not in DEPOSIT_PENDING status`);
    return;
  }

  if (!booking.roomId) {
    console.error(`Booking ${bookingId} has no room assigned`);
    return;
  }

  // Transaction: delete old tenant if moved out, update booking, create new tenant
  let createdTenantId: string | null = null;
  await prisma.$transaction(async (tx: any) => {
    // Remove old tenant if their moveOut is on/before the new moveIn
    const oldTenant = booking.room?.tenant;
    if (oldTenant && oldTenant.moveOut && new Date(oldTenant.moveOut) <= booking.moveInDate!) {
      await tx.tenant.delete({ where: { id: oldTenant.id } });
      console.log(`Deleted old tenant ${oldTenant.firstName} ${oldTenant.lastName} from room ${booking.room?.roomNumber}`);
    }

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
    const tenant = await tx.tenant.create({
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
    createdTenantId = tenant.id;
  });

  // Generate payment setup link (so we can include it in the confirmation email)
  let paymentSetupUrl: string | undefined;
  if (createdTenantId) {
    try {
      paymentSetupUrl = await createPaymentSetupSession(createdTenantId);
    } catch (err) {
      console.error("Failed to create payment setup session:", err);
    }
  }

  // Send single confirmation email (deposit + payment setup link)
  const moveInStr = booking.moveInDate
    ? booking.moveInDate.toISOString().split("T")[0]
    : "";

  try {
    await sendDepositConfirmation({
      firstName: booking.firstName,
      email: booking.email,
      locationName: booking.location.name,
      moveInDate: moveInStr,
      depositAmount: booking.depositAmount || 0,
      paymentSetupUrl,
    });
  } catch (err) {
    console.error("Deposit confirmation email error:", err);
  }

  try {
    await sendTeamNotification({
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
    });
  } catch (err) {
    console.error("Team notification error:", err);
  }

  console.log(`Booking ${bookingId}: deposit paid, tenant created, confirmed`);
}

// ─── Create Payment Setup Session for Tenant ───────────────

async function createPaymentSetupSession(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  // Create or reuse Stripe Customer
  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: `${tenant.firstName} ${tenant.lastName}`,
      email: tenant.email,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://stacey-website-one.vercel.app";
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card", "sepa_debit"],
    metadata: {
      type: "long_stay_payment_setup",
      tenantId: tenant.id,
    },
    success_url: `${baseUrl}/move-in/payment-setup-success`,
    cancel_url: `${baseUrl}/move-in/payment-setup-success?cancelled=1`,
  });

  return session.url!;
}

// ─── Payment Setup Completed → Save Default Payment Method ─

async function handlePaymentSetupCompleted(tenantId: string, session: any) {
  // Get the SetupIntent from the session
  const setupIntentId = session.setup_intent;
  if (!setupIntentId) {
    console.error("No setup_intent in session");
    return;
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const paymentMethodId = setupIntent.payment_method as string;

  if (!paymentMethodId) {
    console.error("No payment method in setup intent");
    return;
  }

  // Set as default payment method on Stripe Customer
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.stripeCustomerId) {
    console.error(`Tenant ${tenantId} has no stripeCustomerId`);
    return;
  }

  await stripe.customers.update(tenant.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Save on tenant (we reuse sepaMandateId field for any payment method)
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { sepaMandateId: paymentMethodId },
  });

  console.log(`Tenant ${tenantId}: payment method ${paymentMethodId} saved`);
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
