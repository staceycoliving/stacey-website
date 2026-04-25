import { NextRequest } from "next/server";
import { createPaidShortStayBooking } from "@/lib/apaleo";
import { sendShortStayConfirmation } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { reportError } from "@/lib/observability";
import { apiOk, apiBadRequest, apiServerError } from "@/lib/api-response";
import { locations } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) return apiBadRequest("sessionId required");

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return apiBadRequest("Payment not completed");
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
    const loc = locations.find((l) => l.slug === m.slug);
    sendShortStayConfirmation({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      locationName: m.locationName,
      locationAddress: loc?.address ?? "",
      category: m.category,
      persons: parseInt(m.persons),
      checkIn: m.checkIn,
      checkOut: m.checkOut,
      nights,
      grandTotal: totalAmountEur,
      bookingId: booking.id,
    }).catch((err) => console.error("Email error (guest):", err));

    // No team notification for SHORT stay, booking is visible in apaleo

    return apiOk({
      bookingId: booking.id,
      status: "confirmed" as const,
      locationName: m.locationName,
      roomName: m.roomName,
      category: m.category,
      checkIn: m.checkIn,
      checkOut: m.checkOut,
      nights,
      persons: parseInt(m.persons),
      firstName: m.firstName,
      slug: m.slug,
    });
  } catch (err) {
    reportError(err, { scope: "checkout-short-confirm" });
    return apiServerError("Failed to confirm booking", String(err));
  }
}
