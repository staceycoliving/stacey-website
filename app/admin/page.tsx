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
  const in90Days = new Date(todayStart.getTime() + 90 * 24 * 60 * 60 * 1000);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Split into smaller batches so we don't overwhelm the connection pool.
  // The admin dashboard is read-heavy; each query is tiny, but running 10
  // in parallel against Supabase's direct-connection limit has bitten us.

  // Batch 1: core inventory + raw rent stats
  const [locations, roomsAll, openRentSum] = await Promise.all([
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

    // Aggregate instead of loading every unpaid RentPayment row
    prisma.rentPayment.aggregate({
      where: {
        status: { in: ["PENDING", "FAILED", "PROCESSING", "PARTIAL"] },
      },
      _sum: { amount: true, paidAmount: true },
    }),
  ]);

  // Batch 2: action items (4 small queries)
  const [failedRents, depositTimeoutSoon, settlementsPending, missingSepa] =
    await Promise.all([
      prisma.rentPayment.findMany({
        where: { status: "FAILED" },
        include: { tenant: true },
        orderBy: { month: "desc" },
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
    ]);

  // Batch 3: upcoming schedule
  const [moveInsUpcoming, moveOutsUpcoming] = await Promise.all([
    prisma.tenant.findMany({
      where: { moveIn: { gte: todayStart, lte: in28Days } },
      include: { room: { include: { apartment: { include: { location: true } } } } },
      orderBy: { moveIn: "asc" },
    }),

    prisma.tenant.findMany({
      where: { moveOut: { gte: todayStart, lte: in28Days } },
      include: { room: { include: { apartment: { include: { location: true } } } } },
      orderBy: { moveOut: "asc" },
    }),
  ]);

  // Batch 4: rent (base + bundled adjustments) + notice pipeline
  const [currentMonthRents, noticePipelineRaw] = await Promise.all([
    prisma.rentPayment.findMany({
      where: {
        month: { gte: currentMonthStart, lt: nextMonthStart },
      },
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        status: true,
        tenantId: true,
        stripePaymentIntentId: true,
      },
    }),

    // Notice pipeline: tenants leaving within the next 90 days. We filter
    // in code to keep only rooms WITHOUT a replacement booking in the
    // pipeline — those are the real revenue-at-risk items.
    prisma.tenant.findMany({
      where: {
        moveOut: { gte: todayStart, lte: in90Days },
      },
      include: {
        room: {
          include: {
            apartment: { include: { location: true } },
            bookings: {
              where: {
                stayType: "LONG",
                status: { in: ACTIVE_BOOKING_STATUSES },
              },
            },
          },
        },
      },
      orderBy: { moveOut: "asc" },
    }),
  ]);

  // Bundled NEXT_RENT adjustments linked to any of this month's rent
  // PaymentIntents. Same PI → same cycle → counts in this month's rent.
  const currentMonthRentPIs = currentMonthRents
    .map((r) => r.stripePaymentIntentId)
    .filter((id): id is string => Boolean(id));
  const bundledAdjustments =
    currentMonthRentPIs.length > 0
      ? await prisma.extraCharge.findMany({
          where: {
            chargeOn: "NEXT_RENT",
            stripePaymentIntentId: { in: currentMonthRentPIs },
          },
          select: {
            amount: true,
            type: true,
            paidAt: true,
            stripePaymentIntentId: true,
          },
        })
      : [];

  // ─── Monatsmiete (current month) ──────────────────────────────────
  const baseRentExpected = currentMonthRents.reduce((s, r) => s + r.amount, 0);
  const baseRentCollected = currentMonthRents.reduce(
    (s, r) => s + r.paidAmount,
    0
  );
  const adjExpectedSigned = bundledAdjustments.reduce(
    (s, a) => s + (a.type === "DISCOUNT" ? -a.amount : a.amount),
    0
  );
  // Adjustments are only "collected" once paidAt is set (set by the
  // webhook when Stripe confirms the bundled PI).
  const adjCollectedSigned = bundledAdjustments
    .filter((a) => a.paidAt)
    .reduce((s, a) => s + (a.type === "DISCOUNT" ? -a.amount : a.amount), 0);

  const rentExpectedCents = baseRentExpected + adjExpectedSigned;
  const rentCollectedCents = baseRentCollected + adjCollectedSigned;
  const rentOpenCents = Math.max(0, rentExpectedCents - rentCollectedCents);
  const rentTenantsWithOpen = new Set(
    currentMonthRents
      .filter((r) => r.status !== "PAID" && r.amount > r.paidAmount)
      .map((r) => r.tenantId)
  ).size;

  // ─── Notice pipeline: keep only rooms without replacement ───────────
  const noticePipeline = noticePipelineRaw
    .filter((t) => {
      if (!t.moveOut || !t.room) return false;
      const outDate = new Date(t.moveOut).getTime();
      // Any active booking on this room with moveInDate > current moveOut
      // means a replacement is already lined up — exclude from pipeline.
      return !t.room.bookings.some((b) => {
        if (!b.moveInDate) return false;
        return new Date(b.moveInDate).getTime() > outDate;
      });
    })
    .map((t) => {
      const outMs = new Date(t.moveOut!).getTime();
      const daysAway = Math.max(
        0,
        Math.floor((outMs - todayStart.getTime()) / (24 * 60 * 60 * 1000))
      );
      return {
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        moveOut: t.moveOut,
        room: t.room
          ? `${t.room.apartment.location.name} · ${t.room.roomNumber}`
          : "—",
        monthlyRent: t.monthlyRent,
        daysAway,
      };
    });

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

  // Occupancy snapshot at an arbitrary date: tenant whose window covers
  // the date, or else an active booking (DEPOSIT_PENDING) that has
  // already reserved the room for that period.
  function isRoomOccupiedAt(
    r: (typeof roomsAll)[number],
    snapshotDate: Date
  ): boolean {
    const tenant = r.tenant;
    if (tenant) {
      const mIn = new Date(tenant.moveIn);
      mIn.setHours(0, 0, 0, 0);
      const mOut = tenant.moveOut ? new Date(tenant.moveOut) : null;
      if (mOut) mOut.setHours(0, 0, 0, 0);
      if (mIn.getTime() <= snapshotDate.getTime()) {
        if (!mOut || mOut.getTime() > snapshotDate.getTime()) return true;
      }
    }
    // Future booking covers this date? (bookings don't have an end date
    // in our model — treat them as indefinitely reserved from moveInDate.)
    return r.bookings.some((b) => {
      if (!b.moveInDate) return false;
      const bIn = new Date(b.moveInDate);
      bIn.setHours(0, 0, 0, 0);
      return bIn.getTime() <= snapshotDate.getTime();
    });
  }

  const openRentAmount =
    (openRentSum._sum.amount ?? 0) - (openRentSum._sum.paidAmount ?? 0);

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
      city: loc.city,
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
            occupancy3Months: [
              // Current = live snapshot (today)
              {
                label: "Jetzt",
                date: todayStart,
              },
              // Future months = 1st-of-month snapshot (start-of-month baseline)
              {
                label: new Date(
                  now.getFullYear(),
                  now.getMonth() + 1,
                  1
                ).toLocaleDateString("de-DE", { month: "short" }),
                date: new Date(now.getFullYear(), now.getMonth() + 1, 1),
              },
              {
                label: new Date(
                  now.getFullYear(),
                  now.getMonth() + 2,
                  1
                ).toLocaleDateString("de-DE", { month: "short" }),
                date: new Date(now.getFullYear(), now.getMonth() + 2, 1),
              },
            ].map((snap) => {
              const occ = activeRooms.filter((r) =>
                isRoomOccupiedAt(r, snap.date)
              ).length;
              const total = activeRooms.length;
              return {
                label: snap.label,
                occupied: occ,
                total,
                free: total - occ,
                pct: total ? Math.round((occ / total) * 100) : 0,
              };
            }),
            monthlyRent: {
              monthLabel: currentMonthStart.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              }),
              expectedCents: rentExpectedCents,
              collectedCents: rentCollectedCents,
              openCents: rentOpenCents,
              tenantsWithOpen: rentTenantsWithOpen,
            },
            openRentAmount,
            totalActionItems,
          },
          noticePipeline,
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
