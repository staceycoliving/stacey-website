import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createPaidShortStayBooking } from "@/lib/apaleo";
import { sendShortStayConfirmation, sendTeamNotification } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return Response.json({ error: "sessionId required" }, { status: 400 });
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return Response.json({ error: "Payment not completed" }, { status: 400 });
    }

    const m = session.metadata!;
    const nights = parseInt(m.nights);
    const totalAmountEur = (session.amount_total || 0) / 100;
    const cityTaxTotal = parseFloat(m.cityTaxTotal || "0");

    // Create booking + post city tax + record payment
    // Uses Stripe session ID as apaleo Idempotency-Key → safe to retry
    const booking = await createPaidShortStayBooking({
      slug: m.slug,
      category: m.category,
      persons: parseInt(m.persons),
      checkIn: m.checkIn,
      checkOut: m.checkOut,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      dateOfBirth: m.dateOfBirth || undefined,
      street: m.street || undefined,
      zipCode: m.zipCode || undefined,
      addressCity: m.addressCity || undefined,
      country: m.country || undefined,
      message: m.message || undefined,
      totalAmountEur,
      cityTaxTotal,
      stripeSessionId: sessionId,
    });

    // Send confirmation emails (fire-and-forget)
    sendShortStayConfirmation({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      locationName: m.locationName,
      category: m.category,
      persons: parseInt(m.persons),
      checkIn: m.checkIn,
      checkOut: m.checkOut,
      nights,
      bookingId: booking.id,
    }).catch((err) => console.error("Email error (guest):", err));

    sendTeamNotification({
      stayType: "SHORT",
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      locationName: m.locationName,
      category: m.category,
      persons: parseInt(m.persons),
      checkIn: m.checkIn,
      checkOut: m.checkOut,
      nights,
      bookingId: booking.id,
    }).catch((err) => console.error("Email error (team):", err));

    return Response.json({
      bookingId: booking.id,
      status: "confirmed",
      locationName: m.locationName,
      roomName: m.roomName,
      category: m.category,
      checkIn: m.checkIn,
      checkOut: m.checkOut,
      nights,
      persons: parseInt(m.persons),
      firstName: m.firstName,
      slug: m.slug,
      paymentStatus: booking.paymentStatus || null,
      totalAmountEur: (session.amount_total || 0) / 100,
    });
  } catch (err) {
    console.error("SHORT stay confirm error:", err);
    return Response.json(
      { error: "Failed to confirm booking", details: String(err) },
      { status: 500 }
    );
  }
}
