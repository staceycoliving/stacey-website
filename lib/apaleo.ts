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

// ─── Public API ─────────────────────────────────────────────

export function isApaleoProperty(slug: string): boolean {
  return slug in PROPERTY_MAP;
}

export function getPropertyId(slug: string): string | null {
  return PROPERTY_MAP[slug] || null;
}

/**
 * Get availability for a SHORT stay property from apaleo.
 * Returns the same format as our DB-based availability.
 */
export async function getShortStayAvailability(
  slug: string,
  checkIn: string,
  checkOut: string,
  persons: number
) {
  const propertyId = PROPERTY_MAP[slug];
  if (!propertyId) throw new Error(`Unknown SHORT stay property: ${slug}`);

  const params = new URLSearchParams({
    propertyId,
    from: checkIn,
    to: checkOut,
    adults: String(persons),
  });

  const data = await apiFetch(`/availability/v1/unit-groups?${params}`);

  // apaleo returns timeslices — we take the first one (overall availability)
  const timeSlice = data.timeSlices?.[0];
  if (!timeSlice?.unitGroups) return [];

  const categories = timeSlice.unitGroups
    .map((g: { unitGroup: { name: string }; physicalCount: number; sellableCount: number }) => {
      const category = APALEO_NAME_TO_CATEGORY[g.unitGroup.name];
      if (!category) return null;

      // Filter couples
      if (persons >= 2 && !COUPLE_CATEGORIES.has(category)) return null;

      return {
        category,
        total: g.physicalCount,
        booked: g.physicalCount - Math.max(0, g.sellableCount),
        available: Math.max(0, g.sellableCount),
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

  // First get an offer to book against
  const offerParams = new URLSearchParams({
    propertyId,
    arrival: params.checkIn,
    departure: params.checkOut,
    adults: String(params.persons),
    unitGroupIds: unitGroupId,
  });

  const offers = await apiFetch(`/booking/v1/offers?${offerParams}`);
  const offer = offers.offers?.[0];

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
