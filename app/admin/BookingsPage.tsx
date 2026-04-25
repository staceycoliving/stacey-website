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
  AlertTriangle,
  DoorOpen,
  Euro,
  Send,
  MessageSquare,
  Archive,
  Inbox,
} from "lucide-react";
import { toast, Breadcrumbs, EmptyState, SkeletonText } from "@/components/admin/ui";

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
  cancellationKind?: string | null;
  signatureDocumentId?: string | null;
  bookingFeePaidAt?: string | null;
  depositPaidAt?: string | null;
  bookingFeeRefundedAt?: string | null;
  bookingFeeRefundAmount?: number | null;
  bookingFeeSessionId?: string | null;
  leadSource: string | null;
  leadMedium: string | null;
  leadCampaign: string | null;
  leadReferrer: string | null;
  leadSourceOverride: string | null;
  retargetingEligible: boolean;
  retargetingLastSentAt: string | null;
  retargetingSentCount: number;
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
  tags?: string[];
  followUpAt?: string | null;
  createdAt: string;
};

type BookingEmail = {
  id: string;
  templateKey: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  triggeredBy: string;
  sentAt: string;
};

type AuditEvent = {
  id: string;
  at: string;
  module: string;
  action: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
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
  if (!d) return ",";
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
  retargetingEligible: number;
  confirmedWithoutTenant: number;
};

