import { NextRequest } from "next/server";
import { isApaleoProperty, getShortStayAvailability } from "@/lib/apaleo";
import { stripe } from "@/lib/stripe";

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

    if (!isApaleoProperty(slug)) {
      return Response.json({ error: "Not an apaleo property" }, { status: 400 });
    }

    // Get pricing from apaleo
    const categories = await getShortStayAvailability(slug, checkIn, checkOut, persons || 1);
    const cat = categories.find((c: { category: string }) => c.category === category);
    if (!cat || cat.available <= 0) {
      return Response.json({ error: "No availability" }, { status: 409 });
    }
    if (!cat.grandTotal || !cat.totalGross) {
      return Response.json({ error: "Price not available" }, { status: 500 });
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

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("SHORT stay checkout error:", err);
    return Response.json(
      { error: "Failed to create checkout session", details: String(err) },
      { status: 500 }
    );
  }
}
