import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { RoomCategory } from "@/lib/generated/prisma/client";

// Categories that allow 2 persons (from Zimmerübersicht photos)
const COUPLE_CATEGORIES: RoomCategory[] = [
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "PREMIUM_PLUS_BALCONY",
];

// ─── SHORT Stay: availability for a date range ─────────────

async function getShortStayAvailability(
  locationId: string,
  checkIn: Date,
  checkOut: Date,
  persons: number
) {
  // Get all room capacities for this location
  const capacities = await prisma.roomCapacity.findMany({
    where: { locationId },
  });

  // Count overlapping bookings per category
  // A booking overlaps if: booking.checkIn < checkOut AND booking.checkOut > checkIn
  const overlapping = await prisma.booking.groupBy({
    by: ["category"],
    where: {
      locationId,
      stayType: "SHORT",
      status: { not: "CANCELLED" },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    _count: true,
  });

  const bookedMap = new Map(overlapping.map((o) => [o.category, o._count]));

  const categories = capacities
    .filter((cap) => {
      // Filter by persons: if 2 persons, only show couple-capable categories
      if (persons >= 2) return COUPLE_CATEGORIES.includes(cap.category);
      return true;
    })
    .map((cap) => {
      const booked = bookedMap.get(cap.category) || 0;
      const available = Math.max(0, cap.totalUnits - booked);
      return {
        category: cap.category,
        total: cap.totalUnits,
        booked,
        available,
      };
    })
    .sort((a, b) => b.available - a.available);

  return categories;
}

// ─── LONG Stay: availability based on tenant move-outs ──────

// Local date string (avoids UTC timezone shift from toISOString)
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getLongStayAvailability(
  locationId: string,
  persons: number
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  // Get all rooms for this location with their tenants and pending bookings
  const rooms = await prisma.room.findMany({
    where: { apartment: { locationId } },
    include: {
      tenant: true,
      bookings: {
        where: {
          stayType: "LONG",
          status: { not: "CANCELLED" },
        },
        orderBy: { moveInDate: "desc" },
        take: 1,
      },
    },
  });

  // Group by category, calculate move-in dates
  const categoryMap = new Map<
    RoomCategory,
    { total: number; freeNow: number; moveInDates: string[] }
  >();

  for (const room of rooms) {
    // Filter by persons
    if (persons >= 2 && !COUPLE_CATEGORIES.includes(room.category)) continue;

    if (!categoryMap.has(room.category)) {
      categoryMap.set(room.category, { total: 0, freeNow: 0, moveInDates: [] });
    }
    const entry = categoryMap.get(room.category)!;
    entry.total++;

    const tenant = room.tenant;

    if (!tenant) {
      // Room is free now
      entry.freeNow++;
      // Available from today to today+30
      entry.moveInDates.push(localDate(today));
    } else if (tenant.moveOut) {
      const moveOutDate = new Date(tenant.moveOut);
      moveOutDate.setHours(0, 0, 0, 0);

      if (moveOutDate <= today) {
        // Tenant should have moved out already — treat as free
        entry.freeNow++;
        entry.moveInDates.push(localDate(today));
      } else if (moveOutDate <= in30Days) {
        // Free within 30 days → available from moveOut+1
        const availFrom = new Date(moveOutDate);
        availFrom.setDate(availFrom.getDate() + 1);
        entry.moveInDates.push(localDate(availFrom));
      } else {
        // Free in >30 days → only moveOut+1
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
    }))
    .filter((c) => c.moveInDates.length > 0)
    .sort((a, b) => b.freeNow - a.freeNow);

  return categories;
}

// ─── Route Handler ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const slug = params.get("location");
  const persons = Number(params.get("persons")) || 1;

  if (!slug) {
    return Response.json({ error: "location parameter required" }, { status: 400 });
  }

  const location = await prisma.location.findUnique({ where: { slug } });
  if (!location) {
    return Response.json({ error: `Location "${slug}" not found` }, { status: 404 });
  }

  if (location.stayType === "SHORT") {
    const checkInStr = params.get("checkIn");
    const checkOutStr = params.get("checkOut");

    if (!checkInStr || !checkOutStr) {
      return Response.json(
        { error: "checkIn and checkOut required for SHORT stay" },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    // Validate min 5 nights
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights < 5) {
      return Response.json(
        { error: "Minimum stay is 5 nights", nights },
        { status: 400 }
      );
    }

    const categories = await getShortStayAvailability(
      location.id,
      checkIn,
      checkOut,
      persons
    );

    return Response.json({
      location: slug,
      stayType: "SHORT",
      checkIn: checkInStr,
      checkOut: checkOutStr,
      persons,
      nights,
      categories,
    });
  }

  // LONG stay
  const categories = await getLongStayAvailability(location.id, persons);

  return Response.json({
    location: slug,
    stayType: "LONG",
    persons,
    categories,
  });
}
