import { NextRequest } from "next/server";
import { prismaDirect as prisma } from "@/lib/db";
import { RoomCategory, BookingStatus } from "@/lib/generated/prisma/client";
import {
  sendShortStayConfirmation,
} from "@/lib/email";
import { isApaleoProperty, createShortStayBooking } from "@/lib/apaleo";
import { getLocationBySlug } from "@/lib/data";
import { reportError } from "@/lib/observability";
import { bookingLimiter, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiOk, apiBadRequest, apiNotFound, apiConflict, apiBadGateway, apiServerError } from "@/lib/api-response";
import { ROOM_BLOCKING_BOOKING_STATUSES } from "@/lib/booking-status";

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
  const limit = await checkRateLimit(bookingLimiter, request);
  if (!limit.success) return rateLimitResponse(limit);

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
      return apiBadRequest("Missing required fields: location, category, firstName, lastName, email");
    }

    if (!VALID_CATEGORIES.has(category)) {
      return apiBadRequest(`Invalid category: ${category}`);
    }

    // Couple check
    if (persons >= 2 && !COUPLE_CATEGORIES.includes(category as RoomCategory)) {
      return apiBadRequest(`Category ${category} does not support 2 persons`);
    }

    // ─── SHORT Stay Booking (apaleo, not in DB) ─────────────

    if (isApaleoProperty(slug)) {
      if (!checkIn || !checkOut) {
        return apiBadRequest("checkIn and checkOut required for SHORT stay");
      }

      const ciDate = new Date(checkIn);
      const coDate = new Date(checkOut);
      const nights = Math.round((coDate.getTime() - ciDate.getTime()) / 86400000);

      if (nights < 5) {
        return apiBadRequest("Minimum stay is 5 nights");
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
          locationAddress: staticLoc?.address ?? "",
          category,
          persons,
          checkIn,
          checkOut,
          nights,
          grandTotal: 0, // Price comes from Stripe session in checkout flow
          bookingId: apaleoBooking.id,
        }).catch((err) => console.error("Email error (guest):", err));

        // No team notification for SHORT stay — booking is visible in apaleo

        return apiOk({
          id: apaleoBooking.id,
          stayType: "SHORT" as const,
          location: slug,
          category,
          checkIn,
          checkOut,
          nights,
          status: "PENDING" as const,
        });
      } catch (err: any) {
        if (err.message === "NOT_AVAILABLE") {
          return apiConflict("NOT_AVAILABLE", "No availability for the selected category and dates");
        }
        reportError(err, {
          scope: "booking-short",
          tags: { slug, category, persons, email, checkIn, checkOut },
        });
        return apiBadGateway("Failed to create booking");
      }
    }

    // ─── LONG Stay Booking ──────────────────────────────────

    const location = await prisma.location.findUnique({ where: { slug } });
    if (!location) return apiNotFound(`Location "${slug}" not found`);

    if (!moveInDate) {
      return apiBadRequest("moveInDate required for LONG stay");
    }

    const miDate = new Date(moveInDate);

    // Active booking statuses that "reserve" a room (booking fee paid)
    const ACTIVE_STATUSES: BookingStatus[] = ROOM_BLOCKING_BOOKING_STATUSES;

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

    // No team notification at booking creation — team gets notified when deposit is paid (Stripe webhook)

    return apiOk({
      id: booking.id,
      stayType: "LONG" as const,
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
      return apiConflict("NOT_AVAILABLE", "No availability for the selected category and dates");
    }
    reportError(err, { scope: "booking-long" });
    return apiServerError("Failed to create booking", String(err));
  }
}

// ─── GET: Fetch booking by ID (for confirmation page) ──────

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiBadRequest("id parameter required");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { location: true, room: true },
  });

  if (!booking) return apiNotFound("Booking not found");

  return apiOk({
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
