import { NextRequest } from "next/server";

const IDENTITY_URL = "https://identity.apaleo.com/connect/token";
const API_URL = "https://api.apaleo.com";

async function getToken(): Promise<string> {
  const res = await fetch(IDENTITY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.APALEO_CLIENT_ID!,
      client_secret: process.env.APALEO_CLIENT_SECRET!,
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  const token = await getToken();
  const params = request.nextUrl.searchParams;
  const propertyId = params.get("property") || "DOWNTOWN";

  // Get BOOKINGFEE service detail to see accountingConfigs format
  const serviceRes = await fetch(`${API_URL}/rateplan/v1/services/${propertyId}-BOOKINGFEE`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let serviceDetail = null;
  try { serviceDetail = await serviceRes.json(); } catch { /* */ }

  // Try creating CITY_TAX service with accountingConfigs based on BOOKINGFEE
  const subAccountId = serviceDetail?.subAccountId;

  return Response.json({
    propertyId,
    bookingFeeService: serviceDetail,
    subAccountId,
    hint: "Need to know accountingConfigs format to create CITY_TAX service",
  });
}

export async function POST(request: NextRequest) {
  const token = await getToken();
  const body = await request.json();
  const propertyId = body.property || "DOWNTOWN";

  // Create city tax service
  const res = await fetch(`${API_URL}/rateplan/v1/services`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "CITY_TAX",
      name: { en: "City Tax", de: "Kultur- und Tourismustaxe" },
      description: { en: "Hamburg City Tax (pass-through)", de: "Hamburger Kultur- und Tourismustaxe (Durchlaufposten)" },
      defaultGrossPrice: { amount: 0, currency: "EUR" },
      pricingUnit: "Room",
      postNextDay: false,
      serviceType: "Other",
      vatType: "Without",
      propertyId,
      availability: {
        mode: "Daily",
        daysOfWeek: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
      },
      channelCodes: ["Direct"],
      accountingConfigs: body.accountingConfigs || [],
    }),
  });
  const text = await res.text();
  try {
    return Response.json({ status: res.status, result: JSON.parse(text) });
  } catch {
    return Response.json({ status: res.status, raw: text });
  }
}
