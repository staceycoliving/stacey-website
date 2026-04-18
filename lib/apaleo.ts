// ─── apaleo API Client ──────────────────────────────────────
// Handles OAuth token management and API calls for SHORT stay properties.
// Our API routes use this as a backend — the frontend never talks to apaleo directly.

const IDENTITY_URL = "https://identity.apaleo.com/connect/token";
const API_URL = "https://api.apaleo.com";

import { env } from "./env";

const CLIENT_ID = env.APALEO_CLIENT_ID;
const CLIENT_SECRET = env.APALEO_CLIENT_SECRET;

// ─── Token Cache ────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  // Reuse token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const res = await fetch(IDENTITY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`apaleo auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`apaleo API ${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  if (!text) {
    throw new Error(`apaleo API empty body ${path}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`apaleo API invalid JSON ${path}: ${text.slice(0, 200)}`);
  }
}

// ─── Slug → Property ID mapping ─────────────────────────────

const PROPERTY_MAP: Record<string, string> = {
  alster: "ALSTER",
  downtown: "DOWNTOWN",
};

// ─── Category mapping: our RoomCategory enum ↔ apaleo unit group codes ───

const CATEGORY_TO_APALEO: Record<string, string> = {
  MIGHTY: "MIGHTY",
  PREMIUM: "PREMIUM",
  PREMIUM_BALCONY: "PREMIUMB",
  PREMIUM_PLUS: "PREMIUMPL",
  PREMIUM_PLUS_BALCONY: "PREMIUMPLB",
  JUMBO: "JUMBO",
  ENSUITE: "ENSUITE",
};

// Downtown uses PREMIUM_B instead of PREMIUMB
const CATEGORY_TO_APALEO_DOWNTOWN: Record<string, string> = {
  ...CATEGORY_TO_APALEO,
  PREMIUM_BALCONY: "PREMIUM_B",
};

// Reverse: apaleo unit group name → our category
const APALEO_NAME_TO_CATEGORY: Record<string, string> = {
  "Mighty": "MIGHTY",
  "Premium": "PREMIUM",
  "Premium Balcony": "PREMIUM_BALCONY",
  "Premium+": "PREMIUM_PLUS",
  "Premium+ Balcony": "PREMIUM_PLUS_BALCONY",
  "Jumbo": "JUMBO",
  "Ensuite": "ENSUITE",
};

const COUPLE_CATEGORIES = new Set(["JUMBO", "JUMBO_BALCONY", "STUDIO", "PREMIUM_PLUS_BALCONY", "ENSUITE"]);

// ─── Hamburg Kultur- und Tourismustaxe ──────────────────────
// Staffelung nach Brutto-Übernachtungspreis pro Zimmer pro Nacht.
// Gilt nur für Aufenthalte unter 2 Monaten (60 Nächte).
// Personenanzahl irrelevant — pro Zimmer gerechnet.
function calculateCityTaxPerNight(grossPerNight: number): number {
  if (grossPerNight <= 10) return 0;
  if (grossPerNight <= 25) return 0.60;
  if (grossPerNight <= 50) return 1.20;
  if (grossPerNight <= 100) return 2.40;
  if (grossPerNight <= 150) return 3.60;
  if (grossPerNight <= 200) return 4.80;
  if (grossPerNight <= 250) return 6.00;
  if (grossPerNight <= 300) return 7.20;
  // +1.20 per 50€ bracket
  return 7.20 + Math.ceil((grossPerNight - 300) / 50) * 1.20;
}

// ─── Rate plan codes for website pricing (per property) ─────

const RATE_PLAN_CODES: Record<string, Record<string, string>> = {
  ALSTER: {
    PREMIUM: "PREMIUM",
    PREMIUM_BALCONY: "PREMIUM_BALCONY",
    PREMIUM_PLUS: "PREMIUM_PLUS",
    PREMIUM_PLUS_BALCONY: "PREMIUM_PLUS_BALCONY",
    JUMBO: "JUMBO",
  },
  DOWNTOWN: {
    MIGHTY: "MIGHTY",
    PREMIUM: "PREMIUM",
    PREMIUM_BALCONY: "PREMIUM_BALCONY",
    PREMIUM_PLUS: "PREMIUMPL",
    JUMBO: "JUMBO",
  },
};

// ─── Public API ─────────────────────────────────────────────

// Reverse: property ID → slug
const PROPERTY_ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PROPERTY_MAP).map(([slug, id]) => [id, slug])
);

export function isApaleoProperty(slug: string): boolean {
  return slug in PROPERTY_MAP;
}

export function getPropertyId(slug: string): string | null {
  return PROPERTY_MAP[slug] || null;
}

/**
 * Get availability + prices for a SHORT stay property from apaleo.
 * Fetches availability (all nights) and offers (prices) in parallel.
 */
export async function getShortStayAvailability(
  slug: string,
  checkIn: string,
  checkOut: string,
  persons: number
) {
  const propertyId = PROPERTY_MAP[slug];
  if (!propertyId) throw new Error(`Unknown SHORT stay property: ${slug}`);

  // Fetch availability and offers in parallel.
  // apaleo sometimes returns an empty body for /booking/v1/offers when no rate plan
  // is configured for the requested date range — treat that as "no offers" instead
  // of an error (otherwise the whole availability call fails and the frontend has
  // to fall back to stale 1-person base prices).
  const [availData, offersData] = await Promise.all([
    apiFetch(`/availability/v1/unit-groups?${new URLSearchParams({
      propertyId, from: checkIn, to: checkOut, adults: String(persons),
    })}`),
    apiFetch(`/booking/v1/offers?${new URLSearchParams({
      propertyId, arrival: checkIn, departure: checkOut, adults: String(persons),
    })}`).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("empty body") || msg.includes("invalid JSON")) {
        return { offers: [] };
      }
      throw err;
    }),
  ]);

  const timeSlices = availData.timeSlices;
  if (!timeSlices?.length || !timeSlices[0]?.unitGroups) return [];

  // Calculate actual nights from dates (timeSlices.length counts days, not nights)
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  );
  const ratePlanCodes = RATE_PLAN_CODES[propertyId] || {};

  // Build price map from offers: category → pricing details
  type PriceInfo = {
    perNight: number;
    totalGross: number;
    netAmount: number;
    vatAmount: number;
    vatPercent: number;
    cityTaxTotal: number;
    grandTotal: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractPricing = (offer: any, n: number): PriceInfo => {
    const totalGross = offer.totalGrossAmount.amount;
    const tax = offer.taxDetails?.[0];
    const netAmount = tax?.net?.amount ?? totalGross;
    const vatAmount = tax?.tax?.amount ?? 0;
    const vatPercent = tax?.vatPercent ?? 7;
    const perNight = Math.round((totalGross / n) * 100) / 100;
    const cityTaxPerNight = n < 60 ? calculateCityTaxPerNight(perNight) : 0;
    const cityTaxTotal = Math.round(cityTaxPerNight * n * 100) / 100;
    return { perNight, totalGross, netAmount, vatAmount, vatPercent, cityTaxTotal, grandTotal: Math.round((totalGross + cityTaxTotal) * 100) / 100 };
  };
  const priceMap = new Map<string, PriceInfo>();
  for (const offer of offersData.offers || []) {
    const category = APALEO_NAME_TO_CATEGORY[offer.unitGroup?.name];
    if (!category) continue;
    const expectedCode = ratePlanCodes[category];
    if (!expectedCode || offer.ratePlan?.code !== expectedCode) continue;
    if (priceMap.has(category)) continue;
    priceMap.set(category, extractPricing(offer, nights));
  }

  // A room must be available for ALL nights — take the minimum sellable count across all timeslices
  const unitGroupNames = timeSlices[0].unitGroups.map(
    (g: { unitGroup: { name: string } }) => g.unitGroup.name
  );

  const categories = unitGroupNames
    .map((name: string) => {
      const category = APALEO_NAME_TO_CATEGORY[name];
      if (!category) return null;
      if (persons >= 2 && !COUPLE_CATEGORIES.has(category)) return null;

      let minSellable = Infinity;
      let physicalCount = 0;

      for (const ts of timeSlices) {
        const group = ts.unitGroups?.find(
          (g: { unitGroup: { name: string } }) => g.unitGroup.name === name
        );
        if (!group) { minSellable = 0; break; }
        physicalCount = group.physicalCount;
        minSellable = Math.min(minSellable, group.sellableCount);
      }

      const rawAvailable = Math.max(0, minSellable === Infinity ? 0 : minSellable);
      const price = priceMap.get(category);
      // No matching offer from our rate plan → not bookable (rate plan restrictions apply)
      const available = price ? rawAvailable : 0;
      return {
        category,
        total: physicalCount,
        booked: physicalCount - available,
        available,
        pricePerNight: price?.perNight || null,
        totalGross: price?.totalGross || null,
        netAmount: price?.netAmount || null,
        vatAmount: price?.vatAmount || null,
        vatPercent: price?.vatPercent || null,
        cityTaxTotal: price?.cityTaxTotal || null,
        grandTotal: price?.grandTotal || null,
      };
    })
    .filter(Boolean)
    .sort((a: { available: number }, b: { available: number }) => b.available - a.available);

  return categories;
}

/**
 * Create a SHORT stay reservation in apaleo.
 * Returns the apaleo booking/reservation ID.
 */
export async function createShortStayBooking(params: {
  slug: string;
  category: string;
  persons: number;
  checkIn: string;
  checkOut: string;
  firstName: string;
  lastName: string;
  email: string;
  idempotencyKey?: string;
  phone: string;
  message?: string;
  dateOfBirth?: string;
  street?: string;
  zipCode?: string;
  addressCity?: string;
  country?: string;
}) {
  const propertyId = PROPERTY_MAP[params.slug];
  if (!propertyId) throw new Error(`Unknown SHORT stay property: ${params.slug}`);

  // Get the apaleo unit group code
  const codeMap = propertyId === "DOWNTOWN" ? CATEGORY_TO_APALEO_DOWNTOWN : CATEGORY_TO_APALEO;
  const unitGroupCode = codeMap[params.category];
  if (!unitGroupCode) throw new Error(`Unknown category: ${params.category}`);

  const unitGroupId = `${propertyId}-${unitGroupCode}`;

  // Get offer with the correct rate plan for website bookings
  const offerParams = new URLSearchParams({
    propertyId,
    arrival: params.checkIn,
    departure: params.checkOut,
    adults: String(params.persons),
    unitGroupIds: unitGroupId,
  });

  const offers = await apiFetch(`/booking/v1/offers?${offerParams}`);

  // Find offer matching our rate plan code
  const ratePlanCodes = RATE_PLAN_CODES[propertyId] || {};
  const expectedCode = ratePlanCodes[params.category];
  const offer = (offers.offers || []).find(
    (o: { ratePlan?: { code: string } }) => o.ratePlan?.code === expectedCode
  ) || offers.offers?.[0];

  if (!offer) {
    throw new Error("NOT_AVAILABLE");
  }

  // Create the booking
  const booking = await apiFetch("/booking/v1/bookings", {
    method: "POST",
    headers: {
      "Idempotency-Key": params.idempotencyKey || `stacey-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      paymentAccount: {
        accountNumber: propertyId,
      },
      booker: {
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        ...(params.dateOfBirth ? { birthDate: params.dateOfBirth } : {}),
        ...(params.street ? {
          address: {
            addressLine1: params.street,
            postalCode: params.zipCode || "",
            city: params.addressCity || "",
            countryCode: params.country || "DE",
          },
        } : {}),
      },
      channelCode: "Direct",
      reservations: [
        {
          arrival: params.checkIn,
          departure: params.checkOut,
          adults: params.persons,
          channelCode: "Direct",
          unitGroup: { id: unitGroupId },
          ratePlan: { id: offer.ratePlan?.id },
          totalGrossAmount: offer.totalGrossAmount,
          timeSlices: (offer.timeSlices || []).map((ts: { from: string; to: string; grossAmount: { amount: number; currency: string } }) => ({
            ...ts,
            ratePlanId: offer.ratePlan?.id,
          })),
          comment: params.message || undefined,
        },
      ],
    }),
  });

  return {
    id: booking.id,
    reservationIds: booking.reservationIds,
  };
}

