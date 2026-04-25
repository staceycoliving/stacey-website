import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { RoomCategory, BookingStatus } from "@/lib/generated/prisma/client";
import { isApaleoProperty, getShortStayAvailability as getApaleoAvailability } from "@/lib/apaleo";
import { reportError } from "@/lib/observability";
import { readLimiter, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiOk, apiBadRequest, apiNotFound, apiBadGateway } from "@/lib/api-response";

// Categories that allow 2 persons (from Zimmerübersicht photos)
const COUPLE_CATEGORIES: RoomCategory[] = [
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "PREMIUM_PLUS_BALCONY",
];

// ─── LONG Stay: availability based on tenant move-outs ──────

// Local date string (avoids UTC timezone shift from toISOString)
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

import { ROOM_BLOCKING_BOOKING_STATUSES } from "@/lib/booking-status";

// Active booking statuses that "reserve" a room. Shared with the booking
// flow and admin availability views.
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ROOM_BLOCKING_BOOKING_STATUSES;

async function getLongStayAvailability(
  locationId: string,
  persons: number
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all rooms with their tenants and active bookings
  const rooms = await prisma.room!.findMany({
    where: { apartment: { locationId } },
    include: {
      tenants: true,
      bookings: {
        where: {
          stayType: "LONG",
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
      },
      // Scheduled room transfers reserve the target room for a future tenant
      transfersTo: {
        where: { status: "SCHEDULED" },
        take: 1,
      },
      // Outbound transfers: tenant is leaving this room on transferDate
      transfersFrom: {
        where: { status: "SCHEDULED" },
        take: 1,
      },
    },
  });

  // Group by category, calculate move-in dates
  const categoryMap = new Map<
    RoomCategory,
    { total: number; freeNow: number; moveInDates: string[]; monthlyRent: number }
  >();

  for (const room of rooms) {
    // Filter by persons
    if (persons >= 2 && !COUPLE_CATEGORIES.includes(room.category)) continue;

    if (!categoryMap.has(room.category)) {
      categoryMap.set(room.category, { total: 0, freeNow: 0, moveInDates: [], monthlyRent: room.monthlyRent });
    }
    const entry = categoryMap.get(room.category)!;
    entry.total++;

    // Room has an active booking or scheduled transfer → not available
    if (room.bookings.length > 0) continue;
    if (room.transfersTo.length > 0) continue;

    const tenant = room.tenants[0];

    // If the tenant has a SCHEDULED outbound transfer, the room frees
    // up on the transfer date (not moveOut), the tenant is moving to
    // another room, not leaving the property.
    const outboundTransfer = room.transfersFrom[0];

    if (!tenant) {
      // Room is free now
      entry.freeNow++;
      entry.moveInDates.push(localDate(today));
    } else if (outboundTransfer) {
      // Tenant is transferring out on a specific date
      const transferDate = new Date(outboundTransfer.transferDate);
      transferDate.setHours(0, 0, 0, 0);
      if (transferDate <= today) {
        entry.freeNow++;
        entry.moveInDates.push(localDate(today));
      } else {
        const availFrom = new Date(transferDate);
        availFrom.setDate(availFrom.getDate() + 1);
        entry.moveInDates.push(localDate(availFrom));
      }
    } else if (tenant.moveOut) {
      const moveOutDate = new Date(tenant.moveOut);
      moveOutDate.setHours(0, 0, 0, 0);

      if (moveOutDate <= today) {
        // Tenant should have moved out already, treat as free
        entry.freeNow++;
        entry.moveInDates.push(localDate(today));
      } else {
        // Free after moveOut → available from moveOut+1
        const availFrom = new Date(moveOutDate);
        availFrom.setDate(availFrom.getDate() + 1);
        entry.moveInDates.push(localDate(availFrom));
      }
    }
    // No moveOut = occupied indefinitely → not available
  }

  const categories = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      freeNow: data.freeNow,
      moveInDates: [...new Set(data.moveInDates)].sort(),
      monthlyRent: data.monthlyRent,
    }))
    .filter((c) => c.moveInDates.length > 0)
    .sort((a, b) => b.freeNow - a.freeNow);

  return categories;
}

// ─── Route Handler ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(readLimiter, request);
  if (!limit.success) return rateLimitResponse(limit);

  const params = request.nextUrl.searchParams;
  const slug = params.get("location");
  const persons = Number(params.get("persons")) || 1;

  if (!slug) return apiBadRequest("location parameter required");

  // SHORT stay (apaleo), these slugs are NOT in the DB, they live only in apaleo
  if (isApaleoProperty(slug)) {
    const checkInStr = params.get("checkIn");
    const checkOutStr = params.get("checkOut");

    if (!checkInStr || !checkOutStr) {
      return apiBadRequest("checkIn and checkOut required for SHORT stay");
    }

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    // Validate min 5 nights
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights < 5) {
      return apiBadRequest("Minimum stay is 5 nights", { nights });
    }

    try {
      const categories = await getApaleoAvailability(slug, checkInStr, checkOutStr, persons);
      return apiOk({
        location: slug,
        stayType: "SHORT" as const,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        persons,
        nights,
        categories,
      });
    } catch (err) {
      reportError(err, {
        scope: "availability-apaleo",
        tags: { slug, persons, checkIn: checkInStr, checkOut: checkOutStr },
      });
      return apiBadGateway(
        "Failed to fetch availability",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // LONG stay, lookup in DB
  const location = await prisma.location.findUnique({ where: { slug } });
  if (!location) return apiNotFound(`Location "${slug}" not found`);

  const categories = await getLongStayAvailability(location.id, persons);

  return apiOk({
    location: slug,
    stayType: "LONG" as const,
    persons,
    categories,
  });
}
