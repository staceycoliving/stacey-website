import { getBaseNightlyPrices } from "@/lib/apaleo";

export async function GET() {
  try {
    const prices = await getBaseNightlyPrices();
    return Response.json(prices, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    console.error("Base prices error:", err);
    return Response.json({}, { status: 502 });
  }
}
