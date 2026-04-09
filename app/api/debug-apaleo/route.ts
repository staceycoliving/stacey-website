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
    // Get all services (shows sub-account assignments)
    const servicesRes = await fetch(`${API_URL}/rateplan/v1/services?propertyId=${prop}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const servicesData = servicesRes.ok ? await servicesRes.json() : null;

    // Get all rate plans (shows sub-account assignments)
    const ratePlansRes = await fetch(`${API_URL}/rateplan/v1/rate-plans?propertyId=${prop}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ratePlansData = ratePlansRes.ok ? await ratePlansRes.json() : null;

    // Extract unique sub-accounts from services
    const serviceAccounts = (servicesData?.services || []).map((s: { code: string; name: { en?: string; de?: string }; accountingConfigs?: { subAccountId: string; vatType: string; validFrom: string }[] }) => ({
      serviceCode: s.code,
      serviceName: s.name?.de || s.name?.en,
      accounts: (s.accountingConfigs || []).map((a) => ({
        subAccountId: a.subAccountId,
        vatType: a.vatType,
        validFrom: a.validFrom,
      })),
    }));

    // Extract unique sub-accounts from rate plans
    const ratePlanAccounts = (ratePlansData?.ratePlans || []).map((rp: { code: string; name: { en?: string; de?: string }; accountingConfigs?: { subAccountId: string; vatType: string; validFrom: string }[] }) => ({
      ratePlanCode: rp.code,
      ratePlanName: rp.name?.de || rp.name?.en,
      accounts: (rp.accountingConfigs || []).map((a) => ({
        subAccountId: a.subAccountId,
        vatType: a.vatType,
        validFrom: a.validFrom,
      })),
    }));

    // Collect all unique sub-account IDs
    const allSubAccountIds = new Set<string>();
    for (const s of serviceAccounts) for (const a of s.accounts) allSubAccountIds.add(a.subAccountId);
    for (const rp of ratePlanAccounts) for (const a of rp.accounts) allSubAccountIds.add(a.subAccountId);

    results[prop] = {
      allSubAccountIds: [...allSubAccountIds].sort(),
      services: serviceAccounts,
      ratePlans: ratePlanAccounts,
    };
  }

  return Response.json(results);
}
