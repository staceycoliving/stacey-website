import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ROOM_BLOCKING_BOOKING_STATUSES } from "@/lib/booking-status";

/**
 * GET /api/admin/bookings/[id]/room
 *   → list of rooms that could replace the current one
 *     (same category + location, free on the moveInDate).
 *
 * PATCH /api/admin/bookings/[id]/room
 *   body: { newRoomId, adjustRent: boolean }
 *
 *   Swaps the booking's room. Only allowed while booking is still
 *   pre-move-in (PENDING | SIGNED | PAID | DEPOSIT_PENDING | CONFIRMED
 *   with moveInDate >= today). If adjustRent=true, updates
 *   booking.monthlyRent to the new room's rent + 2p surcharge.
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: { include: { apartment: true } } },
  });
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  const moveIn = booking.moveInDate ? new Date(booking.moveInDate) : null;
  // Find rooms in same location + same category that are free on moveInDate
  const candidateRooms = await prisma.room.findMany({
    where: {
      status: "ACTIVE",
      category: booking.category,
      apartment: { locationId: booking.locationId },
    },
    include: {
      apartment: true,
      tenants: true,
      bookings: {
        where: {
          stayType: "LONG",
          status: { in: ROOM_BLOCKING_BOOKING_STATUSES },
          id: { not: id }, // exclude this booking
        },
      },
    },
    orderBy: { roomNumber: "asc" },
  });

  const available = candidateRooms.filter((r) => {
    // Room reserved by another active booking → not available
    if (r.bookings.length > 0) return false;
    const tenant = r.tenants[0];
    if (!tenant) return true;
    if (!tenant.moveOut) return false;
    if (!moveIn) return true;
    const mo = new Date(tenant.moveOut);
    mo.setHours(0, 0, 0, 0);
    const mi = new Date(moveIn);
    mi.setHours(0, 0, 0, 0);
    return mo <= mi;
  });

  return Response.json({
    currentRoomId: booking.roomId,
    currentRent: booking.monthlyRent,
    candidates: available.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      apartment: r.apartment.label ?? r.apartment.floor,
      monthlyRent: r.monthlyRent,
      current: r.id === booking.roomId,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { newRoomId, adjustRent } = await request.json();

  if (!newRoomId || typeof newRoomId !== "string") {
    return Response.json({ error: "newRoomId required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status === "CANCELLED") {
    return Response.json(
      { error: "Booking is cancelled — can't reassign" },
      { status: 400 }
    );
  }
  // If already a Tenant (post-move-in), refuse — use tenant transfer flow instead
  const tenant = await prisma.tenant.findUnique({ where: { bookingId: id } });
  if (tenant) {
    return Response.json(
      {
        error:
          "Tenant already exists for this booking — use Room Transfer in the folio instead",
      },
      { status: 400 }
    );
  }

  const newRoom = await prisma.room.findUnique({
    where: { id: newRoomId },
    include: { apartment: true },
  });
  if (!newRoom) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  // Compute new rent if admin asked to adjust
  let newMonthlyRent = booking.monthlyRent;
  if (adjustRent) {
    const couplesSurcharge = booking.persons >= 2 ? 5_000 : 0;
    newMonthlyRent = newRoom.monthlyRent + couplesSurcharge;
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      roomId: newRoomId,
      ...(adjustRent && newMonthlyRent !== null
        ? {
            monthlyRent: newMonthlyRent,
            depositAmount: newMonthlyRent * 2,
          }
        : {}),
    },
    include: { room: true },
  });

  await audit(request, {
    module: "booking",
    action: "reassign_room",
    entityType: "booking",
    entityId: id,
    summary: `Reassigned room for ${booking.firstName} ${booking.lastName}: ${
      booking.roomId ? `#${booking.roomId.slice(-6)}` : "—"
    } → #${newRoom.roomNumber}${adjustRent ? " (rent adjusted)" : " (rent kept)"}`,
    metadata: {
      oldRoomId: booking.roomId,
      newRoomId,
      adjustRent: Boolean(adjustRent),
      oldRent: booking.monthlyRent,
      newRent: newMonthlyRent,
    },
  });

  return Response.json({
    id: updated.id,
    roomId: updated.roomId,
    monthlyRent: updated.monthlyRent,
  });
}
