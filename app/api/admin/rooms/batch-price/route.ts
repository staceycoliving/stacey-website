import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { RoomCategory } from "@/lib/generated/prisma/client";

const CATEGORIES = new Set<RoomCategory>([
  "BASIC_PLUS",
  "MIGHTY",
  "PREMIUM",
  "PREMIUM_PLUS",
  "PREMIUM_BALCONY",
  "PREMIUM_PLUS_BALCONY",
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "DUPLEX",
]);

/**
 * POST /api/admin/rooms/batch-price
 *
 * Body: { locationId, category, monthlyRent }
 *
 * Updates Room.monthlyRent for every room matching locationId + category.
 * Does NOT touch Tenant.monthlyRent, that's a snapshot at lease signing,
 * existing contracts stay on their agreed price.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { locationId, category, monthlyRent } = await request.json();

  if (!locationId || !category) {
    return Response.json({ error: "locationId, category required" }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  const cents = Math.round(Number(monthlyRent));
  if (!Number.isFinite(cents) || cents < 0) {
    return Response.json({ error: "monthlyRent must be non-negative integer cents" }, { status: 400 });
  }

  const { count } = await prisma.room.updateMany({
    where: {
      category,
      apartment: { locationId: String(locationId) },
    },
    data: { monthlyRent: cents },
  });

  await audit(request, {
    module: "rooms",
    action: "batch_price",
    entityType: "location",
    entityId: String(locationId),
    summary: `Batch price update: ${category} → €${(cents / 100).toFixed(2)} (${count} rooms)`,
    metadata: { category, monthlyRent: cents, updated: count },
  });

  return Response.json({ ok: true, updated: count });
}