/**
 * After Stripe payment: create booking in apaleo, post city tax charge, record payment.
 */
export async function createPaidShortStayBooking(params: {
  slug: string;
  category: string;
  persons: number;
  checkIn: string;
  checkOut: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
  dateOfBirth?: string;
  street?: string;
  zipCode?: string;
  addressCity?: string;
  country?: string;
  totalAmountEur: number;
  cityTaxTotal: number;
  stripeSessionId: string;
}) {
  const propertyId = PROPERTY_MAP[params.slug];

  // 1. Create booking in apaleo (room rate only)
  // Stripe session ID as idempotency key → safe to retry without duplicates
  const booking = await createShortStayBooking({
    slug: params.slug,
    category: params.category,
    persons: params.persons,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    phone: params.phone,
    message: params.message,
    dateOfBirth: params.dateOfBirth,
    street: params.street,
    zipCode: params.zipCode,
    addressCity: params.addressCity,
    country: params.country,
    idempotencyKey: `stripe-${params.stripeSessionId}`,
  });

  // 2. Find the folio + post city tax + record payment
  const reservationId = booking.reservationIds?.[0]?.id || booking.reservationIds?.[0];
  if (reservationId) {
    // Folio might not be ready immediately — retry up to 3 times
    let folio = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const folios = await apiFetch(`/finance/v1/folios?reservationIds=${reservationId}`);
        folio = folios.folios?.[0];
        if (folio) break;
      } catch (err) {
        console.error(`Folio lookup attempt ${attempt + 1} failed:`, err);
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
    }

    if (folio) {
      // 2a. Post city tax as separate charge on folio
      if (params.cityTaxTotal > 0 && propertyId) {
        try {
          await apiFetch(`/finance/v1/folios/${folio.id}/charges`, {
            method: "POST",
            body: JSON.stringify({
              serviceId: `${propertyId}-CITY_TAX`,
              name: { en: "City Tax", de: "Kultur- und Tourismustaxe" },
              amount: {
                amount: params.cityTaxTotal,
                currency: "EUR",
              },
              quantity: 1,
              vatType: "Without",
            }),
          });
        } catch (err) {
          console.error("Failed to post city tax charge:", err);
        }
      }

      // 2b. Record full payment (room + city tax)
      await apiFetch(`/finance/v1/folios/${folio.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          method: "CreditCard",
          receipt: params.stripeSessionId,
          amount: {
            amount: params.totalAmountEur,
            currency: "EUR",
          },
        }),
      });
    } else {
      console.error("No folio found for reservation:", reservationId);
    }
  }

  return booking;
}

/**
 * Get base per-night prices for all SHORT stay properties.
 * Tries multiple date windows to find prices for all categories
 * (some may be sold out in near-term dates).
 * Returns: { alster: { PREMIUM: 63, JUMBO: 69, ... }, downtown: { ... } }
 */
/**
 * Get reservations filtered by arrival or departure date.
 * Used by the daily cron for SHORT stay lifecycle emails.
 */
export async function getReservations(params: {
  dateFilter: "arrival" | "departure";
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD (exclusive — will be converted to end-of-day datetime)
  status?: string; // e.g. "Confirmed", "InHouse", "CheckedOut"
}) {
  const propertyIds = Object.values(PROPERTY_MAP).join(",");
  // apaleo expects ISO 8601 datetime, not bare dates.
  // "from" = start of day, "to" = end of the last day in the range.
  const fromDt = `${params.from}T00:00:00Z`;
  const toDt = `${params.to}T23:59:59Z`;
  const query = new URLSearchParams({
    propertyIds,
    dateFilter: params.dateFilter === "arrival" ? "Arrival" : "Departure",
    from: fromDt,
    to: toDt,
    ...(params.status ? { status: params.status } : {}),
    pageSize: "100",
    expand: "unit",
  });

  const data = await apiFetch(`/booking/v1/reservations?${query}`);
  const reservations = data.reservations || [];

  return reservations.map((r: any) => ({
    id: r.id,
    bookingId: r.bookingId,
    arrival: r.arrival,
    departure: r.departure,
    status: r.status,
    guestFirstName: r.primaryGuest?.firstName || r.booker?.firstName || "",
    guestLastName: r.primaryGuest?.lastName || r.booker?.lastName || "",
    guestEmail: r.primaryGuest?.email || r.booker?.email || "",
    propertyId: r.property?.id || "",
    propertyName: r.property?.name || "",
    locationSlug: PROPERTY_ID_TO_SLUG[r.property?.id] || "",
    unitName: r.unit?.name || null, // Room number (null = not assigned)
    unitGroupName: r.unitGroup?.name || "",
    category: APALEO_NAME_TO_CATEGORY[r.unitGroup?.name] || r.unitGroup?.name || "",
  }));
}

/**
 * Get a single reservation by ID. Used by the apaleo webhook
 * to check if a unit was just assigned.
 */
export async function getReservation(reservationId: string) {
  const data = await apiFetch(`/booking/v1/reservations/${reservationId}?expand=unit`);
  return {
    id: data.id,
    bookingId: data.bookingId,
    arrival: data.arrival,
    departure: data.departure,
    status: data.status,
    guestFirstName: data.primaryGuest?.firstName || data.booker?.firstName || "",
    guestLastName: data.primaryGuest?.lastName || data.booker?.lastName || "",
    guestEmail: data.primaryGuest?.email || data.booker?.email || "",
    propertyId: data.property?.id || "",
    propertyName: data.property?.name || "",
    locationSlug: PROPERTY_ID_TO_SLUG[data.property?.id] || "",
    unitName: data.unit?.name || null,
    unitGroupName: data.unitGroup?.name || "",
    category: APALEO_NAME_TO_CATEGORY[data.unitGroup?.name] || data.unitGroup?.name || "",
  };
}

/**
 * Create an invoice for a folio and return the PDF.
 * Used after check-out to send the invoice to the guest.
 */
export async function createInvoiceAndGetPdf(reservationId: string): Promise<{
  pdf: Buffer;
  invoiceNumber: string;
} | null> {
  // 1. Find the folio for this reservation
  const folios = await apiFetch(`/finance/v1/folios?reservationIds=${reservationId}`);
  const folio = folios.folios?.[0];
  if (!folio) return null;

  // 2. Create invoice from folio
  const invoice = await apiFetch(`/finance/v1/invoices`, {
    method: "POST",
    body: JSON.stringify({ folioId: folio.id }),
  });

  if (!invoice?.id) return null;

  // 3. Download PDF
  const token = await getToken();
  const pdfRes = await fetch(`${API_URL}/finance/v1/invoices/${invoice.id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!pdfRes.ok) return null;

  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  return {
    pdf: pdfBuffer,
    invoiceNumber: invoice.number || invoice.id,
  };
}

export async function getBaseNightlyPrices(): Promise<Record<string, Record<string, number>>> {
  const result: Record<string, Record<string, number>> = {};
  const nights = 5;

  // Try 3 date windows: 2 weeks, 2 months, 6 months from now
  const windows = [14, 60, 180];

  const slugs = Object.keys(PROPERTY_MAP);
  const fetches = slugs.map(async (slug) => {
    const propertyId = PROPERTY_MAP[slug];
    const ratePlanCodes = RATE_PLAN_CODES[propertyId] || {};
    const prices: Record<string, number> = {};

    for (const daysAhead of windows) {
      const from = new Date();
      from.setDate(from.getDate() + daysAhead);
      const to = new Date(from);
      to.setDate(to.getDate() + nights);

      try {
        const offersData = await apiFetch(`/booking/v1/offers?${new URLSearchParams({
          propertyId, arrival: from.toISOString().slice(0, 10),
          departure: to.toISOString().slice(0, 10), adults: "1",
        })}`);

        for (const offer of offersData.offers || []) {
          const category = APALEO_NAME_TO_CATEGORY[offer.unitGroup?.name];
          if (!category || prices[category]) continue; // keep first (nearest) price
          const expectedCode = ratePlanCodes[category];
          if (!expectedCode || offer.ratePlan?.code !== expectedCode) continue;
          prices[category] = Math.round((offer.totalGrossAmount.amount / nights) * 100) / 100;
        }
      } catch {
        // continue to next window
      }

      // Stop early if we have all categories
      if (Object.keys(prices).length >= Object.keys(ratePlanCodes).length) break;
    }

    result[slug] = prices;
  });

  await Promise.all(fetches);
  return result;
}
