import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const BOOKING_FEE = 19500; // €195.00 in cents

export async function POST(request: NextRequest) {
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
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If bookingId provided, verify booking exists and mark as SIGNED
    // (Frontend only calls this after Yousign signature, so we trust the flow)
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
      }
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

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return Response.json(
      { error: "Failed to create checkout session", details: String(err) },
      { status: 500 }
    );
  }
}
