import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BookingStatus } from "@/lib/generated/prisma/client";

const VALID_STATUSES = new Set([
  "PENDING",
  "SIGNED",
  "PAID",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "CANCELLED",
]);

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId, status, cancellationReason } = await request.json();

  if (!bookingId || !status || !VALID_STATUSES.has(status)) {
    return Response.json(
      { error: "Invalid bookingId or status" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { status: status as BookingStatus };
  // Store cancellation reason only when transitioning to CANCELLED so we can
  // distinguish pre-confirmation cancels (deposit timeout, customer dropped)
  // from Widerruf (which is set by the /withdraw route with a specific reason).
  if (status === "CANCELLED") {
    data.cancellationReason =
      typeof cancellationReason === "string" && cancellationReason.trim()
        ? cancellationReason.trim()
        : "Cancelled by admin";
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data,
  });

  await audit(request, {
    module: "booking",
    action: status === "CANCELLED" ? "cancel" : "status_change",
    entityType: "booking",
    entityId: bookingId,
    summary: `Booking ${booking.id.slice(-8)} → ${status}${
      status === "CANCELLED" ? ` (${data.cancellationReason})` : ""
    }`,
    metadata: {
      status,
      cancellationReason: data.cancellationReason ?? null,
    },
  });

  return Response.json({
    id: booking.id,
    status: booking.status,
    cancellationReason: booking.cancellationReason,
  });
}
