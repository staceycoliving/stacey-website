import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getReservations } from "@/lib/apaleo";
import HousekeepingPage from "./HousekeepingPage";

export const dynamic = "force-dynamic";

// Housekeeping default check-in/out times (CLAUDE.md: in ≥16:00, out ≤11:00)
const DEFAULT_CHECKIN = "16:00";
const DEFAULT_CHECKOUT = "11:00";

export default async function AdminHousekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; location?: string; view?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const params = await searchParams;
  const dateStr = params.date ?? new Date().toISOString().slice(0, 10);
  const view = params.view === "week" ? "week" : "day";

  // Date range: either the single day or a 7-day window starting from date
  const rangeStart = new Date(dateStr + "T00:00:00");
  const rangeDays = view === "week" ? 7 : 1;
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + rangeDays);

  const rangeEndStr = new Date(rangeEnd.getTime() - 1)
    .toISOString()
    .slice(0, 10); // last day in the range (inclusive) for apaleo "to"

  // ─── LONG stay: tenants moving in/out in the range ───
  const [longMoveIns, longMoveOuts, locations] = await Promise.all([
    prisma.tenant.findMany({
      where: { moveIn: { gte: rangeStart, lt: rangeEnd } },
      include: {
        room: { include: { apartment: { include: { location: true } } } },
      },
    }),
    prisma.tenant.findMany({
      where: { moveOut: { gte: rangeStart, lt: rangeEnd } },
      include: {
        room: { include: { apartment: { include: { location: true } } } },
      },
    }),
    prisma.location.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  // ─── SHORT stay (apaleo) ───
  let apaleoArrivals: Awaited<ReturnType<typeof getReservations>> = [];
  let apaleoDepartures: Awaited<ReturnType<typeof getReservations>> = [];
  let apaleoError: string | null = null;
  try {
    const [rawArrivals, rawDepartures] = await Promise.all([
      getReservations({ dateFilter: "arrival", from: dateStr, to: rangeEndStr }),
      getReservations({ dateFilter: "departure", from: dateStr, to: rangeEndStr }),
    ]);
    apaleoArrivals = rawArrivals.filter(
      (r: any) => r.status !== "Canceled" && r.status !== "NoShow"
    );
    apaleoDepartures = rawDepartures.filter(
      (r: any) => r.status !== "Canceled" && r.status !== "NoShow"
    );
  } catch (err) {
    apaleoError = err instanceof Error ? err.message : String(err);
  }

  // ─── Raw tasks (one row per move-in/out) ───
  type RawTask = {
    taskKey: string;
    taskType: "MOVE_IN" | "MOVE_OUT";
    date: string; // YYYY-MM-DD
    locationName: string;
    locationSlug: string | null;
    roomLabel: string;
    guestName: string;
    source: "LONG" | "SHORT";
    time: string | null; // HH:MM (scheduled in/out time)
    tenantId: string | null; // LONG only, for deep-link to folio
    apaleoReservationId: string | null; // SHORT only
    roomId: string | null; // for turnaround grouping (LONG only)
  };
  const raw: RawTask[] = [];

  function dayOf(d: Date): string {
    return new Date(d).toISOString().slice(0, 10);
  }

  for (const t of longMoveIns) {
    raw.push({
      taskKey: `tenant-${t.id}-in`,
      taskType: "MOVE_IN",
      date: dayOf(t.moveIn),
      locationName: t.room!.apartment.location.name,
      locationSlug: t.room!.apartment.location.slug,
      roomLabel: `#${t.room!.roomNumber}`,
      guestName: `${t.firstName} ${t.lastName}`,
      source: "LONG",
      time: DEFAULT_CHECKIN,
      tenantId: t.id,
      apaleoReservationId: null,
      roomId: t.room!.id,
    });
  }
  for (const t of longMoveOuts) {
    raw.push({
      taskKey: `tenant-${t.id}-out`,
      taskType: "MOVE_OUT",
      date: dayOf(t.moveOut!),
      locationName: t.room!.apartment.location.name,
      locationSlug: t.room!.apartment.location.slug,
      roomLabel: `#${t.room!.roomNumber}`,
      guestName: `${t.firstName} ${t.lastName}`,
      source: "LONG",
      time: DEFAULT_CHECKOUT,
      tenantId: t.id,
      apaleoReservationId: null,
      roomId: t.room!.id,
    });
  }
  for (const r of apaleoArrivals) {
    const arrival = r.arrival ? new Date(r.arrival) : null;
    raw.push({
      taskKey: `apaleo-${r.id}-in`,
      taskType: "MOVE_IN",
      date: arrival ? dayOf(arrival) : dateStr,
      locationName: r.propertyName || r.locationSlug || ",",
      locationSlug: r.locationSlug || null,
      roomLabel: r.unitName ? `#${r.unitName}` : `(${r.unitGroupName})`,
      guestName: `${r.guestFirstName} ${r.guestLastName}`,
      source: "SHORT",
      time: arrival
        ? arrival.toISOString().slice(11, 16) === "00:00"
          ? DEFAULT_CHECKIN
          : arrival.toISOString().slice(11, 16)
        : DEFAULT_CHECKIN,
      tenantId: null,
      apaleoReservationId: r.id,
      roomId: null,
    });
  }
  for (const r of apaleoDepartures) {
    const departure = r.departure ? new Date(r.departure) : null;
    raw.push({
      taskKey: `apaleo-${r.id}-out`,
      taskType: "MOVE_OUT",
      date: departure ? dayOf(departure) : dateStr,
      locationName: r.propertyName || r.locationSlug || ",",
      locationSlug: r.locationSlug || null,
      roomLabel: r.unitName ? `#${r.unitName}` : `(${r.unitGroupName})`,
      guestName: `${r.guestFirstName} ${r.guestLastName}`,
      source: "SHORT",
      time: departure
        ? departure.toISOString().slice(11, 16) === "00:00"
          ? DEFAULT_CHECKOUT
          : departure.toISOString().slice(11, 16)
        : DEFAULT_CHECKOUT,
      tenantId: null,
      apaleoReservationId: r.id,
      roomId: null,
    });
  }

  // Pull persisted status for these task keys
  const persisted = await prisma.cleaningTask.findMany({
    where: { taskKey: { in: raw.map((r) => r.taskKey) } },
  });
  const persistedByKey = new Map(persisted.map((p) => [p.taskKey, p]));

  const tasks = raw.map((r) => {
    const p = persistedByKey.get(r.taskKey);
    return {
      ...r,
      id: p?.id ?? null,
      status: p?.status ?? "OPEN",
      assignedTo: p?.assignedTo ?? null,
      notes: p?.notes ?? null,
      inspectionResult: p?.inspectionResult ?? null,
      inspectionNotes: p?.inspectionNotes ?? null,
    };
  });

  return (
    <HousekeepingPage
      date={dateStr}
      view={view}
      tasks={JSON.parse(JSON.stringify(tasks))}
      locations={JSON.parse(JSON.stringify(locations))}
      locationFilter={params.location ?? ""}
      apaleoError={apaleoError}
    />
  );
}
