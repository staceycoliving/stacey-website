import { NextRequest } from "next/server";

const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY || "";
const YOUSIGN_BASE_URL = process.env.YOUSIGN_BASE_URL || "https://api-sandbox.yousign.app/v3";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const res = await fetch(`${YOUSIGN_BASE_URL}/signature_requests/${id}`, {
      headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` },
    });

    if (!res.ok) {
      return Response.json({ status: "unknown" });
    }

    const data = await res.json();
    // Yousign statuses: draft, ongoing, done, expired, canceled
    return Response.json({ status: data.status });
  } catch {
    return Response.json({ status: "unknown" });
  }
}
