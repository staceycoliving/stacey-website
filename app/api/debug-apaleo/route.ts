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
  const action = params.get("action") || "services";
  const propertyId = params.get("property") || "DOWNTOWN";

  if (action === "services") {
    // List all services for property
    const res = await fetch(`${API_URL}/rateplan/v1/services?propertyId=${propertyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return Response.json({ propertyId, services: data });
  }

  if (action === "accounts") {
    // Try multiple account endpoints
    const endpoints = [
      `/settings/v1/accounts?propertyId=${propertyId}`,
      `/finance/v1/sub-accounts?propertyId=${propertyId}`,
      `/settings/v1/sub-accounts?propertyId=${propertyId}`,
    ];
    const results: Record<string, unknown> = {};
    for (const ep of endpoints) {
      const res = await fetch(`${API_URL}${ep}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      try {
        results[ep] = { status: res.status, data: JSON.parse(text) };
      } catch {
        results[ep] = { status: res.status, raw: text };
      }
    }
    return Response.json({ propertyId, results });
  }

  if (action === "existing-service-detail") {
    // Get full detail of existing BOOKINGFEE service to see accountingConfigs format
    const res = await fetch(`${API_URL}/rateplan/v1/services/${propertyId}-BOOKINGFEE`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    try {
      return Response.json({ status: res.status, service: JSON.parse(text) });
    } catch {
      return Response.json({ status: res.status, raw: text });
    }
  }

  if (action === "create-service") {
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
      }),
    });
    const text = await res.text();
    try {
      return Response.json({ action: "create-service", propertyId, status: res.status, result: JSON.parse(text) });
    } catch {
      return Response.json({ action: "create-service", propertyId, status: res.status, raw: text });
    }
  }

  return Response.json({ error: "Unknown action" });
}
