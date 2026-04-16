"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Pin,
  Trash2,
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
  signatureDocumentId?: string | null;
  bookingFeePaidAt?: string | null;
  depositPaidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  location: Location;
  room: { id: string; roomNumber: string } | null;
  tenant?: { id: string } | null;
};

type TeamNote = {
  id: string;
  content: string;
  author: string | null;
  sticky: boolean;
  createdAt: string;
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

function daysSince(iso: string, nowTs: number): number {
  return Math.floor((nowTs - new Date(iso).getTime()) / 86_400_000);
}

function hoursUntil(iso: string | null, nowTs: number): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - nowTs) / 3_600_000);
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
  confirmedWithoutTenant: number;
};

export default function BookingsPage({
  bookings,
  locations,
  kpis,
  notesByBooking,
}: {
  bookings: Booking[];
  locations: Location[];
  kpis: BookingKpis;
  notesByBooking: Record<string, TeamNote[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read everything from URL so the state is shareable via link and
  // survives reload. writeParams() rewrites the URL via router.replace
  // without triggering a full re-render cascade.
  const view =
    (searchParams.get("view") as "table" | "kanban" | "calendar") ?? "table";
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

  // Stable "now" for render-time age math (React Compiler purity).
  const [nowTs] = useState(() => Date.now());

  // Local-only UI state (not worth URL-syncing)
  const [detailId, setDetailId] = useState<string | null>(null);
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
  const {
    depositSoon,
    depositOverdue,
    moveInsThisWeek,
    moveInsNext4Weeks,
    staleLeads,
    confirmedWithoutTenant,
  } = kpis;

  // IDs of all DEPOSIT_PENDING bookings currently in the filtered list —
  // for the "Remind all" bulk action. Recomputed whenever filters change.
  const depositPendingIds = useMemo(
    () => filtered.filter((b) => b.status === "DEPOSIT_PENDING").map((b) => b.id),
    [filtered]
  );
  const [bulkSending, setBulkSending] = useState(false);

  async function bulkSendDepositReminders() {
    if (depositPendingIds.length === 0) return;
    if (
      !confirm(
        `Deposit reminder an alle ${depositPendingIds.length} Buchungen in "Awaiting deposit" senden?`
      )
    )
      return;
    setBulkSending(true);
    let sent = 0;
    let failed = 0;
    for (const id of depositPendingIds) {
      try {
        const res = await fetch("/api/admin/emails/resend-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: id, templateKey: "deposit_reminder" }),
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setBulkSending(false);
    alert(`Reminders: ${sent} gesendet, ${failed} fehlgeschlagen.`);
    router.refresh();
  }

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
      {/* Data-integrity banner — CONFIRMED with no Tenant row is an
          operational bug and should be cleaned up manually. */}
      {confirmedWithoutTenant > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[5px] text-sm text-red-800 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>{confirmedWithoutTenant}</strong> confirmed booking
            {confirmedWithoutTenant === 1 ? " is" : "s are"} missing a linked
            Tenant. The webhook should have created one — investigate in the
            table below.
          </div>
        </div>
      )}

      {/* Action-focused KPIs — deposits split into two cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        <Stat
          label="Deposits overdue"
          value={depositOverdue}
          tone={depositOverdue > 0 ? "danger" : "ok"}
          sub={depositOverdue > 0 ? "Past the 48h window" : "None overdue"}
        />
        <Stat
          label="Deposits · 24h"
          value={depositSoon}
          tone={depositSoon > 0 ? "warn" : "ok"}
          sub={depositSoon > 0 ? "Send a reminder" : "All on track"}
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
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm border-l border-lightgray ${
                view === "kanban"
                  ? "bg-black text-white"
                  : "bg-white text-gray hover:bg-background-alt"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => writeParams({ view: "calendar" })}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm border-l border-lightgray ${
                view === "calendar"
                  ? "bg-black text-white"
                  : "bg-white text-gray hover:bg-background-alt"
              }`}
            >
              <CalendarIcon className="w-4 h-4" /> Calendar
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
          {depositPendingIds.length > 1 && (
            <button
              onClick={bulkSendDepositReminders}
              disabled={bulkSending}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[5px] border border-lightgray bg-white hover:border-black disabled:opacity-40"
              title={`Send deposit reminder to ${depositPendingIds.length} bookings`}
            >
              {bulkSending
                ? "Sending…"
                : `Remind all deposit (${depositPendingIds.length})`}
            </button>
          )}
          <span className="ml-auto text-gray">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {view === "table" && (
        <TableView
          bookings={filtered}
          detailId={detailId}
          setDetailId={setDetailId}
          sortBy={sortBy}
          sortDir={sortDir}
          nowTs={nowTs}
          onSort={(col) =>
            writeParams({
              sortBy: col,
              sortDir: sortBy === col && sortDir === "desc" ? "asc" : "desc",
            })
          }
        />
      )}
      {view === "kanban" && (
        <KanbanView
          bookings={kanbanFiltered}
          nowTs={nowTs}
          onOpen={(b) => setDetailId(b.id)}
          onCancel={(b) =>
            setCancelTarget({
              id: b.id,
              name: `${b.firstName} ${b.lastName}`,
              status: b.status,
            })
          }
        />
      )}
      {view === "calendar" && (
        <CalendarView bookings={filtered} onOpen={(b) => setDetailId(b.id)} />
      )}

      {/* Detail side panel */}
      {detailId && (() => {
        const b = bookings.find((x) => x.id === detailId);
        if (!b) return null;
        return (
          <BookingDetailPanel
            booking={b}
            notes={notesByBooking[b.id] ?? []}
            nowTs={nowTs}
            onClose={() => setDetailId(null)}
            onCancel={() =>
              setCancelTarget({
                id: b.id,
                name: `${b.firstName} ${b.lastName}`,
                status: b.status,
              })
            }
          />
        );
      })()}

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
  detailId,
  setDetailId,
  sortBy,
  sortDir,
  nowTs,
  onSort,
}: {
  bookings: Booking[];
  detailId: string | null;
  setDetailId: (id: string | null) => void;
  sortBy: "date" | "movein" | "name" | "status";
  sortDir: "asc" | "desc";
  nowTs: number;
  onSort: (col: "date" | "movein" | "name" | "status") => void;
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
                <tr
                  key={b.id}
                  onClick={() => setDetailId(b.id)}
                  className={`border-b border-lightgray/50 hover:bg-background-alt cursor-pointer transition-colors ${detailId === b.id ? "bg-background-alt" : ""}`}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${STATUS_COLORS[b.status] || ""}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                      <StatusAgeBadge booking={b} nowTs={nowTs} />
                    </div>
                  </td>
                </tr>
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
  nowTs,
  onOpen,
  onCancel,
}: {
  bookings: Booking[];
  nowTs: number;
  onOpen: (b: Booking) => void;
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
                    nowTs={nowTs}
                    onOpen={() => onOpen(b)}
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
  nowTs,
  onOpen,
  onCancel,
}: {
  booking: Booking;
  nowTs: number;
  onOpen: () => void;
  onCancel: () => void;
}) {
  const age = daysSince(booking.createdAt, nowTs);
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
      ? hoursUntil(booking.depositDeadline ?? null, nowTs)
      : null;

  return (
    <div
      onClick={onOpen}
      className={`rounded-[5px] border p-2 text-sm cursor-pointer hover:shadow-sm ${cardTone}`}
    >
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
        <div onClick={(e) => e.stopPropagation()}>
          <BookingActions booking={booking} onCancel={onCancel} compact />
        </div>
      </div>
    </div>
  );
}

/**
 * Context-aware actions:
 *  - Leads + Awaiting deposit → Cancel + Resend dropdown
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
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <ResendBookingEmailDropdown bookingId={booking.id} compact={compact} />
        <button
          onClick={onCancel}
          className={`${baseBtn} text-red-600 hover:bg-red-50 ${
            compact ? "" : "border-red-300"
          }`}
        >
          Cancel
        </button>
      </div>
    );
  }
  if (booking.status === "PENDING") {
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
      <span className={`${baseBtn} text-red-700 ${compact ? "" : "border-red-300 bg-red-50"}`}>
        ⚠ No tenant linked
      </span>
    );
  }
  return null;
}

/** Resend email dropdown scoped to a single Booking. Currently offers
 *  deposit_reminder for bookings in the DEPOSIT_PENDING stage — other
 *  templates can be added as we wire more booking-state emails. */
function ResendBookingEmailDropdown({
  bookingId,
  compact,
}: {
  bookingId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const templates: { key: string; label: string }[] = [
    { key: "deposit_reminder", label: "Deposit reminder" },
  ];

  async function resend(templateKey: string) {
    if (!confirm(`${templateKey} an diesen Mieter senden?`)) return;
    setBusy(templateKey);
    try {
      const res = await fetch("/api/admin/emails/resend-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, templateKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`✓ Gesendet an ${data.sentTo}`);
        setOpen(false);
        router.refresh();
      } else {
        alert(`Fehler: ${data.error ?? res.statusText}`);
      }
    } finally {
      setBusy(null);
    }
  }

  const btnCls = compact
    ? "text-xs px-2 py-0.5 rounded-[5px]"
    : "px-3 py-1 text-xs font-medium rounded-[5px] border border-lightgray";

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${btnCls} inline-flex items-center gap-1 hover:bg-background-alt`}
      >
        Resend <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 bg-white border border-lightgray rounded-[5px] shadow-lg z-50">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => resend(t.key)}
                disabled={busy !== null}
                className="w-full text-left px-3 py-2 text-sm hover:bg-background-alt disabled:opacity-40"
              >
                {busy === t.key ? "Sending…" : t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
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

/** Sliding right-hand panel that replaces the inline expand. Shows
 *  contact, details, address, timeline, booking-scoped team notes, and
 *  actions. Closes via X, Esc, or backdrop click. */
function BookingDetailPanel({
  booking,
  notes,
  nowTs,
  onClose,
  onCancel,
}: {
  booking: Booking;
  notes: TeamNote[];
  nowTs: number;
  onClose: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Inline new-note form
  const [noteContent, setNoteContent] = useState("");
  const [noteAuthor, setNoteAuthor] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem("stacey-admin-note-author") ?? "";
    } catch {
      return "";
    }
  });
  const [savingNote, setSavingNote] = useState(false);

  async function addNote() {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/admin/team-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          author: noteAuthor || undefined,
          bookingId: booking.id,
        }),
      });
      if (res.ok) {
        setNoteContent("");
        try {
          if (noteAuthor)
            window.localStorage.setItem("stacey-admin-note-author", noteAuthor);
        } catch {
          /* ignore */
        }
        router.refresh();
      }
    } finally {
      setSavingNote(false);
    }
  }

  async function toggleStickyNote(id: string, sticky: boolean) {
    await fetch(`/api/admin/team-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sticky: !sticky }),
    });
    router.refresh();
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/admin/team-notes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  // Timeline steps derived from booking timestamps
  type Step = { label: string; at: string | null; done: boolean };
  const timeline: Step[] = [
    { label: "Started", at: booking.createdAt, done: true },
    {
      label: "Contract signed",
      at: null, // we only have a flag, not a timestamp
      done: Boolean(booking.signatureDocumentId),
    },
    {
      label: "Booking fee paid",
      at: booking.bookingFeePaidAt ?? null,
      done: Boolean(booking.bookingFeePaidAt),
    },
    {
      label: "Deposit paid",
      at: booking.depositPaidAt ?? null,
      done: Boolean(booking.depositPaidAt),
    },
    {
      label:
        booking.status === "CANCELLED"
          ? "Cancelled"
          : booking.tenant
            ? "Tenant"
            : "Move-in pending",
      at:
        booking.status === "CANCELLED"
          ? (booking.updatedAt ?? null)
          : booking.moveInDate,
      done: booking.status === "CANCELLED" || Boolean(booking.tenant),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden
      />
      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white z-50 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-lightgray px-5 py-3 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray flex items-center gap-2">
              <span>{formatDate(booking.createdAt)}</span>
              <span>·</span>
              <span>
                {booking.location.name}
                {booking.room && ` · #${booking.room.roomNumber}`}
              </span>
            </div>
            <h2 className="text-lg font-bold text-black truncate mt-0.5">
              {booking.firstName} {booking.lastName}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span
                className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${STATUS_COLORS[booking.status] || ""}`}
              >
                {STATUS_LABEL[booking.status] ?? booking.status}
              </span>
              <StatusAgeBadge booking={booking} nowTs={nowTs} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray hover:text-black p-1 -mr-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Primary actions */}
          <div>
            <BookingActions booking={booking} onCancel={onCancel} />
          </div>

          {/* Timeline */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
              Timeline
            </div>
            <ol className="space-y-2">
              {timeline.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {s.done ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 text-lightgray flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={s.done ? "text-black" : "text-gray"}>
                      {s.label}
                    </div>
                    {s.at && (
                      <div className="text-[11px] text-gray tabular-nums">
                        {formatDate(s.at)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Contact */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
              Contact
            </div>
            <div className="text-sm space-y-0.5">
              <div>
                <a
                  href={`mailto:${booking.email}`}
                  className="text-black hover:underline"
                >
                  {booking.email}
                </a>
              </div>
              {booking.phone && (
                <div>
                  <a
                    href={`tel:${booking.phone}`}
                    className="text-black hover:underline"
                  >
                    {booking.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
              Details
            </div>
            <div className="text-sm space-y-0.5">
              <div>
                Category: <strong>{formatCategory(booking.category)}</strong>
              </div>
              <div>Persons: {booking.persons}</div>
              {booking.monthlyRent !== null && (
                <div>
                  Rent:{" "}
                  <strong>
                    €{(booking.monthlyRent / 100).toFixed(0)}
                  </strong>
                  /mo
                </div>
              )}
              {booking.moveInDate && (
                <div>Move-in: {formatDate(booking.moveInDate)}</div>
              )}
              {booking.moveInReason && (
                <div>Reason: {booking.moveInReason}</div>
              )}
              {booking.message && (
                <div>
                  Message: <em>{booking.message}</em>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {booking.street && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
                Address
              </div>
              <div className="text-sm">
                <div>
                  {booking.street}, {booking.zipCode} {booking.addressCity}
                </div>
                {booking.country && <div>{booking.country}</div>}
              </div>
            </div>
          )}

          {/* Cancellation */}
          {booking.cancellationReason && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
                Cancellation
              </div>
              <div className="text-sm italic text-red-700">
                {booking.cancellationReason}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
              Notes · {notes.length}
            </div>
            <div className="flex gap-2 items-start mb-2">
              <input
                type="text"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
                placeholder="Name"
                className="w-24 px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
              />
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addNote();
                }}
                placeholder="Add a note…"
                className="flex-1 px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
              />
              <button
                onClick={addNote}
                disabled={savingNote || !noteContent.trim()}
                className="px-3 py-1.5 rounded-[5px] bg-black text-white text-sm hover:bg-black/90 disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-gray italic">No notes yet.</p>
            ) : (
              <div className="divide-y divide-lightgray/60 border border-lightgray/50 rounded-[5px]">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 px-3 py-2 ${n.sticky ? "bg-yellow-50" : ""}`}
                  >
                    <button
                      onClick={() => void toggleStickyNote(n.id, n.sticky)}
                      className={`mt-1 ${n.sticky ? "text-orange-600" : "text-lightgray hover:text-gray"}`}
                      title={n.sticky ? "Un-pin" : "Pin"}
                    >
                      <Pin className={`w-3 h-3 ${n.sticky ? "fill-current" : ""}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-black whitespace-pre-wrap break-words">
                        {n.content}
                      </div>
                      <div className="text-[10px] text-gray mt-0.5">
                        {n.author ? `${n.author} · ` : ""}
                        {formatDate(n.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => void deleteNote(n.id)}
                      className="text-gray hover:text-red-500 mt-1"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ID */}
          <div className="text-[10px] text-gray font-mono pt-2 border-t border-lightgray">
            {booking.id}
          </div>
        </div>
      </div>
    </>
  );
}

/** Month calendar view with bookings placed on their move-in date.
 *  Quick navigation buttons let the admin jump by month. */
function CalendarView({
  bookings,
  onOpen,
}: {
  bookings: Booking[];
  onOpen: (b: Booking) => void;
}) {
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Mon=0

  // Group bookings by day-of-month of moveInDate within the current month
  // (React Compiler memoises this automatically — no useMemo needed).
  const byDay = new Map<number, Booking[]>();
  for (const b of bookings) {
    if (!b.moveInDate) continue;
    const d = new Date(b.moveInDate);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = d.getDate();
    const arr = byDay.get(key) ?? [];
    arr.push(b);
    byDay.set(key, arr);
  }

  function shift(n: number) {
    const next = new Date(year, month + n, 1);
    setAnchor(next);
  }

  const monthLabel = anchor.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lightgray bg-background-alt">
        <h3 className="text-sm font-semibold capitalize">{monthLabel}</h3>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => shift(-1)}
            className="px-2 py-1 border border-lightgray rounded-[5px] hover:bg-white"
          >
            ‹ Prev
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              setAnchor(d);
            }}
            className="px-2 py-1 border border-lightgray rounded-[5px] hover:bg-white"
          >
            Today
          </button>
          <button
            onClick={() => shift(1)}
            className="px-2 py-1 border border-lightgray rounded-[5px] hover:bg-white"
          >
            Next ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-lightgray bg-background-alt/60 text-[10px] uppercase tracking-wide text-gray">
        {weekdays.map((w) => (
          <div key={w} className="px-2 py-1.5 text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div
            key={`blank-${i}`}
            className="border-r border-b border-lightgray/40 bg-background-alt/30 min-h-[100px]"
          />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const items = byDay.get(day) ?? [];
          const isToday = (() => {
            const t = new Date();
            return (
              t.getFullYear() === year &&
              t.getMonth() === month &&
              t.getDate() === day
            );
          })();
          return (
            <div
              key={day}
              className={`border-r border-b border-lightgray/40 p-1.5 min-h-[100px] align-top ${isToday ? "bg-pink-50" : ""}`}
            >
              <div className="text-[11px] text-gray tabular-nums mb-1">
                {day}
              </div>
              <div className="space-y-1">
                {items.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onOpen(b)}
                    className={`w-full text-left px-1.5 py-0.5 rounded-[5px] text-[11px] truncate ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-700"} hover:opacity-80`}
                    title={`${b.firstName} ${b.lastName} · ${b.location.name}`}
                  >
                    {b.firstName} {b.lastName}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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

/** Small secondary pill next to the status pill showing how long the
 *  booking has been sitting in its current stage. For DEPOSIT_PENDING
 *  we use hours (deposit window is 48h), otherwise days since createdAt.
 *  Silent for CANCELLED + CONFIRMED (not actionable). */
function StatusAgeBadge({
  booking,
  nowTs,
}: {
  booking: Booking;
  nowTs: number;
}) {
  if (booking.status === "DEPOSIT_PENDING") {
    const h = hoursUntil(booking.depositDeadline ?? null, nowTs);
    if (h === null) return null;
    const cls =
      h < 0
        ? "bg-red-100 text-red-700"
        : h < 24
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-100 text-gray-600";
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold ${cls}`}>
        {h < 0 ? `${Math.abs(h)}h overdue` : `${h}h left`}
      </span>
    );
  }
  if (booking.status === "PENDING") {
    const d = daysSince(booking.createdAt, nowTs);
    if (d < 2) return null;
    const cls =
      d > 14
        ? "bg-red-100 text-red-700"
        : d > 7
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-100 text-gray-600";
    return (
      <span
        className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold ${cls}`}
        title="Days since the booking was created"
      >
        {d}d old
      </span>
    );
  }
  return null;
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
