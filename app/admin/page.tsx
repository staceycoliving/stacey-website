import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DashboardPage from "./DashboardPage";
import { expandMoveInDates, localDate } from "@/lib/availability";
import { ROOM_BLOCKING_BOOKING_STATUSES } from "@/lib/booking-status";

export const dynamic = "force-dynamic";

// Active booking statuses that reserve a room (single source of truth).
const ACTIVE_BOOKING_STATUSES = ROOM_BLOCKING_BOOKING_STATUSES;

export default async function AdminDashboardPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7Days = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in28Days = new Date(todayStart.getTime() + 28 * 24 * 60 * 60 * 1000);

  const [
    locations,
    roomsAll,
    tenantsActive,
    failedRents,
    pendingRents,
    depositTimeoutSoon,
    settlementsPending,
    missingSepa,
    moveInsUpcoming,
    moveOutsUpcoming,
  ] = await Promise.all([
    prisma.location.findMany({
      where: { stayType: "LONG" },
      orderBy: { name: "asc" },
    }),

    prisma.room.findMany({
      include: {
        tenant: true,
        apartment: { include: { location: true } },
        bookings: {
          where: {
            stayType: "LONG",
            status: { in: ACTIVE_BOOKING_STATUSES },
          },
        },
      },
    }),

    prisma.tenant.findMany({
      include: {
        room: { include: { apartment: { include: { location: true } } } },
      },
    }),

    prisma.rentPayment.findMany({
      where: { status: "FAILED" },
      include: { tenant: true },
      orderBy: { month: "desc" },
    }),

    prisma.rentPayment.findMany({
      where: { status: { in: ["PENDING", "FAILED", "PROCESSING", "PARTIAL"] } },
    }),

    prisma.booking.findMany({
      where: {
        status: "DEPOSIT_PENDING",
        depositDeadline: { lte: in24h, gte: now },
      },
      orderBy: { depositDeadline: "asc" },
    }),

    prisma.tenant.findMany({
      where: {
        moveOut: { lt: todayStart },
        depositStatus: "RECEIVED",
      },
      include: { room: { include: { apartment: { include: { location: true } } } } },
      orderBy: { moveOut: "asc" },
    }),

    prisma.tenant.findMany({
      where: {
        sepaMandateId: null,
        moveIn: { gte: todayStart, lte: in7Days },
      },
      include: { room: { include: { apartment: { include: { location: true } } } } },
      orderBy: { moveIn: "asc" },
    }),

    // Move-ins in the next 4 weeks
    prisma.tenant.findMany({
      where: { moveIn: { gte: todayStart, lte: in28Days } },
      include: { room: { include: { apartment: { include: { location: true } } } } },
      orderBy: { moveIn: "asc" },
    }),

    // Move-outs in the next 4 weeks
    prisma.tenant.findMany({
      where: { moveOut: { gte: todayStart, lte: in28Days } },
      include: { room: { include: { apartment: { include: { location: true } } } } },
      orderBy: { moveOut: "asc" },
    }),
  ]);

  // ─── KPIs ────────────────────────────────────────────────────────────
  // A room is "currently occupied" only if a tenant lives there AND their
  // moveOut isn't already in the past — otherwise the room is functionally
  // vacant (the public booking tool also treats it as available now).
  function isCurrentlyOccupied(r: typeof roomsAll[number]): boolean {
    if (!r.tenant) return false;
    if (r.tenant.moveOut && new Date(r.tenant.moveOut) <= todayStart) return false;
    return true;
  }

  const activeRooms = roomsAll.filter((r) => r.status === "ACTIVE");
  const occupiedRooms = activeRooms.filter(isCurrentlyOccupied);

  const openRentAmount = pendingRents.reduce(
    (sum, r) => sum + (r.amount - r.paidAmount),
    0
  );

  // ─── Occupancy + availability by location/category ──────────────────
  //
  // Same logic as the public booking tool (`/api/availability`):
  //  - A room is reserved if it has an active booking (PENDING..DEPOSIT_PENDING).
  //  - Else: no tenant = free today; tenant.moveOut in future = free from moveOut+1;
  //    tenant without moveOut = occupied indefinitely.
  //  - The 14-day flexibility rule (`expandMoveInDates`) expands the raw
  //    earliest-dates into all actually bookable days.

  const todayISO = localDate(new Date());

  const availabilityByLocation = locations.map((loc) => {
    const locRooms = activeRooms.filter((r) => r.apartment.locationId === loc.id);
    const occ = locRooms.filter(isCurrentlyOccupied).length;
    const pct = locRooms.length ? Math.round((occ / locRooms.length) * 100) : 0;

    type CatAccum = {
      total: number;
      indefinitelyBooked: number;
      reservedByBooking: number;
      earliestDates: string[]; // one entry per free/freeing room, deduped later
      minPrice: number | null;
    };

    const byCategory = new Map<string, CatAccum>();

    for (const r of locRooms) {
      const prev = byCategory.get(r.category) ?? {
        total: 0,
        indefinitelyBooked: 0,
        reservedByBooking: 0,
        earliestDates: [],
        minPrice: null,
      };
      prev.total += 1;
      if (prev.minPrice === null || r.monthlyRent < prev.minPrice) {
        prev.minPrice = r.monthlyRent;
      }

      // Reserved by an active booking → not available at all
      if (r.bookings.length > 0) {
        prev.reservedByBooking += 1;
        byCategory.set(r.category, prev);
        continue;
      }

      const tenant = r.tenant;
      if (!tenant) {
        prev.earliestDates.push(todayISO);
      } else if (tenant.moveOut) {
        const moveOut = new Date(tenant.moveOut);
        if (moveOut.getTime() <= todayStart.getTime()) {
          prev.earliestDates.push(todayISO);
        } else {
          const availFrom = new Date(moveOut);
          availFrom.setDate(availFrom.getDate() + 1);
          prev.earliestDates.push(localDate(availFrom));
        }
      } else {
        // Tenant without moveOut → indefinitely occupied
        prev.indefinitelyBooked += 1;
      }

      byCategory.set(r.category, prev);
    }

    const categories = Array.from(byCategory.entries())
      .map(([category, v]) => {
        const earliestUnique = [...new Set(v.earliestDates)].sort();
        // Expand earliest dates through the 14-day flexibility window
        const bookableDates = expandMoveInDates(earliestUnique);
        return {
          category,
          total: v.total,
          indefinitelyBooked: v.indefinitelyBooked,
          reservedByBooking: v.reservedByBooking,
          earliestDates: earliestUnique, // raw "free from" dates
          bookableDates, // days the category can be booked (flex applied)
          minPrice: v.minPrice,
        };
      })
      .sort((a, b) => {
        const aFirst = a.bookableDates[0] ?? "9999";
        const bFirst = b.bookableDates[0] ?? "9999";
        return aFirst.localeCompare(bFirst);
      });

    return {
      name: loc.name,
      slug: loc.slug,
      occupied: occ,
      total: locRooms.length,
      pct,
      categories,
    };
  });

  const totalActionItems =
    depositTimeoutSoon.length +
    failedRents.length +
    settlementsPending.length +
    missingSepa.length;

  return (
    <DashboardPage
      data={JSON.parse(
        JSON.stringify({
          kpi: {
            occupancy: {
              occupied: occupiedRooms.length,
              total: activeRooms.length,
              pct: activeRooms.length
                ? Math.round((occupiedRooms.length / activeRooms.length) * 100)
                : 0,
            },
            openRentAmount,
            totalActionItems,
          },
          availabilityByLocation,
          actionItems: {
            depositTimeoutSoon: depositTimeoutSoon.map((b) => ({
              id: b.id,
              name: `${b.firstName} ${b.lastName}`,
              deadline: b.depositDeadline,
            })),
            failedRents: failedRents.map((r) => ({
              id: r.id,
              tenantName: `${r.tenant.firstName} ${r.tenant.lastName}`,
              tenantId: r.tenantId,
              month: r.month,
              amount: r.amount,
              failureReason: r.failureReason,
            })),
            settlementsPending: settlementsPending.map((t) => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`,
              moveOut: t.moveOut,
              room: t.room
                ? `${t.room.apartment.location.name} · ${t.room.roomNumber}`
                : "—",
            })),
            missingSepa: missingSepa.map((t) => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`,
              moveIn: t.moveIn,
              room: t.room
                ? `${t.room.apartment.location.name} · ${t.room.roomNumber}`
                : "—",
            })),
          },
          schedule: {
            moveIns: moveInsUpcoming.map((t) => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`,
              date: t.moveIn,
              room: t.room
                ? `${t.room.apartment.location.name} · ${t.room.roomNumber}`
                : "—",
            })),
            moveOuts: moveOutsUpcoming.map((t) => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`,
              date: t.moveOut,
              room: t.room
                ? `${t.room.apartment.location.name} · ${t.room.roomNumber}`
                : "—",
            })),
          },
        })
      )}
    />
  );
}
