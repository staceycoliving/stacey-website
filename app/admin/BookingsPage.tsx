"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  Table as TableIcon,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type Location = {
  id: string;
  slug: string;
  name: string;
  city: string;
  stayType: string;
};

type Booking = {
  id: string;
  locationId: string;
  stayType: string;
  category: string;
  persons: number;
  checkIn: string | null;
  checkOut: string | null;
  moveInDate: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  street: string | null;
  zipCode: string | null;
  addressCity: string | null;
  country: string | null;
  monthlyRent: number | null;
  moveInReason: string | null;
  message: string | null;
  status: string;
  depositStatus: string;
  depositDeadline?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  location: Location;
  room: { id: string; roomNumber: string } | null;
  tenant?: { id: string } | null;
};

type CancelTarget = {
  id: string;
  name: string;
  status: string;
};

// 4 active pipeline stages. Legacy SIGNED + PAID stay in the DB enum for old
// rows, but the UI no longer surfaces them.
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Lead",
  DEPOSIT_PENDING: "Awaiting deposit",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  // Legacy
  SIGNED: "Signed (legacy)",
  PAID: "Paid (legacy)",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  DEPOSIT_PENDING: "bg-orange-100 text-orange-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  // Legacy
  SIGNED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
};

const STATUS_OPTIONS = [
  "PENDING",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "CANCELLED",
] as const;

const KANBAN_COLUMNS = [
  "PENDING",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "CANCELLED",
] as const;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function hoursUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

type BookingKpis = {
  depositSoon: number;
  depositOverdue: number;
  moveInsThisWeek: number;
  moveInsNext4Weeks: number;
  staleLeads: number;
};

