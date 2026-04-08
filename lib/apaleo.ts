// ─── apaleo API Client ──────────────────────────────────────
// Handles OAuth token management and API calls for SHORT stay properties.
// Our API routes use this as a backend — the frontend never talks to apaleo directly.

const IDENTITY_URL = "https://identity.apaleo.com/connect/token";
const API_URL = "https://api.apaleo.com";

const CLIENT_ID = process.env.APALEO_CLIENT_ID!;
const CLIENT_SECRET = process.env.APALEO_CLIENT_SECRET!;

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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`apaleo API ${res.status}: ${body}`);
  }

  return res.json();
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

  // Fetch availability and offers in parallel
  const [availData, offersData] = await Promise.all([
    apiFetch(`/availability/v1/unit-groups?${new URLSearchParams({
      propertyId, from: checkIn, to: checkOut, adults: String(persons),
    })}`),
    apiFetch(`/booking/v1/offers?${new URLSearchParams({
      propertyId, arrival: checkIn, departure: checkOut, adults: String(persons),
    })}`),
  ]);

  const timeSlices = availData.timeSlices;
  if (!timeSlices?.length || !timeSlices[0]?.unitGroups) return [];

  const nights = timeSlices.length;
  const ratePlanCodes = RATE_PLAN_CODES[propertyId] || {};

  // Build price map from offers: category → per-night price (using our rate plan codes)
  const priceMap = new Map<string, number>();
  for (const offer of offersData.offers || []) {
    const category = APALEO_NAME_TO_CATEGORY[offer.unitGroup?.name];
    if (!category) continue;
    const expectedCode = ratePlanCodes[category];
    if (!expectedCode || offer.ratePlan?.code !== expectedCode) continue;
    // Per-night price = total / nights
    const perNight = Math.round((offer.totalGrossAmount.amount / nights) * 100) / 100;
    priceMap.set(category, perNight);
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

      const available = Math.max(0, minSellable === Infinity ? 0 : minSellable);

      return {
        category,
        total: physicalCount,
        booked: physicalCount - available,
        available,
        pricePerNight: priceMap.get(category) || null,
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
  phone: string;
  message?: string;
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
      "Idempotency-Key": `stacey-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      },
      reservations: [
        {
          arrival: params.checkIn,
          departure: params.checkOut,
          adults: params.persons,
          unitGroup: { id: unitGroupId },
          ratePlan: { id: offer.ratePlan?.id },
          totalGrossAmount: offer.totalGrossAmount,
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
