import { getBaseNightlyPrices } from "@/lib/apaleo";
import { reportError } from "@/lib/observability";
import { apiOk, apiBadGateway } from "@/lib/api-response";

export async function GET() {
  try {
    const prices = await getBaseNightlyPrices();
    return apiOk(prices, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    reportError(err, { scope: "prices" });
    return apiBadGateway("Failed to fetch base prices");
  }
}
