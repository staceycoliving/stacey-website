import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { reportError, logEvent, logWarn } from "@/lib/observability";
import {
  sendDepositPaymentLink,
  sendDepositConfirmation,
  sendTeamNotification,
  sendPaymentSetupConfirmation,
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
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    reportError(err, { scope: "stripe-webhook", tags: { stage: "signature-verify" } });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ─── Idempotency: drop replayed events ────────────────────
  // Stripe occasionally retries the same webhook (network blip, our 5xx, etc.).
  // Replaying creates double tenants, double Stripe sessions and double emails,
  // so we record every event ID and refuse to process it twice. The unique
  // index on (provider, eventId) is the source of truth — if the insert
  // raises P2002, the event has already been seen and we acknowledge it
  // with 200 so Stripe stops retrying.
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "stripe",
        eventId: event.id,
        eventType: event.type,
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      // Already processed — acknowledge silently so Stripe stops retrying
      return Response.json({ received: true, duplicate: true });
    }
    reportError(err, {
      scope: "stripe-webhook",
      tags: { stage: "idempotency-insert", eventType: event.type, eventId: event.id },
    });
    // Don't fail — try to process the event anyway. Worse to drop a real
    // payment event than to risk a double-process if the dedup table is down.
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
    reportError(err, {
      scope: "stripe-webhook",
      tags: { stage: "handler", eventType: event.type, eventId: event.id },
    });
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
  logEvent({ scope: "stripe-webhook", tags: { handler: "booking-fee-paid", bookingId, sessionId } }, "start");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { location: true, room: true },
  });

  if (!booking) {
    logWarn({ scope: "stripe-webhook", tags: { bookingId } }, "booking not found");
    return;
  }

  // Allow PENDING (Yousign webhook may not have fired yet) or SIGNED
  if (booking.status !== "SIGNED" && booking.status !== "PENDING") {
    logWarn(
      { scope: "stripe-webhook", tags: { bookingId, status: booking.status } },
      "unexpected booking status, skipping",
    );
    return;
  }

  const depositAmount = booking.depositAmount || 0;
  if (depositAmount <= 0) {
    reportError(new Error("Booking has no deposit amount"), {
      scope: "stripe-webhook",
      tags: { bookingId },
    });
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
      logEvent(
        { scope: "stripe-webhook", tags: { bookingId, sizeBytes: signedLeasePdf.length } },
        "downloaded signed lease from yousign",
      );
    } catch (err) {
      reportError(err, {
        scope: "stripe-webhook",
        tags: { stage: "yousign-download", bookingId },
      });
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
    success_url: `${env.NEXT_PUBLIC_BASE_URL}/move-in/deposit-success`,
    cancel_url: `${env.NEXT_PUBLIC_BASE_URL}/move-in?deposit=cancelled`,
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

  // Send deposit payment email (lease PDF moves to deposit confirmation email)
  try {
    await sendDepositPaymentLink({
      firstName: booking.firstName,
      email: booking.email,
      locationName: booking.location.name,
      roomCategory: booking.category,
      persons: booking.persons,
      moveInDate: booking.moveInDate?.toISOString().split("T")[0] ?? "",
      monthlyRent: booking.monthlyRent || 0,
      depositAmount,
      depositPaymentUrl: depositSession.url!,
      deadlineHours: DEPOSIT_DEADLINE_HOURS,
    });
  } catch (err) {
    reportError(err, {
      scope: "stripe-webhook",
      tags: { stage: "deposit-email", bookingId, email: booking.email },
    });
  }

  logEvent(
    { scope: "stripe-webhook", tags: { bookingId, deadline: deadline.toISOString() } },
    "booking fee paid, deposit link sent",
  );
}

// ─── Deposit Paid → Confirm Booking + Create Tenant ────────

