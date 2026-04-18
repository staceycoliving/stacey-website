import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getReservations } from "@/lib/apaleo";
import HousekeepingPage from "./HousekeepingPage";

export const dynamic = "force-dynamic";

export default async function AdminHousekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; location?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const params = await searchParams;
  const dateStr = params.date ?? new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr + "T00:00:00");
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // ─── LONG stay: tenants moving in/out today ───
  const [longMoveIns, longMoveOuts, locations] = await Promise.all([
    prisma.tenant.findMany({
      where: { moveIn: { gte: dayStart, lt: dayEnd } },
      include: {
        room: { include: { apartment: { include: { location: true } } } },
      },
    }),
    prisma.tenant.findMany({
      where: { moveOut: { gte: dayStart, lt: dayEnd } },
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
      getReservations({ dateFilter: "arrival", from: dateStr, to: dateStr }),
      getReservations({ dateFilter: "departure", from: dateStr, to: dateStr }),
    ]);
    // Filter out canceled/no-show reservations client-side
    apaleoArrivals = rawArrivals.filter((r: any) => r.status !== "Canceled" && r.status !== "NoShow");
    apaleoDepartures = rawDepartures.filter((r: any) => r.status !== "Canceled" && r.status !== "NoShow");
  } catch (err) {
    apaleoError = err instanceof Error ? err.message : String(err);
  }

  // ─── Build task list (per move-in / move-out, with persistent status) ───
  type RawTask = {
    taskKey: string;
    taskType: "MOVE_IN" | "MOVE_OUT";
    locationName: string;
    locationSlug: string | null;
    roomLabel: string;
    guestName: string;
    source: "LONG" | "SHORT";
  };
  const raw: RawTask[] = [];

  for (const t of longMoveIns) {
    raw.push({
      taskKey: `tenant-${t.id}-in`,
      taskType: "MOVE_IN",
      locationName: t.room!.apartment.location.name,
      locationSlug: t.room!.apartment.location.slug,
      roomLabel: `#${t.room!.roomNumber}`,
      guestName: `${t.firstName} ${t.lastName}`,
      source: "LONG",
    });
  }
  for (const t of longMoveOuts) {
    raw.push({
      taskKey: `tenant-${t.id}-out`,
      taskType: "MOVE_OUT",
      locationName: t.room!.apartment.location.name,
      locationSlug: t.room!.apartment.location.slug,
      roomLabel: `#${t.room!.roomNumber}`,
      guestName: `${t.firstName} ${t.lastName}`,
      source: "LONG",
    });
  }
  for (const r of apaleoArrivals) {
    raw.push({
      taskKey: `apaleo-${r.id}-in`,
      taskType: "MOVE_IN",
      locationName: r.propertyName || r.locationSlug || "—",
      locationSlug: r.locationSlug || null,
      roomLabel: r.unitName ? `#${r.unitName}` : `(${r.unitGroupName})`,
      guestName: `${r.guestFirstName} ${r.guestLastName}`,
      source: "SHORT",
    });
  }
  for (const r of apaleoDepartures) {
    raw.push({
      taskKey: `apaleo-${r.id}-out`,
      taskType: "MOVE_OUT",
      locationName: r.propertyName || r.locationSlug || "—",
      locationSlug: r.locationSlug || null,
      roomLabel: r.unitName ? `#${r.unitName}` : `(${r.unitGroupName})`,
      guestName: `${r.guestFirstName} ${r.guestLastName}`,
      source: "SHORT",
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
    };
  });

  return (
    <HousekeepingPage
      date={dateStr}
      tasks={JSON.parse(JSON.stringify(tasks))}
      locations={JSON.parse(JSON.stringify(locations))}
      locationFilter={params.location ?? ""}
      apaleoError={apaleoError}
    />
  );
}
