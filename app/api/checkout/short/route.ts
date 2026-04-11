import { NextRequest } from "next/server";
import { isApaleoProperty, getShortStayAvailability } from "@/lib/apaleo";
import { stripe } from "@/lib/stripe";
import { reportError } from "@/lib/observability";
import { bookingLimiter, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiOk, apiBadRequest, apiConflict, apiServerError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(bookingLimiter, request);
  if (!limit.success) return rateLimitResponse(limit);

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
      return apiBadRequest("Missing required fields");
    }

    const nights = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    if (nights < 5) return apiBadRequest("Minimum stay is 5 nights");

    if (!isApaleoProperty(slug)) return apiBadRequest("Not an apaleo property");

    // Get pricing from apaleo
    const categories = await getShortStayAvailability(slug, checkIn, checkOut, persons || 1);
    const cat = categories.find((c: { category: string }) => c.category === category);
    if (!cat || cat.available <= 0) {
      return apiConflict("NOT_AVAILABLE", "No availability");
    }
    if (!cat.grandTotal || !cat.totalGross) {
      return apiServerError("Price not available");
    }

    // Split: room rate (totalGross) and city tax (separate)
    const roomRateCents = Math.round(cat.totalGross * 100);
    const cityTaxCents = Math.round((cat.cityTaxTotal || 0) * 100);

    const origin = request.nextUrl.origin;
    const dateRange = `${new Date(checkIn).toLocaleDateString("en-GB")} – ${new Date(checkOut).toLocaleDateString("en-GB")}`;

    // Build Stripe line items: room + city tax (if applicable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: any[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `STACEY ${locationName} · ${roomName}`,
            description: `${nights} nights · ${dateRange} · incl. 7% VAT`,
          },
          unit_amount: roomRateCents,
        },
        quantity: 1,
      },
    ];

    if (cityTaxCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Kultur- und Tourismustaxe",
            description: `Hamburg city tax · ${nights} nights`,
          },
          unit_amount: cityTaxCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
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
        roomRateGross: String(cat.totalGross),
        cityTaxTotal: String(cat.cityTaxTotal || 0),
      },
      success_url: `${origin}/move-in?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/move-in?payment=cancelled`,
    });

    return apiOk({ url: session.url });
  } catch (err) {
    reportError(err, { scope: "checkout-short" });
    return apiServerError("Failed to create checkout session", String(err));
  }
}
