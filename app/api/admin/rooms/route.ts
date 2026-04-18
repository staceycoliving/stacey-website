import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import type { RoomCategory } from "@/lib/generated/prisma/client";

const CATEGORIES: RoomCategory[] = [
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
];

/**
 * GET /api/admin/rooms?locationId=<id>
 * Returns apartments + rooms for a location (used by the transfer modal).
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const locationId = request.nextUrl.searchParams.get("locationId");
  if (!locationId) {
    return Response.json({ error: "locationId required" }, { status: 400 });
  }
  const apartments = await prisma.apartment.findMany({
    where: { locationId },
    include: {
      rooms: {
        include: { tenants: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { roomNumber: "asc" },
      },
    },
    orderBy: { houseNumber: "asc" },
  });
  return Response.json({ apartments });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    apartmentId,
    roomNumber,
    category,
    monthlyRent,
    buildingAddress,
    floorDescription,
  } = body;

  if (!apartmentId || !roomNumber || !category) {
    return Response.json(
      { error: "apartmentId, roomNumber, category required" },
      { status: 400 }
    );
  }
  if (!CATEGORIES.includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  const rentCents = Math.round(Number(monthlyRent ?? 0));
  if (!Number.isFinite(rentCents) || rentCents < 0) {
    return Response.json({ error: "monthlyRent must be non-negative integer cents" }, { status: 400 });
  }

  const room = await prisma.room.create({
    data: {
      apartmentId: String(apartmentId),
      roomNumber: String(roomNumber).trim(),
      category,
      monthlyRent: rentCents,
      buildingAddress: buildingAddress ? String(buildingAddress).trim() : null,
      floorDescription: floorDescription ? String(floorDescription).trim() : null,
    },
  });

  return Response.json({ id: room.id });
}
