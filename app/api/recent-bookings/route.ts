import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ROOM_BLOCKING_BOOKING_STATUSES } from "@/lib/booking-status";
import { reportError } from "@/lib/observability";

// Last-24h committed bookings, anonymised (location name + minutes ago).
// Powers the navbar's "Just booked · {city} · {ago}" rotating badge.
// Empty array signals the navbar to fall back to its heritage line ,
// same response shape on hard failure too, so the navbar treats them
// identically.
//
// Edge-cached 60s: fresh enough for "just booked" to feel live, cheap
// enough that every nav render doesn't slam the DB.

export const revalidate = 60;

type Entry = { location: string; agoMin: number };

export async function GET() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: ROOM_BLOCKING_BOOKING_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { location: { select: { name: true } } },
    });

    const now = Date.now();
    const data: Entry[] = bookings
      .map((b) => ({
        location: b.location?.name ?? "",
        agoMin: Math.max(
          1,
          Math.floor((now - new Date(b.createdAt).getTime()) / 60000),
        ),
      }))
      .filter((e) => e.location.length > 0);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    reportError(err, { scope: "recent-bookings" });
    // Same shape as success-empty so the consumer doesn't need a
    // separate error branch, falls through to the heritage line.
    return NextResponse.json({ ok: true, data: [] });
  }
}
