import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendDepositTimeoutNotification, sendTeamNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends Authorization header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all bookings with expired deposit deadline
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: "DEPOSIT_PENDING",
      depositDeadline: { lt: now },
    },
    include: { location: true },
  });

  if (expiredBookings.length === 0) {
    return Response.json({ message: "No expired deposits", count: 0 });
  }

  let cancelled = 0;

  for (const booking of expiredBookings) {
    // Cancel booking (room is freed because availability checks booking status)
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    // Notify guest
    sendDepositTimeoutNotification({
      firstName: booking.firstName,
      email: booking.email,
      locationName: booking.location.name,
    }).catch((err) => console.error("Deposit timeout email error:", err));

    // Notify team
    sendTeamNotification({
      stayType: "LONG",
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      phone: booking.phone,
      locationName: booking.location.name,
      category: booking.category,
      persons: booking.persons,
      moveInDate: booking.moveInDate?.toISOString().split("T")[0],
      bookingId: booking.id,
    }).catch((err) => console.error("Team notification error:", err));

    cancelled++;
    console.log(`Booking ${booking.id}: deposit timeout, cancelled`);
  }

  return Response.json({ message: `Cancelled ${cancelled} expired bookings`, count: cancelled });
}
