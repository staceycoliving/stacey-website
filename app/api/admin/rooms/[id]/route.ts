import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import type { RoomCategory, RoomStatus } from "@/lib/generated/prisma/client";

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
const STATUSES = new Set<RoomStatus>(["ACTIVE", "BLOCKED", "DEACTIVATED"]);

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.roomNumber === "string") data.roomNumber = body.roomNumber.trim();
  if (body.category && CATEGORIES.has(body.category)) data.category = body.category;
  if (body.monthlyRent !== undefined) {
    const cents = Math.round(Number(body.monthlyRent));
    if (Number.isFinite(cents) && cents >= 0) data.monthlyRent = cents;
  }
  if (body.status && STATUSES.has(body.status)) data.status = body.status;
  if (body.buildingAddress === null || typeof body.buildingAddress === "string")
    data.buildingAddress = body.buildingAddress ? String(body.buildingAddress).trim() : null;
  if (body.floorDescription === null || typeof body.floorDescription === "string")
    data.floorDescription = body.floorDescription ? String(body.floorDescription).trim() : null;

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No editable fields provided" }, { status: 400 });
  }

  await prisma.room.update({ where: { id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: { tenants: true, bookings: true },
  });
  if (!room) return Response.json({ error: "Room not found" }, { status: 404 });

  if (room.tenants.length > 0) {
    return Response.json(
      { error: "Room has an active tenant — remove tenant first or deactivate the room." },
      { status: 409 }
    );
  }
  if (room.bookings.length > 0) {
    return Response.json(
      { error: `Room has ${room.bookings.length} booking(s) — remove those first.` },
      { status: 409 }
    );
  }

  await prisma.room.delete({ where: { id } });
  return Response.json({ ok: true });
}
