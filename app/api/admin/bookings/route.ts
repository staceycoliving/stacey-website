import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { BookingStatus } from "@/lib/generated/prisma/client";

const VALID_STATUSES = new Set(["PENDING", "SIGNED", "PAID", "DEPOSIT_PENDING", "CONFIRMED", "CANCELLED"]);

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId, status } = await request.json();

  if (!bookingId || !status || !VALID_STATUSES.has(status)) {
    return Response.json({ error: "Invalid bookingId or status" }, { status: 400 });
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: status as BookingStatus },
  });

  return Response.json({ id: booking.id, status: booking.status });
}
