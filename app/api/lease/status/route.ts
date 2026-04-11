import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { apiOk, apiBadRequest } from "@/lib/api-response";

const YOUSIGN_API_KEY = env.YOUSIGN_API_KEY;
const YOUSIGN_BASE_URL = env.YOUSIGN_BASE_URL;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiBadRequest("Missing id");

  try {
    const res = await fetch(`${YOUSIGN_BASE_URL}/signature_requests/${id}`, {
      headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` },
    });

    if (!res.ok) return apiOk({ status: "unknown" as const });

    const data = await res.json();
    // Yousign statuses: draft, ongoing, done, expired, canceled
    return apiOk({ status: data.status as string });
  } catch {
    return apiOk({ status: "unknown" as const });
  }
}
