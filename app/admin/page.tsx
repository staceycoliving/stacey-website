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
  const in30Days = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);
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

  // Batch 3: upcoming move-ins + recent audit + new bookings + defects + funnel + pinboard + email log
  const [
    moveInsUpcoming,
    recentAudit,
    bookingsToday,
    bookingsLast30Days,
    openDefectsRaw,
    bookingFunnelThisMonth,
    teamNotes,
    recentEmails,
  ] = await Promise.all([
    prisma.tenant.findMany({
      where: { moveIn: { gte: todayStart, lte: in28Days } },
      include: { room: { include: { apartment: { include: { location: true } } } } },
      orderBy: { moveIn: "asc" },
    }),

    // Recent 15 audit entries — activity feed for team awareness.
    prisma.auditLog.findMany({
      orderBy: { at: "desc" },
      take: 15,
    }),

    // Bookings created today
    prisma.booking.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { id: true, bookingFeePaidAt: true, monthlyRent: true },
    }),

    // Bookings created in the last 30 days (rolling window)
    prisma.booking.findMany({
      where: {
        createdAt: { gte: new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, bookingFeePaidAt: true, monthlyRent: true },
    }),

    // Open defects (tenant might have moved out or still live there — the
    // defect is relevant either way for the maintenance ops list).
    prisma.defect.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            moveOut: true,
            room: {
              select: {
                roomNumber: true,
                apartment: { select: { location: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Booking conversion funnel — bookings created in the last 30 days
    // (rolling window). We also fetch 30-60d back for the previous-period
    // rate comparison. Stops at Deposit paid because everything after
    // (waiting for move-in) is outside admin influence.
    prisma.booking.findMany({
      where: {
        createdAt: { gte: new Date(todayStart.getTime() - 60 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        signatureDocumentId: true,
        bookingFeePaidAt: true,
        depositPaidAt: true,
        moveInDate: true,
      },
    }),

    // Team pinboard — sticky first, then newest. Limit 20 for the widget.
    prisma.teamNote.findMany({
      orderBy: [{ sticky: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),

    // Recent sent emails — dashboard widget + quick link to /admin/emails
    prisma.sentEmail.findMany({
      orderBy: { sentAt: "desc" },
      take: 10,
    }),
  ]);

  // Batch 4: rent (base + bundled adjustments) + notice pipeline + more action items
  const [currentMonthRents, noticePipelineRaw, dunningCandidates] =
    await Promise.all([
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

    // Vacancy pipeline: tenants leaving within the next 30 days. We
    // filter in code to keep only rooms WITHOUT a replacement booking in
    // the pipeline — those are the real revenue-at-risk items. Currently
    // vacant rooms (no tenant, no active booking) are derived separately
    // from roomsAll and merged into the same pipeline.
    prisma.tenant.findMany({
      where: {
        moveOut: { gte: todayStart, lte: in30Days },
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

    // Dunning candidates: unpaid rent in a past or current month where
    // the appropriate reminder/mahnung hasn't been sent yet. We fetch all
    // candidates and categorise in code (reminder 1 / mahnung 1 / mahnung 2).
    prisma.rentPayment.findMany({
      where: {
        status: { in: ["FAILED", "PARTIAL", "PENDING"] },
        month: { lte: todayStart },
      },
      include: { tenant: true },
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

  // ─── Dunning buckets ────────────────────────────────────────────────
  // For each unpaid rent, figure out which stage is due now based on
  // days since the month started. Only the most severe stage per rent
  // (don't show reminder AND mahnung for the same row).
  const dunningReminder1: typeof dunningCandidates = [];
  const dunningMahnung1: typeof dunningCandidates = [];
  const dunningMahnung2: typeof dunningCandidates = [];
  for (const r of dunningCandidates) {
    const monthStart = new Date(r.month);
    monthStart.setHours(0, 0, 0, 0);
    const daysOpen = Math.floor(
      (todayStart.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysOpen >= 30 && !r.mahnung2SentAt) {
      dunningMahnung2.push(r);
    } else if (daysOpen >= 14 && !r.mahnung1SentAt) {
      dunningMahnung1.push(r);
    } else if (daysOpen >= 3 && !r.reminder1SentAt) {
      dunningReminder1.push(r);
    }
  }

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

  // ─── Vacancy pipeline: free rooms NOW + moveOuts in next 30 days ───
  // Two inputs merged into one list:
  //   A) currently vacant ACTIVE rooms (no tenant, no active booking)
  //   B) tenants moving out in ≤30d where the room has no replacement
  //      booking lined up
  type VacancyPipelineRow = {
    id: string;
    kind: "vacant_now" | "leaving_soon";
    label: string;
    room: string;
    category: string;
    monthlyRent: number;
    moveOut: string | null;
    daysAway: number;
  };

  const vacantNow: VacancyPipelineRow[] = activeRooms
    .filter((r) => !isCurrentlyOccupied(r) && r.bookings.length === 0)
    .map((r) => ({
      id: `room-${r.id}`,
      kind: "vacant_now" as const,
      label: "Vacant",
      room: `${r.apartment.location.name} · ${r.roomNumber}`,
      category: r.category,
      monthlyRent: r.monthlyRent,
      moveOut: null,
      daysAway: 0,
    }));

  const leavingSoon: VacancyPipelineRow[] = noticePipelineRaw
    .filter((t) => {
      if (!t.moveOut || !t.room) return false;
      const outDate = new Date(t.moveOut).getTime();
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
        id: `tenant-${t.id}`,
        kind: "leaving_soon" as const,
        label: `${t.firstName} ${t.lastName}`,
        room: t.room
          ? `${t.room.apartment.location.name} · ${t.room.roomNumber}`
          : "—",
        category: t.room?.category ?? "",
        monthlyRent: t.monthlyRent,
        moveOut: t.moveOut?.toISOString() ?? null,
        daysAway,
      } satisfies VacancyPipelineRow;
    });

  const vacancyPipeline: VacancyPipelineRow[] = [
    ...vacantNow.sort((a, b) => a.room.localeCompare(b.room)),
    ...leavingSoon.sort((a, b) => a.daysAway - b.daysAway),
  ];

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
    missingSepa.length +
    dunningReminder1.length +
    dunningMahnung1.length +
    dunningMahnung2.length;

  // Booking Fee = €195 per CLAUDE.md (non-refundable, separate Stripe charge)
  const BOOKING_FEE_CENTS = 19500;
  const newBookings = {
    todayCount: bookingsToday.length,
    todayFeesCollected:
      bookingsToday.filter((b) => b.bookingFeePaidAt).length * BOOKING_FEE_CENTS,
    last30Count: bookingsLast30Days.length,
    last30FeesCollected:
      bookingsLast30Days.filter((b) => b.bookingFeePaidAt).length * BOOKING_FEE_CENTS,
  };

  // Conversion funnel — split the 60-day window into the current and
  // previous 30-day cohorts. Current is used for the balance bars +
  // stuck-people lists; previous only supplies the comparison rate.
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff30 = new Date(todayStart.getTime() - THIRTY_DAYS_MS);
  const current30 = bookingFunnelThisMonth.filter(
    (b) => new Date(b.createdAt).getTime() >= cutoff30.getTime()
  );
  const previous30 = bookingFunnelThisMonth.filter(
    (b) => new Date(b.createdAt).getTime() < cutoff30.getTime()
  );

  function daysSinceUntilNow(d: Date | null): number {
    if (!d) return 0;
    return Math.floor((todayStart.getTime() - new Date(d).getTime()) / (24 * 60 * 60 * 1000));
  }
  function median(nums: number[]): number | null {
    if (nums.length === 0) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }
  function maxOrNull(nums: number[]): number | null {
    return nums.length === 0 ? null : Math.max(...nums);
  }

  type FunnelPerson = {
    id: string;
    name: string;
    email: string;
    moveInDate: string | null;
    daysInStage: number;
  };
  function mapPeople(
    list: typeof current30,
    pickTimestamp: (b: (typeof current30)[number]) => Date | null
  ): FunnelPerson[] {
    return list
      .map((b) => ({
        id: b.id,
        name: `${b.firstName} ${b.lastName}`,
        email: b.email,
        moveInDate: b.moveInDate?.toISOString() ?? null,
        daysInStage: daysSinceUntilNow(pickTimestamp(b)),
      }))
      .sort((a, b) => b.daysInStage - a.daysInStage); // oldest first
  }

  // "Stuck" = reached this stage but not the next one. The final stage
  // (Deposit paid) is a done-state — no stuck list because the wait for
  // move-in isn't something the admin can speed up.
  const stuckStarted = current30.filter(
    (b) => !b.signatureDocumentId && !b.bookingFeePaidAt && !b.depositPaidAt
  );
  const stuckSigned = current30.filter(
    (b) => b.signatureDocumentId && !b.bookingFeePaidAt && !b.depositPaidAt
  );
  const stuckFeePaid = current30.filter(
    (b) => b.bookingFeePaidAt && !b.depositPaidAt
  );

  // Previous period "made it to Deposit paid" rate for the trend badge.
  // That's our true north — every stage before is just a leading indicator.
  const previousRate =
    previous30.length > 0
      ? previous30.filter((b) => b.depositPaidAt).length / previous30.length
      : null;

  const funnel = {
    total: current30.length,
    agreementSigned: current30.filter((b) => b.signatureDocumentId).length,
    bookingFeePaid: current30.filter((b) => b.bookingFeePaidAt).length,
    depositPaid: current30.filter((b) => b.depositPaidAt).length,
    previousDepositRate: previousRate,
    stages: {
      started: {
        stuckCount: stuckStarted.length,
        oldestDays: maxOrNull(stuckStarted.map((b) => daysSinceUntilNow(b.createdAt))),
        medianDays: median(stuckStarted.map((b) => daysSinceUntilNow(b.createdAt))),
        people: mapPeople(stuckStarted, (b) => b.createdAt),
      },
      signed: {
        stuckCount: stuckSigned.length,
        oldestDays: maxOrNull(stuckSigned.map((b) => daysSinceUntilNow(b.createdAt))),
        medianDays: median(stuckSigned.map((b) => daysSinceUntilNow(b.createdAt))),
        people: mapPeople(stuckSigned, (b) => b.createdAt),
      },
      feePaid: {
        stuckCount: stuckFeePaid.length,
        oldestDays: maxOrNull(stuckFeePaid.map((b) => daysSinceUntilNow(b.bookingFeePaidAt))),
        medianDays: median(stuckFeePaid.map((b) => daysSinceUntilNow(b.bookingFeePaidAt))),
        people: mapPeople(stuckFeePaid, (b) => b.bookingFeePaidAt),
      },
    },
  };

  const openDefects = openDefectsRaw.map((d) => ({
    id: d.id,
    description: d.description,
    amount: d.deductionAmount,
    createdAt: d.createdAt,
    photos: d.photos.length,
    tenantId: d.tenantId,
    tenantName: `${d.tenant.firstName} ${d.tenant.lastName}`,
    room: d.tenant.room
      ? `${d.tenant.room.apartment.location.name} · ${d.tenant.room.roomNumber}`
      : "—",
    movedOut: d.tenant.moveOut
      ? new Date(d.tenant.moveOut).getTime() < todayStart.getTime()
      : false,
  }));

  const activityFeed = recentAudit.map((a) => ({
    id: a.id,
    at: a.at,
    module: a.module,
    action: a.action,
    summary: a.summary,
    entityType: a.entityType,
    entityId: a.entityId,
  }));

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
          vacancyPipeline,
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
            dunningReminder1: dunningReminder1.map((r) => ({
              id: r.id,
              tenantId: r.tenantId,
              tenantName: `${r.tenant.firstName} ${r.tenant.lastName}`,
              month: r.month,
              amount: r.amount - r.paidAmount,
            })),
            dunningMahnung1: dunningMahnung1.map((r) => ({
              id: r.id,
              tenantId: r.tenantId,
              tenantName: `${r.tenant.firstName} ${r.tenant.lastName}`,
              month: r.month,
              amount: r.amount - r.paidAmount,
            })),
            dunningMahnung2: dunningMahnung2.map((r) => ({
              id: r.id,
              tenantId: r.tenantId,
              tenantName: `${r.tenant.firstName} ${r.tenant.lastName}`,
              month: r.month,
              amount: r.amount - r.paidAmount,
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
          },
          newBookings,
          funnel,
          openDefects,
          activityFeed,
          teamNotes: teamNotes.map((n) => ({
            id: n.id,
            content: n.content,
            author: n.author,
            sticky: n.sticky,
            createdAt: n.createdAt,
          })),
          recentEmails: recentEmails.map((e) => ({
            id: e.id,
            templateKey: e.templateKey,
            recipient: e.recipient,
            status: e.status,
            triggeredBy: e.triggeredBy,
            sentAt: e.sentAt,
            entityType: e.entityType,
            entityId: e.entityId,
          })),
        })
      )}
    />
  );
}
