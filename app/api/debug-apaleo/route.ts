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
  const params = request.nextUrl.searchParams;
  const propertyId = params.get("property") || "DOWNTOWN";
  const checkIn = params.get("checkIn") || "2026-04-09";
  const checkOut = params.get("checkOut") || "2026-04-16";

  const token = await getToken();

  const offersRes = await fetch(`${API_URL}/booking/v1/offers?${new URLSearchParams({
    propertyId, arrival: checkIn, departure: checkOut, adults: "1",
  })}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  const offersData = await offersRes.json();

  // Extract just what we need to debug
  const offers = (offersData.offers || []).map((o: {
    unitGroup?: { id: string; name: string };
    ratePlan?: { id: string; code: string; name: string };
    totalGrossAmount?: { amount: number };
  }) => ({
    unitGroup: o.unitGroup?.name,
    unitGroupId: o.unitGroup?.id,
    ratePlanCode: o.ratePlan?.code,
    ratePlanName: o.ratePlan?.name,
    ratePlanId: o.ratePlan?.id,
    totalGross: o.totalGrossAmount?.amount,
  }));

  return Response.json({ propertyId, checkIn, checkOut, totalOffers: offers.length, offers });
}
