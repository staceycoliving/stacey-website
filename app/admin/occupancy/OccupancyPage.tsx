"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
};

type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  moveInDate: string | null;
};

type Room = {
  id: string;
  roomNumber: string;
  category: string;
  monthlyRent: number;
  status: "ACTIVE" | "BLOCKED" | "DEACTIVATED";
  tenant: Tenant | null;
  bookings: Booking[];
};

type Apartment = {
  id: string;
  houseNumber: string;
  floor: string;
  label: string | null;
  rooms: Room[];
};

type Location = {
  id: string;
  slug: string;
  name: string;
  apartments: Apartment[];
};

const PX_PER_DAY = 14;
const ROW_HEIGHT = 32;
const MS_PER_DAY = 86_400_000;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function fmtDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function fmtFullDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function OccupancyPage({
  locations,
}: {
  locations: Location[];
}) {
  const router = useRouter();

  const [selectedLocationId, setSelectedLocationId] = useState(
    locations[0]?.id ?? ""
  );
  const [weeksToShow, setWeeksToShow] = useState(12);
  // anchor = start of view (Monday)
  const [viewStart, setViewStart] = useState<Date>(() => startOfWeek(new Date()));

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);

  const totalDays = weeksToShow * 7;
  const viewEnd = useMemo(() => addDays(viewStart, totalDays), [viewStart, totalDays]);
  const totalWidth = totalDays * PX_PER_DAY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffsetPx = (diffDays(today, viewStart)) * PX_PER_DAY;
  const todayInRange = today >= viewStart && today < viewEnd;

  // Build week headers
  const weekHeaders = useMemo(() => {
    const w: { start: Date; offsetPx: number; widthPx: number; label: string }[] = [];
    for (let i = 0; i < weeksToShow; i++) {
      const start = addDays(viewStart, i * 7);
      const kw = isoWeek(start);
      w.push({
        start,
        offsetPx: i * 7 * PX_PER_DAY,
        widthPx: 7 * PX_PER_DAY,
        label: `KW ${kw} · ${fmtDate(start)}`,
      });
    }
    return w;
  }, [viewStart, weeksToShow]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Occupancy plan</h1>
          <p className="text-sm text-gray mt-1">
            {fmtFullDate(viewStart)} – {fmtFullDate(addDays(viewEnd, -1))}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(parseInt(e.target.value))}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value={4}>4 weeks</option>
            <option value={8}>8 weeks</option>
            <option value={12}>12 weeks</option>
            <option value={26}>6 months</option>
            <option value={52}>1 year</option>
          </select>
          <button
            onClick={() => setViewStart(addDays(viewStart, -7 * Math.min(weeksToShow, 4)))}
            className="p-1.5 border border-lightgray rounded-[5px] hover:bg-background-alt"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewStart(startOfWeek(new Date()))}
            className="px-3 py-1 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
          >
            Today
          </button>
          <button
            onClick={() => setViewStart(addDays(viewStart, 7 * Math.min(weeksToShow, 4)))}
            className="p-1.5 border border-lightgray rounded-[5px] hover:bg-background-alt"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {locations.map((loc) => {
          const totalRooms = loc.apartments.reduce(
            (s, a) => s + a.rooms.length,
            0
          );
          return (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              className={`px-3 py-2 rounded-[5px] text-sm transition-colors ${
                selectedLocationId === loc.id
                  ? "bg-black text-white font-semibold"
                  : "bg-white border border-lightgray hover:border-black"
              }`}
            >
              {loc.name}
              <span className="ml-2 text-xs opacity-70">{totalRooms}</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs mb-3">
        <Legend color="bg-blue-200 border-blue-400" label="Active tenant" />
        <Legend color="bg-yellow-200 border-yellow-400" label="Leaving" />
        <Legend color="bg-green-200 border-green-400" label="Booking pipeline" />
        <Legend color="bg-red-100 border-red-300" label="Blocked" />
        <Legend color="bg-gray-200 border-gray-400" label="Deactivated" />
      </div>

      {selectedLoc ? (
        <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
          {/* Sticky room column + scrollable time area */}
          <div className="flex">
            {/* Left: room labels */}
            <div className="flex-shrink-0 w-56 border-r border-lightgray">
              <div
                className="bg-background-alt border-b border-lightgray px-3 text-xs font-semibold text-gray uppercase flex items-center"
                style={{ height: 36 }}
              >
                Room
              </div>
              {selectedLoc.apartments.map((apt) => (
                <div key={apt.id}>
                  <div
                    className="bg-background-alt px-3 text-xs text-gray font-medium border-b border-lightgray flex items-center"
                    style={{ height: 28 }}
                  >
                    {apt.houseNumber}
                    {apt.label && ` · ${apt.label}`} — {apt.floor}
                  </div>
                  {apt.rooms.map((r) => (
                    <div
                      key={r.id}
                      className="px-3 border-b border-lightgray/50 text-sm flex items-center justify-between gap-1"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <span className="font-medium">#{r.roomNumber}</span>
                      <span className="text-xs text-gray truncate">
                        {formatCategory(r.category)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Right: scrollable timeline */}
            <div className="overflow-x-auto flex-1">
              <div style={{ width: totalWidth, position: "relative" }}>
                {/* Week headers */}
                <div
                  className="flex border-b border-lightgray bg-background-alt"
                  style={{ height: 36 }}
                >
                  {weekHeaders.map((w) => (
                    <div
                      key={w.start.toISOString()}
                      className="border-r border-lightgray text-xs text-gray flex items-center justify-center px-1"
                      style={{ width: w.widthPx }}
                      title={fmtFullDate(w.start)}
                    >
                      {w.label}
                    </div>
                  ))}
                </div>

                {/* Apartment + rooms */}
                {selectedLoc.apartments.map((apt) => (
                  <div key={apt.id}>
                    {/* Apartment spacer to align with left column */}
                    <div
                      className="bg-background-alt border-b border-lightgray relative"
                      style={{ height: 28 }}
                    >
                      {/* week dividers */}
                      {weekHeaders.map((w) => (
                        <div
                          key={w.start.toISOString()}
                          className="absolute top-0 bottom-0 border-r border-lightgray"
                          style={{ left: w.offsetPx + w.widthPx }}
                        />
                      ))}
                    </div>
                    {apt.rooms.map((room) => (
                      <RoomRow
                        key={room.id}
                        room={room}
                        viewStart={viewStart}
                        viewEnd={viewEnd}
                        totalDays={totalDays}
                        weekHeaders={weekHeaders}
                        onTenantClick={(tenantId) =>
                          router.push(`/admin/tenants/${tenantId}`)
                        }
                        onBookingClick={() => router.push("/admin/bookings")}
                      />
                    ))}
                  </div>
                ))}

                {/* Today line */}
                {todayInRange && (
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-red-500 pointer-events-none"
                    style={{ left: todayOffsetPx, height: "100%" }}
                  >
                    <div className="bg-red-500 text-white text-[10px] font-semibold px-1 rounded-br-[4px]">
                      Today
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[5px] border border-lightgray p-6 text-center text-sm text-gray">
          Select a location.
        </div>
      )}
    </div>
  );
}

function RoomRow({
  room,
  viewStart,
  viewEnd,
  totalDays,
  weekHeaders,
  onTenantClick,
  onBookingClick,
}: {
  room: Room;
  viewStart: Date;
  viewEnd: Date;
  totalDays: number;
  weekHeaders: { offsetPx: number; widthPx: number; start: Date }[];
  onTenantClick: (tenantId: string) => void;
  onBookingClick: () => void;
}) {
  const isBlocked = room.status === "BLOCKED";
  const isDeactivated = room.status === "DEACTIVATED";

  // Compute tenant bar
  let tenantBar: { startPx: number; widthPx: number; leaving: boolean } | null = null;
  if (room.tenant) {
    const tStart = new Date(room.tenant.moveIn);
    const tEnd = room.tenant.moveOut
      ? new Date(room.tenant.moveOut)
      : viewEnd;
    const visStart = tStart > viewStart ? tStart : viewStart;
    const visEnd = tEnd < viewEnd ? tEnd : viewEnd;
    if (visStart < visEnd) {
      const startPx = diffDays(visStart, viewStart) * PX_PER_DAY;
      const widthPx = diffDays(visEnd, visStart) * PX_PER_DAY;
      tenantBar = {
        startPx,
        widthPx,
        leaving: Boolean(room.tenant.moveOut),
      };
    }
  }

  // Booking bars (active pipeline reservations)
  const bookingBars = room.bookings
    .map((b) => {
      if (!b.moveInDate) return null;
      const bStart = new Date(b.moveInDate);
      // Bookings are open-ended; cap to viewEnd
      const visStart = bStart > viewStart ? bStart : viewStart;
      if (visStart >= viewEnd) return null;
      const startPx = diffDays(visStart, viewStart) * PX_PER_DAY;
      // Show 30-day chunk by default for visualization
      const showDays = Math.min(diffDays(viewEnd, visStart), 30);
      const widthPx = showDays * PX_PER_DAY;
      return { booking: b, startPx, widthPx };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div
      className="relative border-b border-lightgray/50"
      style={{ height: ROW_HEIGHT }}
    >
      {/* Background per status */}
      {isBlocked && (
        <div className="absolute inset-0 bg-red-50" />
      )}
      {isDeactivated && (
        <div className="absolute inset-0 bg-gray-100 opacity-70" />
      )}

      {/* Week dividers */}
      {weekHeaders.map((w) => (
        <div
          key={w.start.toISOString()}
          className="absolute top-0 bottom-0 border-r border-lightgray/40 pointer-events-none"
          style={{ left: w.offsetPx + w.widthPx }}
        />
      ))}

      {/* Tenant bar */}
      {tenantBar && room.tenant && !isDeactivated && (
        <button
          onClick={() => onTenantClick(room.tenant!.id)}
          className={`absolute top-1 bottom-1 rounded-[4px] border text-xs px-2 truncate text-left hover:brightness-95 ${
            tenantBar.leaving
              ? "bg-yellow-200 border-yellow-400 text-yellow-900"
              : "bg-blue-200 border-blue-400 text-blue-900"
          }`}
          style={{ left: tenantBar.startPx, width: tenantBar.widthPx }}
          title={`${room.tenant.firstName} ${room.tenant.lastName}\nIn: ${fmtFullDate(room.tenant.moveIn)}\nOut: ${room.tenant.moveOut ? fmtFullDate(room.tenant.moveOut) : "open end"}`}
        >
          {room.tenant.firstName} {room.tenant.lastName[0]}.
        </button>
      )}

      {/* Booking bars */}
      {bookingBars.map((b) => (
        <button
          key={b.booking.id}
          onClick={onBookingClick}
          className="absolute top-1 bottom-1 rounded-[4px] border bg-green-200 border-green-400 text-green-900 text-xs px-2 truncate text-left hover:brightness-95"
          style={{ left: b.startPx, width: b.widthPx }}
          title={`${b.booking.firstName} ${b.booking.lastName}\nStatus: ${b.booking.status}\nMove-in: ${b.booking.moveInDate ? fmtFullDate(b.booking.moveInDate) : "—"}`}
        >
          📋 {b.booking.firstName} {b.booking.lastName[0]}.
        </button>
      ))}

      {/* Blocked label */}
      {isBlocked && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-red-700 font-semibold pointer-events-none">
          BLOCKED
        </div>
      )}
      {isDeactivated && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 font-semibold pointer-events-none">
          DEACTIVATED
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray">
      <span className={`inline-block w-3 h-3 border rounded-[3px] ${color}`} />
      {label}
    </span>
  );
}

// ─── ISO week number ─────────────────────────────────────────

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
