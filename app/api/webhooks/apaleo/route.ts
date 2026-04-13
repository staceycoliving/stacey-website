import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getReservation } from "@/lib/apaleo";
import { locations } from "@/lib/data";
import { sendPreArrival, sendTeamNotification } from "@/lib/email";
import { canSendEmail, logSkipped } from "@/lib/test-mode";
import { env } from "@/lib/env";
import { reportError } from "@/lib/observability";

// apaleo sends webhook events when reservations change.
// We listen for unit assignment (room assigned) and immediately
// send the Pre-Arrival email if check-in is within 2 days.
// This handles:
// - Room assigned after daily cron already ran
// - Guest booked with < 1 day notice
// - Cron failure recovery

// apaleo healthcheck — must return 2xx for subscription creation
export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(request: NextRequest) {
  // Feature flag — disabled until manually enabled
  if (process.env.ENABLE_SHORT_STAY_EMAILS !== "true") {
    return Response.json({ ok: true, skipped: "short stay emails disabled" });
  }
  // Verify webhook secret (apaleo sends it as a query param or header)
  const secret = request.headers.get("x-webhook-secret")
    || request.nextUrl.searchParams.get("secret");
  if (env.APALEO_WEBHOOK_SECRET && secret !== env.APALEO_WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // apaleo webhook payload contains the event type and a list of affected entities
  // Exact format depends on apaleo subscription config — handle common patterns
  const eventType = body.type || body.eventType || "";
  const reservationId = body.data?.id
    || body.reservationId
    || body.entityId
    || "";

  if (!reservationId) {
    return Response.json({ ok: true, skipped: "no reservationId" });
  }

  // We only care about reservation modifications (unit assignment)
  // Accept any event type — we'll check the actual state from apaleo
  try {
    const reservation = await getReservation(reservationId);

    // No unit assigned → nothing to do
    if (!reservation.unitName) {
      return Response.json({ ok: true, skipped: "no unit assigned" });
    }

    // Check if check-in is within the next 2 days
    const now = new Date();
    const arrival = new Date(reservation.arrival);
    const daysUntilArrival = Math.floor(
      (arrival.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilArrival > 2) {
      // Too early — the daily cron will handle this closer to check-in
      return Response.json({ ok: true, skipped: "check-in > 2 days away" });
    }

    const locationName = locations.find(l => l.slug === reservation.locationSlug)?.name || reservation.locationSlug;

    // No guest email → notify team so they can add it manually
    if (!reservation.guestEmail) {
      sendTeamNotification({
        stayType: "SHORT",
        firstName: reservation.guestFirstName || "Unknown",
        lastName: reservation.guestLastName || "Guest",
        email: "no email provided",
        phone: "",
        locationName,
        category: reservation.category,
        persons: 1,
        checkIn: reservation.arrival,
        checkOut: reservation.departure,
        nights: Math.round((new Date(reservation.departure).getTime() - arrival.getTime()) / 86400000),
        bookingId: `⚠️ No guest email — Pre-Arrival not sent! Room ${reservation.unitName}, check-in ${reservation.arrival}`,
      }).catch((err) => console.error("Missing email team notif error:", err));

      return Response.json({ ok: true, skipped: "no guest email — team notified" });
    }

    // Check if pre-arrival was already sent
    const existing = await prisma.shortStayEmailLog.findUnique({
      where: { apaleoReservationId: reservation.id },
    });

    if (existing?.preArrivalSentAt) {
      return Response.json({ ok: true, skipped: "already sent" });
    }

    // Test mode check
    if (!canSendEmail(reservation.guestEmail)) {
      logSkipped(reservation.guestEmail, "SHORT pre-arrival (apaleo webhook)");
      return Response.json({ ok: true, skipped: "test-mode" });
    }

    const nights = Math.round(
      (new Date(reservation.departure).getTime() - arrival.getTime()) / 86400000
    );

    const locationAddress = locations.find(l => l.slug === reservation.locationSlug)?.address || "";

    // NOTE: Kiwi/Salto access is activated AFTER the guest completes the
    // Meldeschein form (POST /api/checkin), not here.

    await sendPreArrival({
      firstName: reservation.guestFirstName,
      lastName: reservation.guestLastName,
      email: reservation.guestEmail,
      locationName,
      locationAddress,
      locationSlug: reservation.locationSlug,
      roomNumber: reservation.unitName,
      checkIn: reservation.arrival,
      checkOut: reservation.departure,
      nights,
      reservationId: reservation.id,
    });

    // Track in DB
    await prisma.shortStayEmailLog.upsert({
      where: { apaleoReservationId: reservation.id },
      create: {
        apaleoReservationId: reservation.id,
        guestEmail: reservation.guestEmail,
        locationSlug: reservation.locationSlug,
        preArrivalSentAt: new Date(),
      },
      update: { preArrivalSentAt: new Date() },
    });

    return Response.json({ ok: true, sent: "pre-arrival" });
  } catch (err) {
    reportError(err, {
      scope: "apaleo-webhook",
      tags: { eventType, reservationId },
    });
    // Return 200 so apaleo doesn't retry endlessly
    return Response.json({ ok: false, error: "internal" });
  }
}