export default function BookingsPage({
  bookings,
  locations,
  kpis,
}: {
  bookings: Booking[];
  locations: Location[];
  kpis: BookingKpis;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read everything from URL so the state is shareable via link and
  // survives reload. writeParams() rewrites the URL via router.replace
  // without triggering a full re-render cascade.
  const view = (searchParams.get("view") as "table" | "kanban") ?? "table";
  const filterLocation = searchParams.get("location") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const search = searchParams.get("q") ?? "";
  const moveInFrom = searchParams.get("moveInFrom") ?? "";
  const moveInTo = searchParams.get("moveInTo") ?? "";
  const sortBy =
    (searchParams.get("sortBy") as "date" | "movein" | "name" | "status") ??
    "date";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") ?? "desc";

  const writeParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Local-only UI state (not worth URL-syncing)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);

  // Debounce the search input so typing doesn't rewrite the URL on every
  // keystroke — easier on both React and the URL history stack.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search); // keep in sync when URL changes (back button)
  }, [search]);
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => writeParams({ q: searchInput }), 200);
    return () => clearTimeout(t);
  }, [searchInput, search, writeParams]);

  // Filter + search + sort pipeline
  const filtered = useMemo(() => {
    const searchLc = search.toLowerCase();
    const moveInFromTs = moveInFrom ? new Date(moveInFrom).getTime() : null;
    const moveInToTs = moveInTo
      ? new Date(moveInTo).getTime() + 86_400_000 - 1 // include end-of-day
      : null;
    const list = bookings.filter((b) => {
      if (filterLocation && b.locationId !== filterLocation) return false;
      if (filterStatus && b.status !== filterStatus) return false;
      if (moveInFromTs !== null) {
        if (!b.moveInDate) return false;
        if (new Date(b.moveInDate).getTime() < moveInFromTs) return false;
      }
      if (moveInToTs !== null) {
        if (!b.moveInDate) return false;
        if (new Date(b.moveInDate).getTime() > moveInToTs) return false;
      }
      if (searchLc) {
        const hay = [
          b.firstName,
          b.lastName,
          b.email,
          b.phone,
          b.room?.roomNumber ?? "",
          b.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(searchLc)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (
            dir *
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`
            )
          );
        case "movein": {
          const av = a.moveInDate ? new Date(a.moveInDate).getTime() : 0;
          const bv = b.moveInDate ? new Date(b.moveInDate).getTime() : 0;
          return dir * (av - bv);
        }
        case "status":
          return dir * a.status.localeCompare(b.status);
        case "date":
        default:
          return (
            dir *
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
      }
    });
    return list;
  }, [
    bookings,
    filterLocation,
    filterStatus,
    search,
    moveInFrom,
    moveInTo,
    sortBy,
    sortDir,
  ]);

  // For kanban we ignore filterStatus (status = column) but keep the
  // other filters + search so the board stays in sync with filters.
  const kanbanFiltered = useMemo(() => {
    const searchLc = search.toLowerCase();
    const moveInFromTs = moveInFrom ? new Date(moveInFrom).getTime() : null;
    const moveInToTs = moveInTo
      ? new Date(moveInTo).getTime() + 86_400_000 - 1
      : null;
    return bookings.filter((b) => {
      if (filterLocation && b.locationId !== filterLocation) return false;
      if (moveInFromTs !== null) {
        if (!b.moveInDate) return false;
        if (new Date(b.moveInDate).getTime() < moveInFromTs) return false;
      }
      if (moveInToTs !== null) {
        if (!b.moveInDate) return false;
        if (new Date(b.moveInDate).getTime() > moveInToTs) return false;
      }
      if (searchLc) {
        const hay = [b.firstName, b.lastName, b.email, b.phone].join(" ").toLowerCase();
        if (!hay.includes(searchLc)) return false;
      }
      return true;
    });
  }, [bookings, filterLocation, search, moveInFrom, moveInTo]);

  // KPIs come from the server (see app/admin/bookings/page.tsx) so we keep
  // the client render pure — React Compiler rejects Date.now() calls here.
  const { depositSoon, depositOverdue, moveInsThisWeek, moveInsNext4Weeks, staleLeads } = kpis;

  async function cancelBooking(bookingId: string, reason: string) {
    setUpdating(bookingId);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          status: "CANCELLED",
          cancellationReason: reason,
        }),
      });
      if (res.ok) {
        setCancelTarget(null);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Cancel failed: ${data.error ?? res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
    setUpdating(null);
  }

  return (
    <div>
      {/* Action-focused KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <Stat
          label="Deposits due"
          value={depositSoon + depositOverdue}
          tone={depositOverdue > 0 ? "danger" : depositSoon > 0 ? "warn" : "ok"}
          sub={
            depositOverdue > 0
              ? `${depositOverdue} overdue`
              : depositSoon > 0
                ? `${depositSoon} within 24h`
                : "All in time"
          }
        />
        <Stat
          label="Move-ins this week"
          value={moveInsThisWeek}
          tone={moveInsThisWeek > 0 ? "warn" : undefined}
          sub={moveInsThisWeek > 0 ? "Prepare welcome / keys" : "Nothing scheduled"}
        />
        <Stat
          label="Move-ins · next 4 weeks"
          value={moveInsNext4Weeks}
          sub="Confirmed pipeline"
        />
        <Stat
          label="Stale leads"
          value={staleLeads}
          tone={staleLeads > 0 ? "warn" : undefined}
          sub={
            staleLeads > 0
              ? "Older than 14 days, no follow-up"
              : "All leads fresh"
          }
        />
      </div>
      {/* Help / explainer (collapsible) */}
      <div className="mb-4 bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-background-alt"
        >
          <span className="inline-flex items-center gap-2 text-gray">
            <Info className="w-4 h-4" />
            How this pipeline works
          </span>
          {showHelp ? <ChevronUp className="w-4 h-4 text-gray" /> : <ChevronDown className="w-4 h-4 text-gray" />}
        </button>
        {showHelp && (
          <div className="px-4 py-3 border-t border-lightgray text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HelpItem
              tone="bg-gray-100 text-gray-700"
              label="Lead"
              text="Form submitted, no contract or fee yet. Shown for 60 days, then archived (still in DB for retargeting)."
            />
            <HelpItem
              tone="bg-orange-100 text-orange-800"
              label="Awaiting deposit"
              text="Booking fee paid + contract signed. 48h window for the deposit. Auto-cancels if missed."
            />
            <HelpItem
              tone="bg-green-100 text-green-800"
              label="Confirmed"
              text="Deposit paid. Stays here until move-in date. After that, the person lives in Tenants."
            />
            <HelpItem
              tone="bg-red-100 text-red-800"
              label="Cancelled"
              text="Withdrawn or deposit timed out. Visible for 30 days, then archived."
            />
          </div>
        )}
      </div>

      {/* Filters + search + view toggle */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search (debounced, ~200ms) */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, phone, room#, ID…"
              className="w-full pl-8 pr-8 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray hover:text-black"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filterLocation}
            onChange={(e) => writeParams({ location: e.target.value })}
            className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          {view === "table" && (
            <select
              value={filterStatus}
              onChange={(e) => writeParams({ status: e.target.value })}
              className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            >
              <option value="">All stages</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden ml-auto">
            <button
              onClick={() => writeParams({ view: "table" })}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm ${
                view === "table"
                  ? "bg-black text-white"
                  : "bg-white text-gray hover:bg-background-alt"
              }`}
            >
              <TableIcon className="w-4 h-4" /> Table
            </button>
            <button
              onClick={() => writeParams({ view: "kanban" })}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm ${
                view === "kanban"
                  ? "bg-black text-white"
                  : "bg-white text-gray hover:bg-background-alt"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
          </div>
        </div>

        {/* Date-range (move-in) + clear all */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray">Move-in from</span>
          <input
            type="date"
            value={moveInFrom}
            onChange={(e) => writeParams({ moveInFrom: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] bg-white"
          />
          <span className="text-gray">to</span>
          <input
            type="date"
            value={moveInTo}
            onChange={(e) => writeParams({ moveInTo: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] bg-white"
          />
          {(moveInFrom ||
            moveInTo ||
            filterLocation ||
            filterStatus ||
            search) && (
            <button
              onClick={() =>
                writeParams({
                  q: null,
                  location: null,
                  status: null,
                  moveInFrom: null,
                  moveInTo: null,
                })
              }
              className="text-gray hover:text-black underline"
            >
              Clear all
            </button>
          )}
          <span className="ml-auto text-gray">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {view === "table" ? (
        <TableView
          bookings={filtered}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(col) =>
            writeParams({
              sortBy: col,
              sortDir: sortBy === col && sortDir === "desc" ? "asc" : "desc",
            })
          }
          onCancel={(b) =>
            setCancelTarget({
              id: b.id,
              name: `${b.firstName} ${b.lastName}`,
              status: b.status,
            })
          }
        />
      ) : (
        <KanbanView
          bookings={kanbanFiltered}
          onCancel={(b) =>
            setCancelTarget({
              id: b.id,
              name: `${b.firstName} ${b.lastName}`,
              status: b.status,
            })
          }
        />
      )}

      {cancelTarget && (
        <CancelModal
          target={cancelTarget}
          working={updating === cancelTarget.id}
          onConfirm={(reason) => cancelBooking(cancelTarget.id, reason)}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Table view ────────────────────────────────────────────

function TableView({
  bookings,
  expandedId,
  setExpandedId,
  sortBy,
  sortDir,
  onSort,
  onCancel,
}: {
  bookings: Booking[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  sortBy: "date" | "movein" | "name" | "status";
  sortDir: "asc" | "desc";
  onSort: (col: "date" | "movein" | "name" | "status") => void;
  onCancel: (b: Booking) => void;
}) {
  return (
    <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-lightgray bg-background-alt">
              <SortableTh col="date" label="Date" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="name" label="Guest" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Room</th>
              <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Category</th>
              <SortableTh col="movein" label="Move-in" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh col="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray">
                  No bookings found
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <Fragment key={b.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    className="border-b border-lightgray/50 hover:bg-background-alt cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray">{formatDate(b.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">
                      {b.firstName} {b.lastName}
                    </td>
                    <td className="px-4 py-3">{b.location.name}</td>
                    <td className="px-4 py-3">{b.room ? `#${b.room.roomNumber}` : "—"}</td>
                    <td className="px-4 py-3">{formatCategory(b.category)}</td>
                    <td className="px-4 py-3 text-gray">{formatDate(b.moveInDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${STATUS_COLORS[b.status] || ""}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                  {expandedId === b.id && (
                    <tr className="border-b border-lightgray/50 bg-background-alt">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray uppercase tracking-wide mb-1">Contact</p>
                            <p>{b.email}</p>
                            <p>{b.phone || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray uppercase tracking-wide mb-1">Details</p>
                            <p>Persons: {b.persons}</p>
                            {b.monthlyRent && <p>Rent: {(b.monthlyRent / 100).toFixed(0)} EUR/mo</p>}
                            {b.moveInReason && <p>Reason: {b.moveInReason}</p>}
                            {b.message && <p>Message: {b.message}</p>}
                          </div>
                          <div>
                            <p className="text-xs text-gray uppercase tracking-wide mb-1">Actions</p>
                            <BookingActions
                              booking={b}
                              onCancel={() => onCancel(b)}
                            />
                            {b.cancellationReason && (
                              <div className="mt-3">
                                <p className="text-xs text-gray uppercase tracking-wide mb-1">Cancellation reason</p>
                                <p className="text-sm">{b.cancellationReason}</p>
                              </div>
                            )}
                            {b.street && (
                              <div className="mt-3">
                                <p className="text-xs text-gray uppercase tracking-wide mb-1">Address</p>
                                <p>{b.street}, {b.zipCode} {b.addressCity}</p>
                                <p>{b.country}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray mt-3">ID: {b.id}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Kanban view ────────────────────────────────────────────

function KanbanView({
  bookings,
  onCancel,
}: {
  bookings: Booking[];
  onCancel: (b: Booking) => void;
}) {
  const grouped = KANBAN_COLUMNS.map((status) => ({
    status,
    items: bookings
      .filter((b) => b.status === status)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
  }));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {grouped.map((col) => (
          <div
            key={col.status}
            className="flex-shrink-0 w-72 bg-background-alt rounded-[5px] border border-lightgray flex flex-col"
          >
            <div className="px-3 py-2 border-b border-lightgray flex items-center justify-between sticky top-0 bg-background-alt">
              <span
                className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${STATUS_COLORS[col.status] ?? ""}`}
              >
                {STATUS_LABEL[col.status] ?? col.status}
              </span>
              <span className="text-xs text-gray font-medium">
                {col.items.length}
              </span>
            </div>
            <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {col.items.length === 0 ? (
                <div className="text-xs text-gray text-center py-4">
                  Empty
                </div>
              ) : (
                col.items.map((b) => (
                  <KanbanCard
                    key={b.id}
                    booking={b}
                    onCancel={() => onCancel(b)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  booking,
  onCancel,
}: {
  booking: Booking;
  onCancel: () => void;
}) {
  const age = daysSince(booking.createdAt);
  const isCancelled = booking.status === "CANCELLED";
  const isConfirmed = booking.status === "CONFIRMED";
  const isStuck = !isCancelled && !isConfirmed && age > 7;
  const isWarn = !isCancelled && !isConfirmed && age > 2 && age <= 7;
  const cardTone = isStuck
    ? "border-red-300 bg-red-50"
    : isWarn
      ? "border-yellow-300 bg-yellow-50"
      : "border-lightgray bg-white";

  // Deposit deadline urgency
  const depositHours =
    booking.status === "DEPOSIT_PENDING"
      ? hoursUntil(booking.depositDeadline ?? null)
      : null;

  return (
    <div className={`rounded-[5px] border p-2 text-sm ${cardTone}`}>
      <div className="font-medium text-black truncate">
        {booking.firstName} {booking.lastName}
      </div>
      <div className="text-xs text-gray truncate">
        {booking.location.name} · {formatCategory(booking.category)}
      </div>
      {booking.moveInDate && (
        <div className="text-xs text-gray mt-1">
          Move-in: {formatDate(booking.moveInDate)}
        </div>
      )}
      {booking.room && (
        <div className="text-xs text-gray">Room: #{booking.room.roomNumber}</div>
      )}
      {depositHours !== null && (
        <div
          className={`text-xs mt-1 font-medium ${
            depositHours < 0
              ? "text-red-600"
              : depositHours < 24
                ? "text-orange-600"
                : "text-gray"
          }`}
        >
          Deposit: {depositHours < 0 ? `${Math.abs(depositHours)}h overdue` : `${depositHours}h left`}
        </div>
      )}
      {isCancelled && booking.cancellationReason && (
        <div className="text-xs text-red-700 mt-1 italic truncate">
          {booking.cancellationReason}
        </div>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-lightgray/50">
        <span className="text-[10px] text-gray uppercase">
          {age === 0 ? "Today" : `${age}d ago`}
        </span>
        <BookingActions booking={booking} onCancel={onCancel} compact />
      </div>
    </div>
  );
}

/**
 * Context-aware actions:
 *  - Leads + Awaiting deposit → Cancel
 *  - Confirmed (pre-move-in)  → Open in Tenants (for Widerruf / Terminate)
 *  - Cancelled / legacy       → no action
 */
function BookingActions({
  booking,
  onCancel,
  compact,
}: {
  booking: Booking;
  onCancel: () => void;
  compact?: boolean;
}) {
  const baseBtn = compact
    ? "text-xs px-2 py-0.5 rounded-[5px]"
    : "px-3 py-1 text-xs font-medium rounded-[5px] border";

  if (booking.status === "DEPOSIT_PENDING") {
    return (
      <button
        onClick={onCancel}
        className={`${baseBtn} text-red-600 hover:bg-red-50 ${
          compact ? "" : "border-red-300"
        }`}
      >
        Cancel
      </button>
    );
  }
  if (booking.status === "PENDING") {
    // Leads bleiben stehen — kein manuelles Cancel, sie fallen nach 60 Tagen
    // eh automatisch aus der Pipeline für Retargeting-Zwecke.
    return compact ? null : (
      <span className="text-xs text-gray italic">Lead (keeps for retargeting)</span>
    );
  }
  if (booking.status === "CONFIRMED") {
    const tenantId = booking.tenant?.id;
    return tenantId ? (
      <Link
        href={`/admin/tenants/${tenantId}`}
        className={`${baseBtn} text-black hover:bg-background-alt ${
          compact ? "" : "border-lightgray"
        }`}
      >
        Open in Tenants →
      </Link>
    ) : (
      <span className="text-xs text-gray italic">No tenant linked</span>
    );
  }
  // Cancelled or legacy → no primary action
  return null;
}

function CancelModal({
  target,
  working,
  onConfirm,
  onClose,
}: {
  target: CancelTarget;
  working: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");

  function submit(origin: "guest" | "us") {
    const base = origin === "guest" ? "Cancelled by guest" : "Cancelled by us";
    const reason = note.trim() ? `${base} — ${note.trim()}` : base;
    onConfirm(reason);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-black">Cancel booking</h3>
          <button onClick={onClose} className="text-gray hover:text-black" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray">
          Cancelling <strong className="text-black">{target.name}</strong>.
          Who&apos;s initiating this cancel?
        </p>
        <label className="block">
          <span className="block text-xs text-gray mb-1">
            Note (optional — internal detail)
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
            placeholder="z.B. anrufte, kein Grund angegeben"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => submit("guest")}
            disabled={working}
            className="px-3 py-2 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt disabled:opacity-50"
          >
            {working ? "..." : "Cancelled by guest"}
          </button>
          <button
            onClick={() => submit("us")}
            disabled={working}
            className="px-3 py-2 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt disabled:opacity-50"
          >
            {working ? "..." : "Cancelled by us"}
          </button>
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="text-xs text-gray hover:text-black underline"
          >
            Keep booking
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableTh({
  col,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  col: "date" | "movein" | "name" | "status";
  label: string;
  sortBy: "date" | "movein" | "name" | "status";
  sortDir: "asc" | "desc";
  onSort: (col: "date" | "movein" | "name" | "status") => void;
}) {
  const active = sortBy === col;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 hover:text-black ${active ? "text-black" : ""}`}
      >
        {label}
        <Icon className="w-3 h-3" />
      </button>
    </th>
  );
}

function HelpItem({
  tone,
  label,
  text,
}: {
  tone: string;
  label: string;
  text: string;
}) {
  return (
    <div className="flex gap-2">
      <span
        className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold whitespace-nowrap h-fit ${tone}`}
      >
        {label}
      </span>
      <span className="text-gray leading-relaxed">{text}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-orange-600"
        : tone === "ok"
          ? "text-green-600"
          : "text-black";
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-4">
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray mt-1">{sub}</p>}
    </div>
  );
}
