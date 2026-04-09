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
    // List accounts/sub-accounts
    const res = await fetch(`${API_URL}/finance/v1/accounts?propertyId=${propertyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return Response.json({ propertyId, accounts: data });
  }

  return Response.json({ error: "Unknown action" });
}