async function handleDepositPaid(bookingId: string) {
  logEvent({ scope: "stripe-webhook", tags: { handler: "deposit-paid", bookingId } }, "start");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { location: true, room: { include: { tenant: true } } },
  });

  if (!booking || booking.status !== "DEPOSIT_PENDING") {
    logWarn(
      { scope: "stripe-webhook", tags: { bookingId, status: booking?.status ?? "missing" } },
      "booking not found or not in DEPOSIT_PENDING — skipping (likely replay)",
    );
    return;
  }

  if (!booking.roomId) {
    reportError(new Error("Booking has no room assigned"), {
      scope: "stripe-webhook",
      tags: { bookingId },
    });
    return;
  }

  // Transaction: delete old tenant if moved out, update booking, create new tenant
  let createdTenantId: string | null = null;
  await prisma.$transaction(async (tx: any) => {
    // Remove old tenant if their moveOut is on/before the new moveIn
    const oldTenant = booking.room?.tenant;
    if (oldTenant && oldTenant.moveOut && new Date(oldTenant.moveOut) <= booking.moveInDate!) {
      await tx.tenant.delete({ where: { id: oldTenant.id } });
      logEvent(
        { scope: "stripe-webhook", tags: { bookingId, deletedTenantId: oldTenant.id, room: booking.room?.roomNumber } },
        "deleted old tenant whose moveOut is on or before new moveIn",
      );
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
      reportError(err, {
        scope: "stripe-webhook",
        tags: { stage: "payment-setup-session", bookingId, tenantId: createdTenantId },
      });
    }
  }

  // Send single confirmation email (deposit + payment setup link)
  const moveInStr = booking.moveInDate
    ? booking.moveInDate.toISOString().split("T")[0]
    : "";

  // Download signed lease from Yousign to attach to confirmation email
  let signedLeasePdf: Buffer | undefined;
  if (booking.signatureRequestId && booking.signatureDocumentId) {
    try {
      const arrayBuffer = await downloadSignedDocument(
        booking.signatureRequestId,
        booking.signatureDocumentId
      );
      signedLeasePdf = Buffer.from(arrayBuffer);
    } catch (err) {
      reportError(err, {
        scope: "stripe-webhook",
        tags: { stage: "yousign-download-for-deposit-confirm", bookingId },
      });
    }
  }

  try {
    await sendDepositConfirmation({
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      locationName: booking.location.name,
      moveInDate: moveInStr,
      depositAmount: booking.depositAmount || 0,
      paymentSetupUrl,
      signedLeasePdf,
    });
  } catch (err) {
    reportError(err, {
      scope: "stripe-webhook",
      tags: { stage: "deposit-confirmation-email", bookingId, email: booking.email },
    });
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
      depositAmount: booking.depositAmount || 0,
    });
  } catch (err) {
    reportError(err, {
      scope: "stripe-webhook",
      tags: { stage: "team-notification", bookingId },
    });
  }

  logEvent(
    { scope: "stripe-webhook", tags: { bookingId, tenantId: createdTenantId, moveInDate: moveInStr } },
    "deposit paid, tenant created, booking confirmed",
  );
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

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card", "sepa_debit"],
    metadata: {
      type: "long_stay_payment_setup",
      tenantId: tenant.id,
    },
    success_url: `${env.NEXT_PUBLIC_BASE_URL}/move-in/payment-setup-success`,
    cancel_url: `${env.NEXT_PUBLIC_BASE_URL}/move-in/payment-setup-success?cancelled=1`,
  });

  return session.url!;
}

// ─── Payment Setup Completed → Save Default Payment Method ─

async function handlePaymentSetupCompleted(tenantId: string, session: any) {
  logEvent({ scope: "stripe-webhook", tags: { handler: "payment-setup-completed", tenantId } }, "start");

  // Get the SetupIntent from the session
  const setupIntentId = session.setup_intent;
  if (!setupIntentId) {
    reportError(new Error("Stripe session has no setup_intent"), {
      scope: "stripe-webhook",
      tags: { tenantId, sessionId: session.id },
    });
    return;
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const paymentMethodId = setupIntent.payment_method as string;

  if (!paymentMethodId) {
    reportError(new Error("SetupIntent has no payment_method"), {
      scope: "stripe-webhook",
      tags: { tenantId, setupIntentId },
    });
    return;
  }

  // Set as default payment method on Stripe Customer
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { room: { include: { apartment: { include: { location: true } } } } },
  });
  if (!tenant?.stripeCustomerId) {
    reportError(new Error("Tenant has no stripeCustomerId"), {
      scope: "stripe-webhook",
      tags: { tenantId },
    });
    return;
  }

  // Defensive idempotency: if this exact payment method is already set on
  // the tenant, the webhook is a replay — skip the update + the email so
  // the customer doesn't get a second "method confirmed" notification.
  if (tenant.sepaMandateId === paymentMethodId) {
    logWarn(
      { scope: "stripe-webhook", tags: { tenantId, paymentMethodId } },
      "payment method already saved, skipping replay",
    );
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

  // Determine payment method label for the email
  let methodLabel = "Payment method";
  try {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.type === "card" && pm.card) {
      methodLabel = `${pm.card.brand.toUpperCase()} ****${pm.card.last4}`;
    } else if (pm.type === "sepa_debit" && pm.sepa_debit) {
      methodLabel = `SEPA Direct Debit (****${pm.sepa_debit.last4})`;
    } else {
      methodLabel = pm.type.replace(/_/g, " ");
    }
  } catch (err) {
    reportError(err, {
      scope: "stripe-webhook",
      tags: { stage: "payment-method-retrieve", tenantId, paymentMethodId },
    });
  }

  // Send confirmation email
  try {
    await sendPaymentSetupConfirmation({
      firstName: tenant.firstName,
      email: tenant.email,
      locationName: tenant.room.apartment.location.name,
      monthlyRent: tenant.monthlyRent,
      paymentMethodLabel: methodLabel,
    });
  } catch (err) {
    reportError(err, {
      scope: "stripe-webhook",
      tags: { stage: "payment-setup-confirmation-email", tenantId, email: tenant.email },
    });
  }

  logEvent(
    { scope: "stripe-webhook", tags: { tenantId, paymentMethodId, methodLabel } },
    "payment method saved + confirmation sent",
  );
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
  logEvent(
    { scope: "stripe-webhook", tags: { handler: "rent-paid", rentPaymentId, amountEur: (amountReceived / 100).toFixed(2) } },
    "rent payment marked as PAID",
  );
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
  logWarn(
    { scope: "stripe-webhook", tags: { handler: "rent-failed", rentPaymentId, reason } },
    "rent payment marked as FAILED",
  );
}
