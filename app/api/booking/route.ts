import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { RoomCategory, BookingStatus } from "@/lib/generated/prisma/client";
import {
  sendShortStayConfirmation,
  sendTeamNotification,
} from "@/lib/email";
import { isApaleoProperty, createShortStayBooking } from "@/lib/apaleo";
import { getLocationBySlug } from "@/lib/data";
import { reportError } from "@/lib/observability";

const COUPLE_CATEGORIES: RoomCategory[] = [
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "PREMIUM_PLUS_BALCONY",
];

const VALID_CATEGORIES = new Set<string>([
  "BASIC_PLUS", "MIGHTY", "PREMIUM", "PREMIUM_PLUS",
  "PREMIUM_BALCONY", "PREMIUM_PLUS_BALCONY",
  "JUMBO", "JUMBO_BALCONY", "STUDIO", "DUPLEX",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      location: slug,
      category,
      persons = 1,
      // SHORT stay
      checkIn,
      checkOut,
      // LONG stay
      moveInDate,
      // Personal data
      firstName,
      lastName,
      email,
      phone,
      // LONG stay extras
      dateOfBirth,
      street,
      zipCode,
      addressCity,
      country,
      moveInReason,
      message,
    } = body;

    // ─── Validate required fields ───────────────────────────

    if (!slug || !category || !firstName || !lastName || !email) {
      return Response.json(
        { error: "Missing required fields: location, category, firstName, lastName, email" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      return Response.json({ error: `Invalid category: ${category}` }, { status: 400 });
    }

    // Couple check
    if (persons >= 2 && !COUPLE_CATEGORIES.includes(category as RoomCategory)) {
      return Response.json(
        { error: `Category ${category} does not support 2 persons` },
        { status: 400 }
      );
    }

    // ─── SHORT Stay Booking (apaleo, not in DB) ─────────────

    if (isApaleoProperty(slug)) {
      if (!checkIn || !checkOut) {
        return Response.json(
          { error: "checkIn and checkOut required for SHORT stay" },
          { status: 400 }
        );
      }

      const ciDate = new Date(checkIn);
      const coDate = new Date(checkOut);
      const nights = Math.round((coDate.getTime() - ciDate.getTime()) / 86400000);

      if (nights < 5) {
        return Response.json({ error: "Minimum stay is 5 nights" }, { status: 400 });
      }

      const staticLoc = getLocationBySlug(slug);
      const locationName = staticLoc?.name ?? slug;

      try {
        const apaleoBooking = await createShortStayBooking({
          slug,
          category,
          persons,
          checkIn,
          checkOut,
          firstName,
          lastName,
          email,
          phone: phone || "",
          message,
        });

        // Send confirmation emails (fire & forget)
        sendShortStayConfirmation({
          firstName,
          lastName,
          email,
          locationName,
          category,
          persons,
          checkIn,
          checkOut,
          nights,
          bookingId: apaleoBooking.id,
        }).catch((err) => console.error("Email error (guest):", err));

        sendTeamNotification({
          stayType: "SHORT",
          firstName,
          lastName,
          email,
          phone,
          locationName,
          category,
          persons,
          checkIn,
          checkOut,
          nights,
          bookingId: apaleoBooking.id,
        }).catch((err) => console.error("Email error (team):", err));

        return Response.json({
          id: apaleoBooking.id,
          stayType: "SHORT",
          location: slug,
          category,
          checkIn,
          checkOut,
          nights,
          status: "PENDING",
        });
      } catch (err: any) {
        if (err.message === "NOT_AVAILABLE") {
          return Response.json(
            { error: "No availability for the selected category and dates" },
            { status: 409 }
          );
        }
        reportError(err, {
          scope: "booking-short",
          tags: { slug, category, persons, email, checkIn, checkOut },
        });
        return Response.json(
          { error: "Failed to create booking" },
          { status: 502 }
        );
      }
    }

    // ─── LONG Stay Booking ──────────────────────────────────

    const location = await prisma.location.findUnique({ where: { slug } });
    if (!location) {
      return Response.json({ error: `Location "${slug}" not found` }, { status: 404 });
    }

    if (!moveInDate) {
      return Response.json(
        { error: "moveInDate required for LONG stay" },
        { status: 400 }
      );
    }

    const miDate = new Date(moveInDate);

    // Active booking statuses that "reserve" a room
    const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "SIGNED", "PAID", "DEPOSIT_PENDING"];

    const booking = await prisma.$transaction(async (tx: any) => {
      // Find all eligible rooms: matching category, at this location
      const allRooms = await tx.room.findMany({
        where: {
          apartment: { locationId: location.id },
          category: category as RoomCategory,
        },
        include: {
          tenant: true,
          bookings: {
            where: {
              stayType: "LONG",
              status: { in: ACTIVE_STATUSES },
            },
          },
        },
      });

      if (allRooms.length === 0) {
        throw new Error("NOT_AVAILABLE");
      }

      // Filter to rooms that are free on the requested moveInDate
      const freeRooms = allRooms.filter((room: any) => {
        // Room has active booking → not available
        if (room.bookings.length > 0) return false;

        const tenant = room.tenant;
        if (!tenant) return true; // No tenant → free
        if (!tenant.moveOut) return false; // Occupied indefinitely
        // Tenant has moveOut: room is free if moveOut <= moveInDate
        const moveOutDate = new Date(tenant.moveOut);
        moveOutDate.setHours(0, 0, 0, 0);
        return moveOutDate <= miDate;
      });

      if (freeRooms.length === 0) {
        throw new Error("NOT_AVAILABLE");
      }

      // Random assignment from available rooms
      const assignedRoom = freeRooms[Math.floor(Math.random() * freeRooms.length)];

      // €50 Aufpreis pro Monat für 2 Personen
      const couplesSurcharge = persons >= 2 ? 5000 : 0;
      const rent = assignedRoom.monthlyRent + couplesSurcharge;

      return tx.booking.create({
        data: {
          locationId: location.id,
          stayType: "LONG",
          category: category as RoomCategory,
          persons,
          moveInDate: miDate,
          roomId: assignedRoom.id,
          monthlyRent: rent,
          depositAmount: rent * 2, // 2× Monatsmiete
          firstName,
          lastName,
          email,
          phone: phone || "",
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          street: street || null,
          zipCode: zipCode || null,
          addressCity: addressCity || null,
          country: country || null,
          moveInReason: moveInReason || null,
          message: message || null,
          status: "PENDING",
        },
        include: { room: true },
      });
    });

    // Team notification only — guest email comes after deposit payment (via Stripe webhook)
    sendTeamNotification({
      stayType: "LONG",
      firstName,
      lastName,
      email,
      phone,
      locationName: location.name,
      category,
      persons,
      moveInDate,
      bookingId: booking.id,
    }).catch((err) => console.error("Email error (team):", err));

    return Response.json({
      id: booking.id,
      stayType: "LONG",
      location: slug,
      category,
      moveInDate,
      roomNumber: booking.room?.roomNumber || null,
      monthlyRent: booking.monthlyRent,
      depositAmount: booking.depositAmount,
      status: booking.status,
    });
  } catch (err: any) {
    if (err.message === "NOT_AVAILABLE") {
      return Response.json(
        { error: "No availability for the selected category and dates" },
        { status: 409 }
      );
    }
    reportError(err, { scope: "booking-long" });
    return Response.json(
      { error: "Failed to create booking", details: String(err) },
      { status: 500 }
    );
  }
}

// ─── GET: Fetch booking by ID (for confirmation page) ──────

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id parameter required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { location: true, room: true },
  });

  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  return Response.json({
    id: booking.id,
    stayType: booking.stayType,
    location: booking.location.slug,
    locationName: booking.location.name,
    category: booking.category,
    persons: booking.persons,
    moveInDate: booking.moveInDate?.toISOString().split("T")[0] || null,
    roomNumber: booking.room?.roomNumber || null,
    monthlyRent: booking.monthlyRent,
    depositAmount: booking.depositAmount,
    firstName: booking.firstName,
    status: booking.status,
  });
}
