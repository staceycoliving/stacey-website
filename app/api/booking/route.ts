import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { RoomCategory, BookingStatus } from "@/lib/generated/prisma/client";
import {
  sendShortStayConfirmation,
  sendLongStayConfirmation,
  sendTeamNotification,
} from "@/lib/email";
import { isApaleoProperty, createShortStayBooking } from "@/lib/apaleo";

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

    const location = await prisma.location.findUnique({ where: { slug } });
    if (!location) {
      return Response.json({ error: `Location "${slug}" not found` }, { status: 404 });
    }

    // ─── SHORT Stay Booking ─────────────────────────────────

    if (location.stayType === "SHORT") {
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

      // Use apaleo for SHORT stay bookings
      if (isApaleoProperty(slug)) {
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
            locationName: location.name,
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
            locationName: location.name,
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
          console.error("apaleo booking error:", err);
          return Response.json(
            { error: "Failed to create booking" },
            { status: 502 }
          );
        }
      }

      // Fallback: DB-based booking (legacy)
      const booking = await prisma.$transaction(async (tx) => {
        const booked = await tx.booking.count({
          where: {
            locationId: location.id,
            category: category as RoomCategory,
            stayType: "SHORT",
            status: { not: "CANCELLED" },
            checkIn: { lt: coDate },
            checkOut: { gt: ciDate },
          },
        });

        const capacity = await tx.roomCapacity.findFirst({
          where: {
            locationId: location.id,
            category: category as RoomCategory,
          },
        });

        if (!capacity || booked >= capacity.totalUnits) {
          throw new Error("NOT_AVAILABLE");
        }

        return tx.booking.create({
          data: {
            locationId: location.id,
            stayType: "SHORT",
            category: category as RoomCategory,
            persons,
            checkIn: ciDate,
            checkOut: coDate,
            firstName,
            lastName,
            email,
            phone: phone || "",
            message: message || null,
            status: "PENDING",
          },
        });
      });

      // Send emails (fire & forget)
      sendShortStayConfirmation({
        firstName,
        lastName,
        email,
        locationName: location.name,
        category,
        persons,
        checkIn,
        checkOut,
        nights,
        bookingId: booking.id,
      }).catch((err) => console.error("Email error (guest):", err));

      sendTeamNotification({
        stayType: "SHORT",
        firstName,
        lastName,
        email,
        phone,
        locationName: location.name,
        category,
        persons,
        checkIn,
        checkOut,
        nights,
        bookingId: booking.id,
      }).catch((err) => console.error("Email error (team):", err));

      return Response.json({
        id: booking.id,
        stayType: "SHORT",
        location: slug,
        category,
        checkIn,
        checkOut,
        nights,
        status: booking.status,
      });
    }

    // ─── LONG Stay Booking ──────────────────────────────────

    if (!moveInDate) {
      return Response.json(
        { error: "moveInDate required for LONG stay" },
        { status: 400 }
      );
    }

    const miDate = new Date(moveInDate);

    const booking = await prisma.$transaction(async (tx) => {
      // Count total rooms of this category at this location
      const totalRooms = await tx.room.count({
        where: {
          apartment: { locationId: location.id },
          category: category as RoomCategory,
        },
      });

      if (totalRooms === 0) {
        throw new Error("NOT_AVAILABLE");
      }

      // Count rooms occupied at the requested move-in date
      // (tenant exists AND (no moveOut OR moveOut >= moveInDate))
      const occupied = await tx.room.count({
        where: {
          apartment: { locationId: location.id },
          category: category as RoomCategory,
          tenant: {
            OR: [
              { moveOut: null },
              { moveOut: { gte: miDate } },
            ],
          },
        },
      });

      // Count pending LONG bookings (not yet assigned a room)
      const pendingBookings = await tx.booking.count({
        where: {
          locationId: location.id,
          category: category as RoomCategory,
          stayType: "LONG",
          status: { notIn: ["CANCELLED"] },
          roomId: null,
        },
      });

      const available = totalRooms - occupied - pendingBookings;
      if (available <= 0) {
        throw new Error("NOT_AVAILABLE");
      }

      return tx.booking.create({
        data: {
          locationId: location.id,
          stayType: "LONG",
          category: category as RoomCategory,
          persons,
          moveInDate: miDate,
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
      });
    });

    // Send emails (fire & forget)
    sendLongStayConfirmation({
      firstName,
      lastName,
      email,
      locationName: location.name,
      category,
      persons,
      moveInDate,
      bookingId: booking.id,
    }).catch((err) => console.error("Email error (guest):", err));

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
      status: booking.status,
    });
  } catch (err: any) {
    if (err.message === "NOT_AVAILABLE") {
      return Response.json(
        { error: "No availability for the selected category and dates" },
        { status: 409 }
      );
    }
    console.error("Booking error:", err);
    return Response.json(
      { error: "Failed to create booking", details: String(err) },
      { status: 500 }
    );
  }
}