export default function BookingsPage({
  bookings,
  locations,
  kpis,
  notesByBooking,
  emailsByBooking,
  auditByBooking,
  duplicateEmails,
}: {
  bookings: Booking[];
  locations: Location[];
  kpis: BookingKpis;
  notesByBooking: Record<string, TeamNote[]>;
  emailsByBooking: Record<string, BookingEmail[]>;
  auditByBooking: Record<string, AuditEvent[]>;
  duplicateEmails: Record<string, number>;
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
  const kpiFilter = (searchParams.get("kpiFilter") as
    | "overdue"
    | "soon"
    | "moveInsWeek"
    | "moveInsMonth"
    | "stale"
    | "retargeting"
    | null) ?? null;

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
  // keystroke, easier on both React and the URL history stack.
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
    const nowMsLocal = nowTs;
    const week = 7 * 86_400_000;
    const month = 28 * 86_400_000;
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
      // KPI filter, narrows to the subset behind each KPI card
      if (kpiFilter === "overdue") {
        if (b.status !== "DEPOSIT_PENDING") return false;
        if (!b.depositDeadline) return false;
        if (new Date(b.depositDeadline).getTime() >= nowMsLocal) return false;
      } else if (kpiFilter === "soon") {
        if (b.status !== "DEPOSIT_PENDING" || !b.depositDeadline) return false;
        const left = new Date(b.depositDeadline).getTime() - nowMsLocal;
        if (left <= 0 || left > 24 * 3_600_000) return false;
      } else if (kpiFilter === "moveInsWeek") {
        if (b.status !== "CONFIRMED" || !b.moveInDate) return false;
        const diff = new Date(b.moveInDate).getTime() - nowMsLocal;
        if (diff < 0 || diff > week) return false;
      } else if (kpiFilter === "moveInsMonth") {
        if (b.status !== "CONFIRMED" || !b.moveInDate) return false;
        const diff = new Date(b.moveInDate).getTime() - nowMsLocal;
        if (diff < 0 || diff > month) return false;
      } else if (kpiFilter === "stale") {
        if (b.status !== "PENDING") return false;
        const age = nowMsLocal - new Date(b.createdAt).getTime();
        if (age <= 14 * 86_400_000) return false;
      } else if (kpiFilter === "retargeting") {
        if (b.status !== "PENDING" || !b.retargetingEligible) return false;
      }
      if (searchLc) {
        const hay = [
          b.firstName,
          b.lastName,
          b.email,
          b.phone,
          b.room?.roomNumber ?? "",
          b.id,
          b.message ?? "",
          b.moveInReason ?? "",
          b.street ?? "",
          b.zipCode ?? "",
          b.addressCity ?? "",
          b.leadSource ?? "",
          b.leadCampaign ?? "",
          b.leadSourceOverride ?? "",
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
    kpiFilter,
    nowTs,
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
  // the client render pure, React Compiler rejects Date.now() calls here.
  const {
    depositSoon,
    depositOverdue,
    moveInsThisWeek,
    moveInsNext4Weeks,
    staleLeads,
    confirmedWithoutTenant,
  } = kpis;

  // IDs of all DEPOSIT_PENDING bookings currently in the filtered list ,
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
    toast.info(`Reminders:  gesendet,  fehlgeschlagen.`);
    router.refresh();
  }

  // Stale leads = PENDING + > 14d old (matches KPI definition)
  const staleLeadIds = useMemo(() => {
    const cutoff = nowTs - 14 * 86_400_000;
    return filtered
      .filter(
        (b) =>
          b.status === "PENDING" &&
          new Date(b.createdAt).getTime() < cutoff
      )
      .map((b) => b.id);
  }, [filtered, nowTs]);

  async function bulkArchiveStaleLeads() {
    if (staleLeadIds.length === 0) return;
    if (
      !confirm(
        `${staleLeadIds.length} stale lead${staleLeadIds.length === 1 ? "" : "s"} (> 14 Tage alt) als LEAD_ABANDONED cancelen?\n\nRetargeting wird dabei abgeschaltet. Kein Refund.`
      )
    )
      return;
    setBulkSending(true);
    let done = 0;
    let failed = 0;
    for (const id of staleLeadIds) {
      try {
        const res = await fetch(`/api/admin/bookings/${id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "LEAD_ABANDONED",
            reason: "Auto-archived: stale >14d, no progress",
          }),
        });
        if (res.ok) done++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setBulkSending(false);
    toast.info(`Archived  stale leads,  failed.`);
    router.refresh();
  }

  async function cancelBooking(
    bookingId: string,
    kind: string,
    reason: string
  ) {
    setUpdating(bookingId);
    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, reason: reason || undefined }),
        }
      );
      if (res.ok) {
        setCancelTarget(null);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Cancel failed", { description: data.error ?? res.statusText });
      }
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
    setUpdating(null);
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Bookings" }]} />
      {/* Data-integrity banner, CONFIRMED with no Tenant row is an
          operational bug and should be cleaned up manually. */}
      {confirmedWithoutTenant > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[5px] text-sm text-red-800 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>{confirmedWithoutTenant}</strong> confirmed booking
            {confirmedWithoutTenant === 1 ? " is" : "s are"} missing a linked
            Tenant. The webhook should have created one, investigate in the
            table below.
          </div>
        </div>
      )}

      {/* Action-focused KPIs, click to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <Stat
          label="Deposits overdue"
          value={depositOverdue}
          tone={depositOverdue > 0 ? "danger" : "ok"}
          sub={depositOverdue > 0 ? "Past the 48h window" : "None overdue"}
          onClick={() =>
            writeParams({
              status: "DEPOSIT_PENDING",
              view: "table",
              kpiFilter: "overdue",
            })
          }
          active={kpiFilter === "overdue"}
        />
        <Stat
          label="Deposits · 24h"
          value={depositSoon}
          tone={depositSoon > 0 ? "warn" : "ok"}
          sub={depositSoon > 0 ? "Send a reminder" : "All on track"}
          onClick={() =>
            writeParams({
              status: "DEPOSIT_PENDING",
              view: "table",
              kpiFilter: "soon",
            })
          }
          active={kpiFilter === "soon"}
        />
        <Stat
          label="Move-ins this week"
          value={moveInsThisWeek}
          tone={moveInsThisWeek > 0 ? "warn" : undefined}
          sub={moveInsThisWeek > 0 ? "Prepare welcome / keys" : "Nothing scheduled"}
          onClick={() =>
            writeParams({
              status: "CONFIRMED",
              view: "table",
              kpiFilter: "moveInsWeek",
            })
          }
          active={kpiFilter === "moveInsWeek"}
        />
        <Stat
          label="Move-ins · next 4 weeks"
          value={moveInsNext4Weeks}
          sub="Confirmed pipeline"
          onClick={() =>
            writeParams({
              status: "CONFIRMED",
              view: "table",
              kpiFilter: "moveInsMonth",
            })
          }
          active={kpiFilter === "moveInsMonth"}
        />
        <Stat
          label="Stale leads"
          value={staleLeads}
          tone={staleLeads > 0 ? "warn" : undefined}
          sub={staleLeads > 0 ? ">14d, no follow-up" : "All fresh"}
          onClick={() =>
            writeParams({
              status: "PENDING",
              view: "table",
              kpiFilter: "stale",
            })
          }
          active={kpiFilter === "stale"}
        />
        <Stat
          label="Retargeting eligible"
          value={kpis.retargetingEligible}
          tone={kpis.retargetingEligible > 0 ? "warn" : undefined}
          sub="PENDING leads still reachable"
          onClick={() =>
            writeParams({
              status: "PENDING",
              view: "table",
              kpiFilter: "retargeting",
            })
          }
          active={kpiFilter === "retargeting"}
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
            search ||
            kpiFilter) && (
            <button
              onClick={() =>
                writeParams({
                  q: null,
                  location: null,
                  status: null,
                  moveInFrom: null,
                  moveInTo: null,
                  kpiFilter: null,
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
          {staleLeadIds.length > 0 && (
            <button
              onClick={bulkArchiveStaleLeads}
              disabled={bulkSending}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[5px] border border-lightgray bg-white hover:border-black disabled:opacity-40"
              title={`Archive ${staleLeadIds.length} stale leads as LEAD_ABANDONED`}
            >
              <Archive className="w-3 h-3" />
              {bulkSending ? "…" : `Archive ${staleLeadIds.length} stale`}
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
            emails={emailsByBooking[b.id] ?? []}
            auditEvents={auditByBooking[b.id] ?? []}
            isDuplicate={Boolean(duplicateEmails[b.email.toLowerCase().trim()])}
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
          onConfirm={(kind, reason) =>
            cancelBooking(cancelTarget.id, kind, reason)
          }
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
              <SortableTh col="date" label="Created" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
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
                <td colSpan={7} className="px-0 py-0">
                  <EmptyState
                    icon={<Inbox className="w-5 h-5" />}
                    title="No bookings found"
                    description="Try a different filter or search term."
                  />
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
                  <td className="px-4 py-3">{b.room ? `#${b.room.roomNumber}` : ","}</td>
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
                <EmptyState size="sm" title="Empty" />
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
 *  deposit_reminder for bookings in the DEPOSIT_PENDING stage, other
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
        toast.success(`Gesendet an ${data.sentTo}`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Fehler", { description: data.error ?? res.statusText });
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

/** Structured cancellation modal. Admin picks a kind (enum), that
 *  determines whether the guest's booking fee is refundable. Reason is
 *  optional free text for internal detail. */
const CANCEL_KIND_OPTIONS: { value: string; label: string; hint: string }[] = [
  {
    value: "WIDERRUF_BY_TENANT",
    label: "Widerruf (Mieter)",
    hint: "14-Tage-Frist nach Kaution. Booking-Fee behalten, Kaution refunden über Withdraw-Flow.",
  },
  {
    value: "CANCELLED_BY_STACEY",
    label: "Storno durch uns",
    hint: "Überbuchung / Supply-Problem. Volle Rückzahlung, Refund-Button erscheint danach.",
  },
  {
    value: "DEPOSIT_TIMEOUT",
    label: "Deposit-Timeout",
    hint: "Automatisch: Kaution nicht rechtzeitig. Booking-Fee behalten.",
  },
  {
    value: "LEAD_ABANDONED",
    label: "Stale Lead",
    hint: "Lead über 14+ Tage alt, kein Fortschritt. Nichts zu refunden.",
  },
  {
    value: "TENANT_NO_SHOW",
    label: "No-Show",
    hint: "Kaution bezahlt, aber nie eingezogen. Case-by-case entscheiden.",
  },
  {
    value: "OTHER",
    label: "Andere",
    hint: "Freitext-Grund angeben.",
  },
];

function CancelModal({
  target,
  working,
  onConfirm,
  onClose,
}: {
  target: CancelTarget;
  working: boolean;
  onConfirm: (kind: string, reason: string) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<string>("LEAD_ABANDONED");
  const [note, setNote] = useState("");

  const selected = CANCEL_KIND_OPTIONS.find((o) => o.value === kind);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-black">Cancel booking</h3>
          <button
            onClick={onClose}
            className="text-gray hover:text-black"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray">
          Cancelling <strong className="text-black">{target.name}</strong>.
        </p>
        <label className="block">
          <span className="block text-xs text-gray mb-1">
            Cancellation kind
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            {CANCEL_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {selected && (
            <p className="text-xs text-gray mt-1 leading-relaxed">
              {selected.hint}
            </p>
          )}
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">
            Reason (optional detail)
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
            placeholder="z.B. keine Antwort trotz 3 Follow-ups"
          />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Keep booking
          </button>
          <button
            onClick={() => onConfirm(kind, note.trim())}
            disabled={working}
            className="px-3 py-2 text-sm bg-red-600 text-white rounded-[5px] hover:bg-red-700 disabled:opacity-50"
          >
            {working ? "Cancelling…" : "Confirm cancel"}
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
  emails,
  auditEvents,
  isDuplicate,
  nowTs,
  onClose,
  onCancel,
}: {
  booking: Booking;
  notes: TeamNote[];
  emails: BookingEmail[];
  auditEvents: AuditEvent[];
  isDuplicate: boolean;
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
          {/* Duplicate warning */}
          {isDuplicate && (
            <div className="bg-orange-50 border border-orange-200 rounded-[5px] p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-orange-900">
                  Possible duplicate
                </div>
                <div className="text-orange-800">
                  This email address appears on more than one active booking.
                  Check for duplicate submissions before taking action.
                </div>
              </div>
            </div>
          )}

          {/* Guest message, prominent if present */}
          {(booking.message || booking.moveInReason) && (
            <div className="bg-pink/10 border-l-4 border-l-pink rounded-[5px] p-3">
              <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Guest says
              </div>
              {booking.moveInReason && (
                <div className="text-xs text-gray italic mb-1">
                  Reason: {booking.moveInReason}
                </div>
              )}
              {booking.message && (
                <div className="text-sm text-black whitespace-pre-wrap">
                  &ldquo;{booking.message}&rdquo;
                </div>
              )}
              <a
                href={`mailto:${booking.email}?subject=Re: Deine Buchung bei STACEY ${booking.location.name}`}
                className="inline-flex items-center gap-1 mt-2 text-xs text-black hover:underline font-medium"
              >
                <Send className="w-3 h-3" /> Reply per Email
              </a>
            </div>
          )}

          {/* Primary actions */}
          <div>
            <BookingActions booking={booking} onCancel={onCancel} />
          </div>

          {/* Advanced booking actions (room / retargeting / refund) */}
          <BookingAdvancedActions booking={booking} />

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

          {/* Lead source */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
              Lead source
            </div>
            <BookingLeadSource booking={booking} />
          </div>

          {/* Emails sent for this booking */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2 flex items-center justify-between">
              <span>Emails · {emails.length}</span>
              {emails.filter((e) => e.status === "failed").length > 0 && (
                <span className="text-red-700 font-normal">
                  {emails.filter((e) => e.status === "failed").length} failed
                </span>
              )}
            </div>
            {emails.length === 0 ? (
              <p className="text-xs text-gray italic">
                No emails logged for this booking yet.
              </p>
            ) : (
              <div className="border border-lightgray/60 rounded-[5px] divide-y divide-lightgray/50">
                {emails.slice(0, 8).map((e) => (
                  <div
                    key={e.id}
                    className={`px-3 py-2 text-sm ${
                      e.status === "failed" ? "bg-red-50/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-black truncate">
                        {e.subject ?? e.templateKey}
                      </div>
                      <div className="text-[10px] text-gray tabular-nums flex-shrink-0">
                        {formatDate(e.sentAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray mt-0.5">
                      <code className="font-mono">{e.templateKey}</code>
                      <span>·</span>
                      <span>{e.triggeredBy.replace(/_/g, " ")}</span>
                      <span>·</span>
                      <span
                        className={
                          e.status === "sent"
                            ? "text-green-700"
                            : e.status === "failed"
                              ? "text-red-600"
                              : "text-gray"
                        }
                      >
                        {e.status === "sent"
                          ? "✓ Sent"
                          : e.status === "failed"
                            ? "✗ Failed"
                            : "⊘ Skipped"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {emails.length > 8 && (
              <Link
                href={`/admin/emails?q=${encodeURIComponent(booking.email)}`}
                className="inline-block mt-2 text-xs text-gray hover:text-black underline"
              >
                Show all {emails.length} in email hub →
              </Link>
            )}
          </div>

          {/* Audit events */}
          {auditEvents.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2">
                Admin actions · {auditEvents.length}
              </div>
              <div className="space-y-1.5 text-sm">
                {auditEvents.slice(0, 10).map((a) => {
                  const destructive =
                    /delete|cancel|reset|archive|remove/i.test(a.action);
                  return (
                    <div
                      key={a.id}
                      className={`flex items-start gap-2 px-2 py-1 rounded-[5px] ${
                        destructive
                          ? "border-l-2 border-l-red-400 bg-red-50/50"
                          : ""
                      }`}
                    >
                      <span className="text-[10px] text-gray tabular-nums w-16 flex-shrink-0 pt-0.5">
                        {formatDate(a.at)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">
                          {a.action.replace(/_/g, " ")}
                        </div>
                        {a.summary && (
                          <div className="text-[11px] text-gray truncate">
                            {a.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ID */}
          <div className="text-[10px] text-gray font-mono pt-2 border-t border-lightgray">
            {booking.id}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Advanced actions: Room / Retargeting / Refund ────── */

function BookingAdvancedActions({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const canReassignRoom =
    booking.status !== "CANCELLED" && !booking.tenant;

  const canRefund =
    booking.cancellationKind === "CANCELLED_BY_STACEY" &&
    booking.bookingFeePaidAt &&
    !booking.bookingFeeRefundedAt;

  const isPendingLead = booking.status === "PENDING";

  async function toggleRetargeting(eligible: boolean) {
    setBusy(true);
    try {
      await fetch(`/api/admin/bookings/${booking.id}/retargeting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eligible }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendRetargetingNow() {
    if (!confirm("Send retargeting nudge to this lead now?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/bookings/${booking.id}/retargeting`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Retargeting email sent");
        router.refresh();
      } else {
        toast.error("Failed", { description: data.error ?? "Unknown" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function refundBookingFee() {
    if (
      !confirm(
        `Refund the booking fee (€195) to ${booking.firstName} ${booking.lastName}?`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/bookings/${booking.id}/refund`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Refunded €195");
        router.refresh();
      } else {
        toast.error("Refund failed", { description: data.error ?? "Unknown" });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!canReassignRoom && !canRefund && !isPendingLead) return null;

  return (
    <div className="border border-lightgray rounded-[5px] p-3 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-gray font-semibold">
        Advanced
      </div>

      {canReassignRoom && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <span className="text-gray">Room: </span>
              <strong>
                {booking.room ? `#${booking.room.roomNumber}` : "(none)"}
              </strong>
            </div>
            <button
              onClick={() => setShowRoomModal(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-lightgray rounded-[5px] hover:bg-background-alt"
            >
              <DoorOpen className="w-3 h-3" /> Reassign
            </button>
          </div>
        </div>
      )}

      {isPendingLead && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm">
            <span className="text-gray">Retargeting: </span>
            <strong
              className={
                booking.retargetingEligible ? "text-green-700" : "text-gray"
              }
            >
              {booking.retargetingEligible ? "Enabled" : "Disabled"}
            </strong>
            {booking.retargetingSentCount > 0 && (
              <span className="text-[10px] text-gray ml-1">
                ({booking.retargetingSentCount} sent)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {booking.retargetingEligible && (
              <button
                onClick={sendRetargetingNow}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-lightgray rounded-[5px] hover:bg-background-alt disabled:opacity-50"
                title="Send a nudge email right now"
              >
                <Send className="w-3 h-3" /> Send nudge
              </button>
            )}
            <button
              onClick={() => toggleRetargeting(!booking.retargetingEligible)}
              disabled={busy}
              className="px-2 py-1 text-xs border border-lightgray rounded-[5px] hover:bg-background-alt disabled:opacity-50"
            >
              {booking.retargetingEligible ? "Turn off" : "Turn on"}
            </button>
          </div>
        </div>
      )}

      {canRefund && (
        <div className="flex items-center justify-between gap-2 flex-wrap bg-background-alt -m-3 mt-0 p-3 border-t border-lightgray rounded-b-[5px]">
          <div className="text-sm">
            <div className="font-medium">Booking fee refund</div>
            <div className="text-xs text-gray">
              You cancelled this booking, guest gets the €195 back via Stripe.
            </div>
          </div>
          <button
            onClick={refundBookingFee}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
          >
            <Euro className="w-3 h-3" />
            {busy ? "Refunding…" : "Refund €195"}
          </button>
        </div>
      )}

      {booking.bookingFeeRefundedAt && (
        <div className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Refunded{" "}
          {formatDate(booking.bookingFeeRefundedAt)}
        </div>
      )}

      {showRoomModal && (
        <ReassignRoomModal
          booking={booking}
          onClose={() => setShowRoomModal(false)}
          onSuccess={() => {
            setShowRoomModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Lead source display + manual override ────────────── */

function BookingLeadSource({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [override, setOverride] = useState(booking.leadSourceOverride ?? "");
  const [saving, setSaving] = useState(false);

  async function saveOverride() {
    setSaving(true);
    try {
      await fetch(`/api/admin/bookings/${booking.id}/lead-source`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadSourceOverride: override.trim() || null }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const hasAnyAuto =
    booking.leadSource ||
    booking.leadMedium ||
    booking.leadCampaign ||
    booking.leadReferrer;

  return (
    <div className="text-sm space-y-1">
      {hasAnyAuto ? (
        <>
          {booking.leadSource && (
            <div>
              Source: <code className="text-xs">{booking.leadSource}</code>
              {booking.leadMedium && (
                <span className="text-gray text-xs">
                  {" "}
                  / {booking.leadMedium}
                </span>
              )}
            </div>
          )}
          {booking.leadCampaign && (
            <div>
              Campaign: <code className="text-xs">{booking.leadCampaign}</code>
            </div>
          )}
          {booking.leadReferrer && (
            <div className="text-xs text-gray truncate">
              Referrer:{" "}
              <a
                href={booking.leadReferrer}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {new URL(booking.leadReferrer).hostname}
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-gray italic">
          No UTM / referrer captured, probably direct or pre-UTM booking.
        </div>
      )}

      {booking.leadSourceOverride && !editing && (
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold bg-pink/20 text-black">
            Manual: {booking.leadSourceOverride}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] text-gray hover:text-black underline"
          >
            edit
          </button>
        </div>
      )}

      {editing ? (
        <div className="flex gap-2 items-center mt-1">
          <input
            type="text"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder="e.g. Walk-in, Empfehlung durch Max, Makler XY"
            className="flex-1 px-2 py-1 text-xs border border-lightgray rounded-[5px]"
          />
          <button
            onClick={saveOverride}
            disabled={saving}
            className="px-2 py-1 text-xs bg-black text-white rounded-[5px] disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-[10px] text-gray hover:text-black underline"
          >
            cancel
          </button>
        </div>
      ) : (
        !booking.leadSourceOverride && (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] text-gray hover:text-black underline mt-1"
          >
            + Add manual source (walk-in / empfehlung / etc.)
          </button>
        )
      )}
    </div>
  );
}

/* ─── Reassign-room modal ──────────────────────────────── */

function ReassignRoomModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [candidates, setCandidates] = useState<
    {
      id: string;
      roomNumber: string;
      apartment: string;
      monthlyRent: number;
      current: boolean;
    }[]
  >([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [adjustRent, setAdjustRent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/bookings/${booking.id}/room`)
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates ?? []))
      .finally(() => setLoading(false));
  }, [booking.id]);

  const selectedRoom = candidates.find((c) => c.id === selectedId);
  const currentRoom = candidates.find((c) => c.current);
  const rentWillChange =
    selectedRoom &&
    currentRoom &&
    selectedRoom.monthlyRent !== currentRoom.monthlyRent;

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/room`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRoomId: selectedId, adjustRent }),
      });
      if (res.ok) onSuccess();
      else {
        const data = await res.json().catch(() => ({}));
        toast.error("Reassign failed", { description: data.error ?? "Unknown" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] w-full max-w-lg p-5 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-bold">Reassign room</h3>
          <button onClick={onClose} className="text-gray hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray">
          Pick a replacement room. Only rooms in the same category + location
          that are free on the move-in date are listed.
        </p>

        {loading ? (
          <div className="border border-lightgray rounded-[5px] p-3">
            <SkeletonText lines={4} widths={["w-5/6", "w-4/6", "w-3/4", "w-2/3"]} />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-gray italic">
            No alternative rooms available for this category + date.
          </p>
        ) : (
          <div className="border border-lightgray rounded-[5px] max-h-64 overflow-y-auto divide-y divide-lightgray/50">
            {candidates.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-background-alt ${
                  selectedId === r.id ? "bg-pink/10" : ""
                } ${r.current ? "opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="room"
                  checked={selectedId === r.id}
                  disabled={r.current}
                  onChange={() => setSelectedId(r.id)}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    #{r.roomNumber}{" "}
                    {r.current && (
                      <span className="text-[10px] text-gray ml-1">(current)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray">
                    {r.apartment} · €{(r.monthlyRent / 100).toFixed(0)}/mo
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {rentWillChange && (
          <label className="flex items-center gap-2 text-sm bg-orange-50 border border-orange-200 rounded-[5px] p-2">
            <input
              type="checkbox"
              checked={adjustRent}
              onChange={(e) => setAdjustRent(e.target.checked)}
            />
            <span>
              Rent differs: current €
              {((currentRoom?.monthlyRent ?? 0) / 100).toFixed(0)} → new €
              {((selectedRoom?.monthlyRent ?? 0) / 100).toFixed(0)}.
              Adjust booking rent to match new room?
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !selectedId}
            className="px-3 py-2 text-sm bg-black text-white rounded-[5px] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Reassign"}
          </button>
        </div>
      </div>
    </div>
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
  // (React Compiler memoises this automatically, no useMemo needed).
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
  onClick,
  active,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "ok" | "warn" | "danger";
  onClick?: () => void;
  active?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-orange-600"
        : tone === "ok"
          ? "text-green-600"
          : "text-black";
  const clickable = typeof onClick === "function";
  const baseCls = `bg-white rounded-[5px] border p-4 text-left transition-colors ${
    active
      ? "border-black ring-1 ring-black"
      : clickable
        ? "border-lightgray hover:border-black cursor-pointer"
        : "border-lightgray"
  }`;
  const Inner = (
    <>
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray mt-1">{sub}</p>}
    </>
  );
  return clickable ? (
    <button onClick={onClick} className={baseCls}>
      {Inner}
    </button>
  ) : (
    <div className={baseCls}>{Inner}</div>
  );
}
