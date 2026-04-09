import { NextRequest } from "next/server";
import Stripe from "stripe";
import { isApaleoProperty, getShortStayAvailability } from "@/lib/apaleo";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      location: slug,
      category,
      persons,
      checkIn,
      checkOut,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      street,
      zipCode,
      addressCity,
      country,
      moveInReason,
      message,
      locationName,
      roomName,
    } = body;

    if (!slug || !category || !checkIn || !checkOut || !firstName || !lastName || !email) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const nights = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    if (nights < 5) {
      return Response.json({ error: "Minimum stay is 5 nights" }, { status: 400 });
    }

    // Get the per-night price from apaleo offers
    let totalAmountCents: number;
    if (isApaleoProperty(slug)) {
      const categories = await getShortStayAvailability(slug, checkIn, checkOut, persons || 1);
      const cat = categories.find((c: { category: string }) => c.category === category);
      if (!cat || cat.available <= 0) {
        return Response.json({ error: "No availability" }, { status: 409 });
      }
      if (!cat.pricePerNight) {
        return Response.json({ error: "Price not available" }, { status: 500 });
      }
      totalAmountCents = Math.round(cat.pricePerNight * nights * 100);
    } else {
      return Response.json({ error: "Not an apaleo property" }, { status: 400 });
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
              name: `STACEY ${locationName} · ${roomName}`,
              description: `${nights} nights · ${new Date(checkIn).toLocaleDateString("en-GB")} – ${new Date(checkOut).toLocaleDateString("en-GB")}`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "short_stay",
        slug,
        category,
        persons: String(persons || 1),
        checkIn,
        checkOut,
        nights: String(nights),
        firstName,
        lastName,
        email,
        phone: phone || "",
        dateOfBirth: dateOfBirth || "",
        street: street || "",
        zipCode: zipCode || "",
        addressCity: addressCity || "",
        country: country || "",
        moveInReason: moveInReason || "",
        message: message || "",
        locationName: locationName || "",
        roomName: roomName || "",
      },
      success_url: `${origin}/move-in?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/move-in?payment=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("SHORT stay checkout error:", err);
    return Response.json(
      { error: "Failed to create checkout session", details: String(err) },
      { status: 500 }
    );
  }
}
