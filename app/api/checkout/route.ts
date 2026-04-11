import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { bookingLimiter, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { reportError } from "@/lib/observability";
import { apiOk, apiBadRequest, apiNotFound, apiServerError } from "@/lib/api-response";

const BOOKING_FEE = 19500; // €195.00 in cents

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(bookingLimiter, request);
  if (!limit.success) return rateLimitResponse(limit);

  try {
    const body = await request.json();

    const {
      bookingId,
      locationName,
      roomName,
      monthlyRent,
      moveInDate,
      firstName,
      lastName,
      email,
    } = body;

    if (!locationName || !roomName || !email) {
      return apiBadRequest("Missing required fields");
    }

    // If bookingId provided, verify booking exists and mark as SIGNED
    // (Frontend only calls this after Yousign signature, so we trust the flow)
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return apiNotFound("Booking not found");
      // Mark as SIGNED if not already (handles missing Yousign webhook)
      if (booking.status === "PENDING") {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "SIGNED" },
        });
      }
    }

    const origin = request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Booking fee",
              description: `STACEY ${locationName} · ${roomName} · Move-in ${moveInDate}`,
            },
            unit_amount: BOOKING_FEE,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "long_stay_booking_fee",
        bookingId: bookingId || "",
        locationName,
        roomName,
        monthlyRent: String(monthlyRent),
        moveInDate,
        tenantName: `${firstName} ${lastName}`,
        tenantEmail: email,
      },
      success_url: `${origin}/move-in?payment=success&booking_id=${bookingId || ""}`,
      cancel_url: `${origin}/move-in?payment=cancelled`,
    });

    // Store session ID on booking
    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { bookingFeeSessionId: session.id },
      });
    }

    return apiOk({ url: session.url });
  } catch (err) {
    reportError(err, { scope: "checkout-long" });
    return apiServerError("Failed to create checkout session", String(err));
  }
}
