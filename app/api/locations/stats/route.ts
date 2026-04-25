import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isApaleoProperty,
  getShortStayCalendarAvailability,
} from "@/lib/apaleo";
import { ROOM_BLOCKING_BOOKING_STATUSES } from "@/lib/booking-status";
import { reportError } from "@/lib/observability";

// Per-location homepage card stats:
//   available    , rooms a guest could realistically check into within
//                   the next 14 days (LONG: room is free or current
//                   tenant has moveOut ≤ today+14; SHORT: # of (slug,
//                   category) slots apaleo says are sellable today)
//   newResidents , Tenants whose moveIn date sits in the last 30 days
//                   (LONG only, SHORT stays aren't "residents")
//   nextAvailable, fallback for cards with available=0: ISO date when
//                   inventory next opens up
//
// Edge-cached for 10 min so the homepage doesn't slam the DB / apaleo.

export const revalidate = 600;

type Stat = {
  slug: string;
  available: number;
  newResidents: number;
  nextAvailable: string | null;
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const stats: Record<string, Stat> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon14 = addDays(today, 14);
  const thirtyDaysAgo = addDays(today, -30);

  // ─── LONG locations from DB ───────────────────────────────
  try {
    const longLocations = await prisma.location.findMany({
      include: {
        apartments: {
          include: {
            rooms: {
              include: {
                tenants: { where: { archivedAt: null } },
                bookings: {
                  where: {
                    stayType: "LONG",
                    status: { in: ROOM_BLOCKING_BOOKING_STATUSES },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const loc of longLocations) {
      let available = 0;
      let nextAvailable: Date | null = null;

      for (const apt of loc.apartments) {
        for (const room of apt.rooms) {
          // Active booking blocks the room
          if (room.bookings.length > 0) continue;

          if (room.tenants.length === 0) {
            available++;
            continue;
          }

          // Find earliest moveOut among current tenants. If anyone is
          // open-ended (no moveOut), the room is occupied indefinitely.
          let earliest: Date | null = null;
          let openEnded = false;
          for (const t of room.tenants) {
            if (!t.moveOut) {
              openEnded = true;
              break;
            }
            const mo = new Date(t.moveOut);
            mo.setHours(0, 0, 0, 0);
            if (!earliest || mo < earliest) earliest = mo;
          }
          if (openEnded) continue;
          if (earliest && earliest <= horizon14) {
            available++;
          } else if (earliest) {
            if (!nextAvailable || earliest < nextAvailable) nextAvailable = earliest;
          }
        }
      }

      const newResidents = await prisma.tenant.count({
        where: {
          moveIn: { gte: thirtyDaysAgo },
          archivedAt: null,
          room: { apartment: { locationId: loc.id } },
        },
      });

      stats[loc.slug] = {
        slug: loc.slug,
        available,
        newResidents,
        nextAvailable: available > 0 ? null : nextAvailable ? fmtISO(nextAvailable) : null,
      };
    }
  } catch (err) {
    reportError(err, { scope: "locations-stats-long" });
  }

  // ─── SHORT locations from apaleo ──────────────────────────
  // We use the calendar endpoint (already optimised for portfolio
  // queries) and read out today's slot count + first available date.
  // newResidents is left at 0, SHORT stays come and go in days, the
  // "moved in this month" frame doesn't apply.
  const todayStr = todayLocal();
  const horizon30Str = fmtISO(addDays(today, 30));

  for (const slug of ["alster", "downtown"]) {
    if (!isApaleoProperty(slug)) continue;
    try {
      const data = await getShortStayCalendarAvailability(
        1,
        todayStr,
        horizon30Str,
        slug,
      );
      const todaySlots = data.availableSlotsPerDate[todayStr] ?? [];
      const available = todaySlots.length;

      let nextAvailable: string | null = null;
      if (available === 0) {
        const sortedDates = Object.keys(data.availableSlotsPerDate).sort();
        for (const date of sortedDates) {
          if ((data.availableSlotsPerDate[date] ?? []).length > 0) {
            nextAvailable = date;
            break;
          }
        }
      }

      stats[slug] = {
        slug,
        available,
        newResidents: 0,
        nextAvailable,
      };
    } catch (err) {
      reportError(err, { scope: "locations-stats-short", tags: { slug } });
      stats[slug] = { slug, available: 0, newResidents: 0, nextAvailable: null };
    }
  }

  return NextResponse.json({ ok: true, data: stats });
}
