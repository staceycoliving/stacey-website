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
  const propertyId = params.get("property");

  const properties = propertyId ? [propertyId] : ["DOWNTOWN", "ALSTER"];
  const results: Record<string, unknown> = {};

  for (const prop of properties) {
    // Get CITY_TAX service detail
    const serviceRes = await fetch(`${API_URL}/rateplan/v1/services/${prop}-CITY_TAX`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let service = null;
    if (serviceRes.ok) {
      service = await serviceRes.json();
    } else {
      service = { error: `${serviceRes.status} ${await serviceRes.text()}` };
    }

    results[prop] = { cityTaxService: service };
  }

  return Response.json(results);
}
