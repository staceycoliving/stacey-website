"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Home,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Search,
  Table as TableIcon,
  X,
} from "lucide-react";
import WithdrawModal from "./WithdrawModal";

type Location = {
  id: string;
  slug: string;
  name: string;
  address: string;
};

type RentPaymentSummary = {
  id: string;
  status: string;
  amount: number;
  paidAmount: number;
  month: string;
  reminder1SentAt?: string | null;
  mahnung1SentAt?: string | null;
  mahnung2SentAt?: string | null;
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  monthlyRent: number;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
  stripeCustomerId: string | null;
  sepaMandateId: string | null;
  depositStatus: string;
  depositAmount: number | null;
  room: {
    id: string;
    roomNumber: string;
    category: string;
    buildingAddress: string | null;
    floorDescription: string | null;
    apartment: {
      id: string;
      number: number | null;
      address: string | null;
      houseNumber: string;
      floor: string;
      label: string | null;
      location: Location;
    };
  };
  rentPayments: RentPaymentSummary[];
  paidRentsCents: number;
  notesCount: number;
  roomTransfers: {
    id: string;
    transferDate: string;
    toRoom: { roomNumber: string } | null;
  }[];
  booking: {
    id: string;
    depositPaidAt: string | null;
    bookingFeePaidAt: string | null;
  } | null;
};

type SortColumn =
  | "location"
  | "address"
  | "zusatz"
  | "apartment"
  | "suite"
  | "category"
  | "price"
  | "name"
  | "email"
  | "moveIn"
  | "moveOut";

type SortDirection = "asc" | "desc";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function fmtPrice(cents: number) {
  return `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 0 })}`;
}

/** Builds just street + specific house number for the Address column.
 *  Source fields:
 *  - location.address often looks like "Fischerinsel 13-15, 10179 Berlin"
 *    (range + zip/city). We want the street name only.
 *  - apartment.houseNumber is a Stacey-internal apartment identifier
 *    like "F13", "D3a" — the letter is a building prefix, the rest is
 *    the actual house number we want to combine with the street.
 *  room.buildingAddress beats both when an admin set an explicit override.
 *  Zip + city are dropped here — they belong in the folio, not the list. */
function buildFullAddress(t: Tenant): string {
  if (t.room.buildingAddress) return t.room.buildingAddress;
  const full = t.room.apartment.location.address.trim();
  // Strip anything after the first comma → removes zip + city
  const firstSegment = full.split(",")[0].trim();
  // Drop a trailing number / range so we can replace it with the
  // specific apartment's house number.
  const streetOnly = firstSegment
    .replace(/\s+\d+[a-zA-Z]?([-/]\d+[a-zA-Z]?)?\s*$/, "")
    .trim();
  const num = extractHouseNumber(t.room.apartment.houseNumber);
  if (!num) return streetOnly || firstSegment;
  return `${streetOnly} ${num}`;
}

/** Given a Stacey apartment identifier like "F13" or "D3a", return the
 *  actual house number portion ("13" / "3a"). If the input is already
 *  purely numeric, pass it through. */
function extractHouseNumber(id: string | null | undefined): string {
  if (!id) return "";
  const m = id.match(/\d+[a-zA-Z]?$/);
  return m ? m[0] : id;
}

/** Floor column — now seeded directly from the CSV "Zusatz" column into
 *  apartment.floor (e.g. "EG rechts", "VH 1.OG"). No heuristics needed. */
function floorLabel(t: Tenant): string {
  return t.room.floorDescription ?? t.room.apartment.floor ?? "";
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function paymentStatus(t: Tenant): {
  label: string;
  tone: "ok" | "warn" | "danger" | "neutral";
} {
  const hasFailed = t.rentPayments.some((p) => p.status === "FAILED");
  if (hasFailed) return { label: "Overdue", tone: "danger" };
  if (!t.sepaMandateId) return { label: "No payment", tone: "warn" };
  const hasOpen = t.rentPayments.some(
    (p) => p.status === "PENDING" || p.status === "PROCESSING" || p.status === "PARTIAL"
  );
  if (hasOpen) return { label: "Pending", tone: "neutral" };
  return { label: "OK", tone: "ok" };
}

function withdrawAvailable(t: Tenant): boolean {
  // Always show the action when there's a linked booking with a paid deposit —
  // expired window is handled by an extra warning step in the modal.
  return Boolean(t.booking?.depositPaidAt);
}

/** Collect every issue this tenant currently has. Used by the compact
 *  multi-issue pill in the list + by the KPI counters up top. */
type TenantIssue = {
  code: "overdue" | "no_payment" | "dunning_due" | "widerruf_active";
  label: string;
  tone: "warn" | "danger" | "info";
};
function detectIssues(t: Tenant, nowTs: number): TenantIssue[] {
  const out: TenantIssue[] = [];
  const ONE_DAY = 86_400_000;

  if (t.rentPayments.some((p) => p.status === "FAILED")) {
    out.push({ code: "overdue", label: "Overdue rent", tone: "danger" });
  }
  if (!t.sepaMandateId) {
    out.push({ code: "no_payment", label: "No payment method", tone: "warn" });
  }
  // Dunning due = reminder/mahnung should have been sent but wasn't yet
  const dunningDue = t.rentPayments.some((p) => {
    if (p.status === "PAID") return false;
    const monthTs = new Date(p.month).getTime();
    const daysOpen = Math.floor((nowTs - monthTs) / ONE_DAY);
    if (daysOpen >= 30 && !p.mahnung2SentAt) return true;
    if (daysOpen >= 14 && !p.mahnung1SentAt) return true;
    if (daysOpen >= 3 && !p.reminder1SentAt) return true;
    return false;
  });
  if (dunningDue) {
    out.push({ code: "dunning_due", label: "Dunning step due", tone: "warn" });
  }
  if (t.booking?.depositPaidAt) {
    const daysSince = Math.floor(
      (nowTs - new Date(t.booking.depositPaidAt).getTime()) / ONE_DAY
    );
    if (daysSince >= 0 && daysSince <= 14) {
      const left = 14 - daysSince;
      out.push({
        code: "widerruf_active",
        label: `Widerruf window (${left}d left)`,
        tone: "info",
      });
    }
  }
  return out;
}

type RecentlyChanged = {
  tenantId: string;
  at: string;
  summary: string;
};

export default function TenantsPage({
  tenants,
  locations,
  recentlyChanged,
}: {
  tenants: Tenant[];
  locations: Location[];
  recentlyChanged: RecentlyChanged[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filter/sort state from URL so it's shareable + survives reload
  const view =
    (searchParams.get("view") as "table" | "calendar") ?? "table";
  const filterLocation = searchParams.get("location") ?? "";
  const filterStatus =
    (searchParams.get("status") as
      | "all"
      | "active"
      | "leaving"
      | "issues"
      | "past") ?? "all";
  const search = searchParams.get("q") ?? "";
  const sortCol = (searchParams.get("sortBy") as SortColumn) ?? "name";
  const sortDir = (searchParams.get("sortDir") as SortDirection) ?? "asc";
  const moveInFrom = searchParams.get("moveInFrom") ?? "";
  const moveInTo = searchParams.get("moveInTo") ?? "";
  const moveOutFrom = searchParams.get("moveOutFrom") ?? "";
  const moveOutTo = searchParams.get("moveOutTo") ?? "";

  // Per-column filters — local state (kept out of URL for simplicity,
  // the global filters above cover the persistent use case).
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  function setColFilter(col: string, value: string) {
    setColFilters((prev) => {
      const next = { ...prev };
      if (value) next[col] = value;
      else delete next[col];
      return next;
    });
  }

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

  // Debounced search input so typing doesn't rewrite the URL on every key
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => writeParams({ q: searchInput }), 200);
    return () => clearTimeout(t);
  }, [searchInput, search, writeParams]);

  // Stable "now" for render-time issue detection (React Compiler purity)
  const [nowTs] = useState(() => Date.now());

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [emailSubmenuId, setEmailSubmenuId] = useState<string | null>(null);
  const [sendingSetupId, setSendingSetupId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { type: "terminate"; tenantId: string }
    | null
  >(null);
  const [withdrawTenantId, setWithdrawTenantId] = useState<string | null>(null);
  const [extraChargeTenantId, setExtraChargeTenantId] = useState<string | null>(
    null
  );
  const [detailId, setDetailId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenuId]);

  // Per-tenant issue list — recomputed once per render from nowTs
  const issuesByTenant = useMemo(() => {
    const map = new Map<string, TenantIssue[]>();
    for (const t of tenants) map.set(t.id, detectIssues(t, nowTs));
    return map;
  }, [tenants, nowTs]);

  const filtered = useMemo(() => {
    const moveInFromTs = moveInFrom ? new Date(moveInFrom).getTime() : null;
    const moveInToTs = moveInTo
      ? new Date(moveInTo).getTime() + 86_400_000 - 1
      : null;
    const moveOutFromTs = moveOutFrom ? new Date(moveOutFrom).getTime() : null;
    const moveOutToTs = moveOutTo
      ? new Date(moveOutTo).getTime() + 86_400_000 - 1
      : null;
    let rows = tenants.filter((t) => {
      if (filterLocation && t.room.apartment.location.id !== filterLocation) return false;
      const isReturned = t.depositStatus === "RETURNED";
      // Default "all" hides fully settled tenants (deposit returned).
      // Use "past" to see them.
      if (filterStatus === "all" && isReturned) return false;
      if (filterStatus === "active" && (t.moveOut || isReturned)) return false;
      if (filterStatus === "leaving" && (!t.moveOut || isReturned)) return false;
      if (filterStatus === "past" && !isReturned) return false;
      if (filterStatus === "issues") {
        if (isReturned) return false;
        const issues = issuesByTenant.get(t.id) ?? [];
        if (!issues.some((i) => i.tone !== "info")) return false;
      }
      if (moveInFromTs !== null && new Date(t.moveIn).getTime() < moveInFromTs) return false;
      if (moveInToTs !== null && new Date(t.moveIn).getTime() > moveInToTs) return false;
      if (moveOutFromTs !== null) {
        if (!t.moveOut) return false;
        if (new Date(t.moveOut).getTime() < moveOutFromTs) return false;
      }
      if (moveOutToTs !== null) {
        if (!t.moveOut) return false;
        if (new Date(t.moveOut).getTime() > moveOutToTs) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const match =
          t.firstName.toLowerCase().includes(q) ||
          t.lastName.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.room.roomNumber.toLowerCase().includes(q) ||
          t.room.apartment.houseNumber.toLowerCase().includes(q) ||
          (t.room.apartment.label ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      // Per-column text filters
      for (const [col, val] of Object.entries(colFilters)) {
        if (!val) continue;
        const v = val.toLowerCase();
        switch (col) {
          case "location":
            if (!t.room.apartment.location.name.toLowerCase().includes(v)) return false;
            break;
          case "address":
            if (!(t.room.apartment.address ?? buildFullAddress(t)).toLowerCase().includes(v)) return false;
            break;
          case "zusatz":
            if (!floorLabel(t).toLowerCase().includes(v)) return false;
            break;
          case "apartment":
            if (String(t.room.apartment.number ?? "").includes(v) === false) return false;
            break;
          case "suite":
            if (!t.room.roomNumber.toLowerCase().includes(v)) return false;
            break;
          case "category":
            if (!t.room.category.toLowerCase().includes(v) && !formatCategory(t.room.category).toLowerCase().includes(v)) return false;
            break;
          case "name":
            if (!`${t.firstName} ${t.lastName}`.toLowerCase().includes(v)) return false;
            break;
        }
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const get = (t: Tenant): string | number => {
        switch (sortCol) {
          case "location":
            return t.room.apartment.location.name;
          case "address":
            return t.room.apartment.address ?? buildFullAddress(t);
          case "zusatz":
            return floorLabel(t);
          case "apartment":
            return t.room.apartment.number ?? 0;
          case "suite":
            return t.room.roomNumber;
          case "category":
            return t.room.category;
          case "price":
            return t.monthlyRent;
          case "name":
            return `${t.lastName} ${t.firstName}`.toLowerCase();
          case "email":
            return t.email.toLowerCase();
          case "moveIn":
            return t.moveIn;
          case "moveOut":
            return t.moveOut ?? "9999-12-31";
          default:
            return "";
        }
      };
      const av = get(a);
      const bv = get(b);
      if (av === bv) return 0;
      return av < bv ? -dir : dir;
    });

    return rows;
  }, [
    tenants,
    issuesByTenant,
    filterLocation,
    filterStatus,
    search,
    moveInFrom,
    moveInTo,
    moveOutFrom,
    moveOutTo,
    sortCol,
    sortDir,
    colFilters,
  ]);

  const counts = useMemo(() => {
    const ONE_DAY = 86_400_000;
    const in30 = nowTs + 30 * ONE_DAY;
    // KPIs only count current tenants (not deposit-returned)
    const current = tenants.filter((t) => t.depositStatus !== "RETURNED");
    const active = current.filter((t) => !t.moveOut).length;
    const leaving = current.filter((t) => {
      if (!t.moveOut) return false;
      const ts = new Date(t.moveOut).getTime();
      return ts >= nowTs && ts <= in30;
    }).length;
    const overdue = current.filter((t) =>
      t.rentPayments.some((p) => p.status === "FAILED")
    ).length;
    const noPayment = current.filter((t) => !t.sepaMandateId && !t.moveOut).length;
    const widerrufActive = current.filter((t) => {
      if (!t.booking?.depositPaidAt) return false;
      const d = Math.floor(
        (nowTs - new Date(t.booking.depositPaidAt).getTime()) / ONE_DAY
      );
      return d >= 0 && d <= 14;
    }).length;
    const upcomingMoveIns = current.filter((t) => {
      const ts = new Date(t.moveIn).getTime();
      return ts >= nowTs && ts <= in30;
    }).length;
    const past = tenants.filter((t) => t.depositStatus === "RETURNED").length;
    return {
      active,
      leaving,
      overdue,
      noPayment,
      widerrufActive,
      upcomingMoveIns,
      past,
    };
  }, [tenants, nowTs]);

  function toggleSort(col: SortColumn) {
    writeParams({
      sortBy: col,
      sortDir: sortCol === col && sortDir === "asc" ? "desc" : "asc",
    });
  }

  async function sendSetupLink(tenantId: string) {
    setSendingSetupId(tenantId);
    try {
      const res = await fetch("/api/admin/tenants/sepa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        alert("Payment setup link sent to tenant.");
      } else {
        const data = await res.json();
        alert(`Failed: ${data.details || data.error}`);
      }
    } catch (err) {
      console.error("Send setup link failed:", err);
      alert("Failed to send setup link");
    }
    setSendingSetupId(null);
    setOpenMenuId(null);
  }

  async function resendEmail(tenantId: string, templateKey: string) {
    if (!confirm(`${templateKey} an diesen Mieter senden?`)) return;
    setWorking(true);
    try {
      const res = await fetch("/api/admin/emails/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, templateKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`✓ Gesendet an ${data.sentTo}`);
      } else {
        alert(`Fehler: ${data.error ?? res.statusText}`);
      }
    } finally {
      setWorking(false);
      setOpenMenuId(null);
      setEmailSubmenuId(null);
    }
  }

  /** Bulk-send the same template to every tenant in `filtered` that
   *  matches `eligible`. Serial calls, simple toast at the end. */
  async function bulkSend(
    label: string,
    templateKey: string,
    eligible: (t: Tenant) => boolean
  ) {
    const targets = filtered.filter(eligible);
    if (targets.length === 0) {
      alert("Niemand passt gerade zu diesem Filter.");
      return;
    }
    if (
      !confirm(
        `${label} an ${targets.length} Mieter senden?\nKann einige Minuten dauern.`
      )
    )
      return;
    setBulkBusy(templateKey);
    let sent = 0;
    let failed = 0;
    for (const t of targets) {
      try {
        const res = await fetch("/api/admin/emails/resend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: t.id, templateKey }),
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setBulkBusy(null);
    alert(`${label}: ${sent} gesendet, ${failed} fehlgeschlagen.`);
    router.refresh();
  }

  async function terminateTenant(tenantId: string) {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/tenants/terminate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) router.refresh();
      else alert("Termination failed");
    } finally {
      setWorking(false);
      setConfirmAction(null);
    }
  }

  return (
    <div>
      {/* KPIs — 6 action-focused cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <KpiCard
          label="Active"
          value={counts.active}
          tone="ok"
          sub="Currently housed"
        />
        <KpiCard
          label="Leaving · next 30d"
          value={counts.leaving}
          tone={counts.leaving > 0 ? "warn" : undefined}
          sub="Move-out scheduled"
          onClick={() =>
            writeParams({
              status: "leaving",
              moveOutFrom: new Date(nowTs)
                .toISOString()
                .slice(0, 10),
              moveOutTo: new Date(nowTs + 30 * 86_400_000)
                .toISOString()
                .slice(0, 10),
            })
          }
        />
        <KpiCard
          label="Move-ins · next 30d"
          value={counts.upcomingMoveIns}
          tone={counts.upcomingMoveIns > 0 ? "info" : undefined}
          sub="Prepare welcome / keys"
          onClick={() =>
            writeParams({
              moveInFrom: new Date(nowTs).toISOString().slice(0, 10),
              moveInTo: new Date(nowTs + 30 * 86_400_000)
                .toISOString()
                .slice(0, 10),
            })
          }
        />
        <KpiCard
          label="Overdue rent"
          value={counts.overdue}
          tone={counts.overdue > 0 ? "danger" : "ok"}
          sub={counts.overdue > 0 ? "Needs dunning" : "All paid"}
          onClick={() => writeParams({ status: "issues" })}
        />
        <KpiCard
          label="No payment method"
          value={counts.noPayment}
          tone={counts.noPayment > 0 ? "warn" : "ok"}
          sub="Active tenants only"
          onClick={() => writeParams({ status: "issues" })}
        />
        <KpiCard
          label="Widerruf active"
          value={counts.widerrufActive}
          tone={counts.widerrufActive > 0 ? "info" : undefined}
          sub="Within 14d of deposit"
        />
      </div>

      {/* Filters row 1 — search + selects + date ranges */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, address, room…"
              className="w-full pl-8 pr-8 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray hover:text-black"
                aria-label="Clear"
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
          <select
            value={filterStatus}
            onChange={(e) => writeParams({ status: e.target.value })}
            className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="all">Current tenants</option>
            <option value="active">Active (no end date)</option>
            <option value="leaving">Leaving (end date set)</option>
            <option value="issues">With issues</option>
            <option value="past">Past (deposit returned)</option>
          </select>

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

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray">Move-in</span>
          <input
            type="date"
            value={moveInFrom}
            onChange={(e) => writeParams({ moveInFrom: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] bg-white"
          />
          <span className="text-gray">→</span>
          <input
            type="date"
            value={moveInTo}
            onChange={(e) => writeParams({ moveInTo: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] bg-white"
          />
          <span className="text-gray ml-2">Move-out</span>
          <input
            type="date"
            value={moveOutFrom}
            onChange={(e) => writeParams({ moveOutFrom: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] bg-white"
          />
          <span className="text-gray">→</span>
          <input
            type="date"
            value={moveOutTo}
            onChange={(e) => writeParams({ moveOutTo: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] bg-white"
          />
          {(search ||
            filterLocation ||
            filterStatus !== "all" ||
            moveInFrom ||
            moveInTo ||
            moveOutFrom ||
            moveOutTo) && (
            <button
              onClick={() =>
                writeParams({
                  q: null,
                  location: null,
                  status: null,
                  moveInFrom: null,
                  moveInTo: null,
                  moveOutFrom: null,
                  moveOutTo: null,
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

        {/* Bulk action bar — only appears when the current filter yields
            candidates where the action actually makes sense. */}
        {(() => {
          const overdue = filtered.filter((t) =>
            t.rentPayments.some((p) => p.status === "FAILED")
          );
          const upcomingMoveIn = filtered.filter((t) => {
            const ts = new Date(t.moveIn).getTime();
            return ts >= nowTs && ts <= nowTs + 7 * 86_400_000;
          });
          const noPay = filtered.filter(
            (t) => !t.sepaMandateId && !t.moveOut
          );
          if (
            overdue.length === 0 &&
            upcomingMoveIn.length === 0 &&
            noPay.length === 0
          ) {
            return null;
          }
          return (
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-lightgray/50">
              <span className="text-gray uppercase tracking-wide">
                Bulk actions:
              </span>
              {overdue.length > 0 && (
                <button
                  onClick={() =>
                    bulkSend("Mahnung 1", "mahnung1", (t) =>
                      t.rentPayments.some((p) => p.status === "FAILED")
                    )
                  }
                  disabled={bulkBusy !== null}
                  className="px-2 py-1 rounded-[5px] border border-lightgray bg-white hover:border-black disabled:opacity-40"
                >
                  {bulkBusy === "mahnung1"
                    ? "Sending…"
                    : `Send Mahnung 1 to ${overdue.length} overdue`}
                </button>
              )}
              {upcomingMoveIn.length > 0 && (
                <button
                  onClick={() =>
                    bulkSend("Welcome", "welcome", (t) => {
                      const ts = new Date(t.moveIn).getTime();
                      return ts >= nowTs && ts <= nowTs + 7 * 86_400_000;
                    })
                  }
                  disabled={bulkBusy !== null}
                  className="px-2 py-1 rounded-[5px] border border-lightgray bg-white hover:border-black disabled:opacity-40"
                >
                  {bulkBusy === "welcome"
                    ? "Sending…"
                    : `Send Welcome to ${upcomingMoveIn.length} moving in ≤7d`}
                </button>
              )}
              {noPay.length > 0 && (
                <button
                  onClick={() =>
                    bulkSend("Payment setup link", "payment_setup", (t) =>
                      Boolean(!t.sepaMandateId && !t.moveOut)
                    )
                  }
                  disabled={bulkBusy !== null}
                  className="px-2 py-1 rounded-[5px] border border-lightgray bg-white hover:border-black disabled:opacity-40"
                >
                  {bulkBusy === "payment_setup"
                    ? "Sending…"
                    : `Send Payment setup to ${noPay.length} missing`}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Recently changed — sits above the view so admins notice activity */}
      {recentlyChanged.length > 0 && (
        <div className="bg-white rounded-[5px] border border-lightgray p-3 mb-4">
          <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Recently changed · last 7 days
          </div>
          <div className="flex flex-wrap gap-2">
            {recentlyChanged.map((r) => {
              const t = tenants.find((x) => x.id === r.tenantId);
              if (!t) return null;
              return (
                <button
                  key={r.tenantId}
                  type="button"
                  onClick={() => setDetailId(r.tenantId)}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-[5px] border border-lightgray text-xs hover:border-black"
                  title={r.summary}
                >
                  <span className="font-medium">
                    {t.firstName} {t.lastName}
                  </span>
                  <span className="text-gray">·</span>
                  <span className="text-gray">{formatRelative(r.at, nowTs)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar view — ticks for move-ins (green) + move-outs (orange) */}
      {view === "calendar" && (
        <TenantsCalendarView
          tenants={filtered}
          onOpen={(t) => setDetailId(t.id)}
        />
      )}

      {/* Table view (default) */}
      {view === "table" && (
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[24%]" />  {/* Name + email */}
              <col className="w-[10%]" />  {/* Location */}
              <col className="w-[7%]" />   {/* Suite */}
              <col className="w-[12%]" />  {/* Category */}
              <col className="w-[8%]" />   {/* Price */}
              <col className="w-[12%]" />  {/* Since */}
              <col className="w-[10%]" />  {/* End */}
              <col className="w-[7%]" />   {/* Actions */}
            </colgroup>
            <thead>
              <tr className="border-b border-lightgray bg-background-alt text-[11px]">
                <SortableTh label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Location" col="location" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Suite" col="suite" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Category" col="category" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Price" col="price" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Start" col="moveIn" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="End" col="moveOut" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-2 py-2 text-gray uppercase tracking-wide text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray text-sm">
                    No tenants found
                  </td>
                </tr>
              ) : (
                filtered.map((t, idx) => {
                  const issues = issuesByTenant.get(t.id) ?? [];
                  const zebra = idx % 2 === 1 ? "bg-background-alt/40" : "";
                  const movedOut = t.moveOut && new Date(t.moveOut).getTime() < nowTs;
                  const initials = `${t.firstName.charAt(0)}${t.lastName.charAt(0)}`.toUpperCase();
                  const sinceMonths = Math.floor(
                    (nowTs - new Date(t.moveIn).getTime()) / (30.44 * 86_400_000)
                  );
                  const sinceLabel =
                    sinceMonths < 1
                      ? "< 1 month"
                      : sinceMonths === 1
                        ? "1 month"
                        : `${sinceMonths} months`;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/admin/tenants/${t.id}`)}
                      className={`border-b border-lightgray/30 hover:bg-blue-50/40 cursor-pointer transition-colors text-sm ${zebra} ${movedOut ? "opacity-50" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-[11px] font-bold flex-shrink-0"
                            title={`${t.firstName} ${t.lastName}`}
                          >
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {t.firstName} {t.lastName}
                              {t.notesCount > 0 && (
                                <span className="ml-1 text-[10px] text-gray" title={`${t.notesCount} notes`}>💬{t.notesCount}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray truncate">{t.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 truncate">{t.room.apartment.location.name}</td>
                      <td className="px-3 py-2">
                        {t.room.roomNumber}
                        {t.roomTransfers[0] && (
                          <span
                            className="ml-1 text-[10px] px-1 py-0.5 rounded-[5px] bg-orange-100 text-orange-700 font-semibold"
                            title={`Transfer to #${t.roomTransfers[0].toRoom?.roomNumber ?? "?"} on ${formatDate(t.roomTransfers[0].transferDate)}`}
                          >
                            → {t.roomTransfers[0].toRoom?.roomNumber ?? "?"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 truncate">{formatCategory(t.room.category)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPrice(t.monthlyRent)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatDate(t.moveIn)}</td>
                      <td className="px-3 py-2">
                        <span className={t.moveOut ? "text-orange-600 font-medium tabular-nums" : "text-gray"}>
                          {t.moveOut ? formatDate(t.moveOut) : "open-end"}
                        </span>
                      </td>
                      <td
                        className="px-2 py-2 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <IssuesPill issues={issues} />
                          <button
                            onClick={() =>
                              setOpenMenuId(openMenuId === t.id ? null : t.id)
                            }
                            className="p-1.5 rounded-[5px] hover:bg-background-alt"
                            aria-label="Open actions menu"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        {openMenuId === t.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-4 top-10 z-20 bg-white border border-lightgray rounded-[5px] shadow-md w-60 py-1"
                          >
                            <MenuItem onClick={() => router.push(`/admin/tenants/${t.id}`)}>
                              Open folio
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                setExtraChargeTenantId(t.id);
                                setOpenMenuId(null);
                              }}
                            >
                              Add extra charge…
                            </MenuItem>
                            <MenuItem
                              onClick={() =>
                                setEmailSubmenuId(
                                  emailSubmenuId === t.id ? null : t.id
                                )
                              }
                            >
                              <span className="flex items-center justify-between">
                                Send email…
                                <span className="text-gray text-xs">▸</span>
                              </span>
                            </MenuItem>
                            {emailSubmenuId === t.id && (() => {
                              const openRentMonths = t.rentPayments.filter(
                                (p) => p.status === "FAILED" || p.status === "PARTIAL" || p.status === "PENDING"
                              ).length;
                              return (
                                <div className="bg-background-alt border-t border-b border-lightgray">
                                  <MenuItem onClick={() => resendEmail(t.id, "welcome")}>
                                    Welcome
                                  </MenuItem>
                                  <MenuItem onClick={() => resendEmail(t.id, "payment_setup")}>
                                    Payment setup link
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => resendEmail(t.id, "rent_reminder")}
                                    disabled={openRentMonths === 0}
                                  >
                                    Rent arrears ({openRentMonths} month{openRentMonths === 1 ? "" : "s"} open)
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      if (!confirm("Kündigung wegen Zahlungsrückstand senden? Dies ist ein manueller Vorgang und wird nicht automatisch ausgelöst.")) return;
                                      resendEmail(t.id, "mahnung2");
                                    }}
                                    disabled={openRentMonths < 2}
                                    tone="danger"
                                  >
                                    Kündigung ({openRentMonths < 2 ? "erst ab 2 Monaten Rückstand" : `${openRentMonths} Monate offen`})
                                  </MenuItem>
                                </div>
                              );
                            })()}
                            {!t.notice && (
                              <MenuItem
                                onClick={() =>
                                  setConfirmAction({ type: "terminate", tenantId: t.id })
                                }
                              >
                                Terminate (3-month notice)
                              </MenuItem>
                            )}
                            {withdrawAvailable(t) && (
                              <MenuItem
                                onClick={() => {
                                  setWithdrawTenantId(t.id);
                                  setOpenMenuId(null);
                                }}
                                tone="warn"
                              >
                                Widerruf (14-day cancellation)
                              </MenuItem>
                            )}
                          </div>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Detail sidepanel — quick peek without leaving the list */}
      {detailId && (() => {
        const t = tenants.find((x) => x.id === detailId);
        if (!t) return null;
        return (
          <TenantDetailPanel
            tenant={t}
            issues={issuesByTenant.get(t.id) ?? []}
            nowTs={nowTs}
            onClose={() => setDetailId(null)}
          />
        );
      })()}

      {/* Confirm modal — terminate / remove only */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          working={working}
          onConfirm={() => {
            if (confirmAction.type === "terminate")
              return terminateTenant(confirmAction.tenantId);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Quick extra-charge modal (open without going to folio) */}
      {extraChargeTenantId &&
        (() => {
          const t = tenants.find((x) => x.id === extraChargeTenantId);
          if (!t) return null;
          return (
            <QuickExtraChargeModal
              tenantId={t.id}
              tenantName={`${t.firstName} ${t.lastName}`}
              onClose={() => setExtraChargeTenantId(null)}
              onSuccess={() => {
                setExtraChargeTenantId(null);
                router.refresh();
              }}
            />
          );
        })()}

      {/* Widerruf modal */}
      {withdrawTenantId &&
        (() => {
          const t = tenants.find((x) => x.id === withdrawTenantId);
          if (!t) return null;
          return (
            <WithdrawModal
              tenantId={t.id}
              tenantName={`${t.firstName} ${t.lastName}`}
              depositPaidAt={t.booking?.depositPaidAt ?? null}
              moveIn={t.moveIn}
              monthlyRent={t.monthlyRent}
              depositAmount={t.depositAmount ?? t.monthlyRent * 2}
              paidRentsCents={t.paidRentsCents}
              onClose={() => setWithdrawTenantId(null)}
              onSuccess={() => router.refresh()}
            />
          );
        })()}
    </div>
  );
}

function SortableTh({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  col: SortColumn;
  sortCol: SortColumn;
  sortDir: SortDirection;
  onSort: (c: SortColumn) => void;
  align?: "left" | "right";
}) {
  const active = sortCol === col;
  return (
    <th
      className={`px-3 py-2 font-semibold text-gray uppercase tracking-wide cursor-pointer select-none hover:text-black whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active &&
          (sortDir === "asc" ? (
            <ChevronUp className="w-2.5 h-2.5" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5" />
          ))}
      </span>
    </th>
  );
}

/** Compact health indicator.
 *  0 → green dot, 1 → coloured dot with label on hover,
 *  2+ → red dot with count, hover lists all. */
function IssuesPill({ issues }: { issues: TenantIssue[] }) {
  if (issues.length === 0) {
    return (
      <span
        className="inline-block w-2.5 h-2.5 rounded-full bg-green-500"
        title="OK — no issues"
      />
    );
  }
  const worst = issues.some((i) => i.tone === "danger")
    ? "bg-red-500"
    : issues.some((i) => i.tone === "warn")
      ? "bg-orange-400"
      : "bg-blue-400";
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${worst}`}
      title={issues.map((i) => i.label).join("\n")}
    >
      {issues.length > 1 ? issues.length : "!"}
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "ok" | "warn" | "danger" | "info";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-orange-600"
        : tone === "ok"
          ? "text-green-600"
          : tone === "info"
            ? "text-blue-600"
            : "text-black";
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`bg-white rounded-[5px] border border-lightgray p-3 text-left w-full transition-colors ${clickable ? "hover:border-black cursor-pointer" : "cursor-default"}`}
    >
      <p className="text-[11px] text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${toneClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray mt-0.5">{sub}</p>}
    </button>
  );
}

/** Compact add-extra-charge modal reachable from the list row action
 *  menu, so the admin doesn't have to navigate into the folio just to
 *  record a €50 Schlüsselersatz. POSTs the same shape as the folio
 *  modal (type/chargeOn included). */
/** Relative-time label like "3h ago", "2d ago" for the recently-changed chips. */
function formatRelative(iso: string, nowTs: number): string {
  const ms = nowTs - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Month calendar showing move-ins (green) and move-outs (orange) for
 *  every tenant in the filtered set. Click a pill opens the detail
 *  sidepanel. Move-ins and move-outs can overlap on the same day. */
function TenantsCalendarView({
  tenants,
  onOpen,
}: {
  tenants: Tenant[];
  onOpen: (t: Tenant) => void;
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
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  type DayEntry =
    | { kind: "in"; tenant: Tenant }
    | { kind: "out"; tenant: Tenant };
  const byDay = new Map<number, DayEntry[]>();
  for (const t of tenants) {
    const mi = new Date(t.moveIn);
    if (mi.getFullYear() === year && mi.getMonth() === month) {
      const arr = byDay.get(mi.getDate()) ?? [];
      arr.push({ kind: "in", tenant: t });
      byDay.set(mi.getDate(), arr);
    }
    if (t.moveOut) {
      const mo = new Date(t.moveOut);
      if (mo.getFullYear() === year && mo.getMonth() === month) {
        const arr = byDay.get(mo.getDate()) ?? [];
        arr.push({ kind: "out", tenant: t });
        byDay.set(mo.getDate(), arr);
      }
    }
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-[10px] text-gray">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Move-in
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> Move-out
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs ml-2">
            <button
              onClick={() => setAnchor(new Date(year, month - 1, 1))}
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
              onClick={() => setAnchor(new Date(year, month + 1, 1))}
              className="px-2 py-1 border border-lightgray rounded-[5px] hover:bg-white"
            >
              Next ›
            </button>
          </div>
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
            className="border-r border-b border-lightgray/40 bg-background-alt/30 min-h-[110px]"
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
              className={`border-r border-b border-lightgray/40 p-1.5 min-h-[110px] align-top ${isToday ? "bg-pink-50" : ""}`}
            >
              <div className="text-[11px] text-gray tabular-nums mb-1">
                {day}
              </div>
              <div className="space-y-1">
                {items.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => onOpen(entry.tenant)}
                    className={`w-full text-left px-1.5 py-0.5 rounded-[5px] text-[11px] truncate ${
                      entry.kind === "in"
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    }`}
                    title={`${entry.kind === "in" ? "Move-in" : "Move-out"}: ${entry.tenant.firstName} ${entry.tenant.lastName}`}
                  >
                    {entry.kind === "in" ? "↓" : "↑"} {entry.tenant.firstName}{" "}
                    {entry.tenant.lastName}
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

/** Right-hand detail panel showing contact, health summary, notes preview,
 *  and a shortcut into the folio. Closes via X / Esc / backdrop click. */
function TenantDetailPanel({
  tenant,
  issues,
  nowTs,
  onClose,
}: {
  tenant: Tenant;
  issues: TenantIssue[];
  nowTs: number;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openRent = tenant.rentPayments
    .filter((p) => p.status !== "PAID")
    .reduce((s, p) => s + Math.max(0, p.amount - p.paidAmount), 0);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden
      />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-lightgray px-5 py-3 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <div className="text-xs text-gray">
              {tenant.room.apartment.location.name} · #{tenant.room.roomNumber}
            </div>
            <h2 className="text-lg font-bold text-black truncate">
              {tenant.firstName} {tenant.lastName}
            </h2>
            <div className="mt-1">
              <IssuesPill issues={issues} />
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

        <div className="px-5 py-4 space-y-5">
          <Link
            href={`/admin/tenants/${tenant.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-[5px] border border-lightgray hover:border-black"
          >
            Open full folio <ArrowRight className="w-3 h-3" />
          </Link>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1.5">
              Contact
            </div>
            <div className="text-sm space-y-0.5">
              <div>
                <a href={`mailto:${tenant.email}`} className="hover:underline">
                  {tenant.email}
                </a>
              </div>
              {tenant.phone && (
                <div>
                  <a href={`tel:${tenant.phone}`} className="hover:underline">
                    {tenant.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1.5">
              Stay
            </div>
            <div className="text-sm space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Home className="w-3 h-3 text-gray" />
                {tenant.room.apartment.location.name} · Suite #
                {tenant.room.roomNumber} · {formatCategory(tenant.room.category)}
              </div>
              <div>Rent: €{(tenant.monthlyRent / 100).toFixed(0)}/mo</div>
              <div>Move-in: {formatDate(tenant.moveIn)}</div>
              {tenant.moveOut && (
                <div className="flex items-center gap-1.5 text-orange-700">
                  <LogOut className="w-3 h-3" />
                  Leaving: {formatDate(tenant.moveOut)}
                </div>
              )}
            </div>
          </div>

          {(openRent > 0 || !tenant.sepaMandateId) && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1.5">
                Finance
              </div>
              <div className="text-sm space-y-0.5">
                {openRent > 0 && (
                  <div className="text-red-700">
                    Open rent: €{(openRent / 100).toFixed(2)}
                  </div>
                )}
                {!tenant.sepaMandateId && (
                  <div className="text-orange-700">No payment method set</div>
                )}
                <div className="text-gray">
                  Paid rents total: €{(tenant.paidRentsCents / 100).toFixed(0)}
                </div>
              </div>
            </div>
          )}

          {tenant.notesCount > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1.5">
                Notes
              </div>
              <Link
                href={`/admin/tenants/${tenant.id}`}
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                <MessageSquare className="w-3 h-3" />
                {tenant.notesCount} note{tenant.notesCount === 1 ? "" : "s"} —
                view in folio
              </Link>
            </div>
          )}

          <div className="text-[10px] text-gray font-mono pt-2 border-t border-lightgray">
            {tenant.id}
          </div>
          <div className="text-[10px] text-gray">
            {/* keep nowTs in context for the health pill */}
            Live as of {formatRelative(new Date(nowTs).toISOString(), nowTs)}
          </div>
        </div>
      </div>
    </>
  );
}

function QuickExtraChargeModal({
  tenantId,
  tenantName,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"CHARGE" | "DISCOUNT">("CHARGE");
  const [chargeOn, setChargeOn] = useState<"NEXT_RENT" | "DEPOSIT_SETTLEMENT">(
    "NEXT_RENT"
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents <= 0) {
      alert("Beschreibung und positiver Betrag nötig.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/tenants/${tenantId}/extra-charges`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, amount: cents, type, chargeOn }),
        }
      );
      if (res.ok) onSuccess();
      else {
        const data = await res.json().catch(() => ({}));
        alert(`Fehler: ${data.error ?? "save failed"}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const isDiscount = type === "DISCOUNT";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-black">Add adjustment</h3>
            <p className="text-xs text-gray mt-0.5">For {tenantName}</p>
          </div>
          <button onClick={onClose} className="text-gray hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <div className="block text-xs text-gray mb-1">Type</div>
          <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden">
            <button
              type="button"
              onClick={() => setType("CHARGE")}
              className={`px-3 py-1.5 text-sm ${type === "CHARGE" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            >
              Charge (Mieter schuldet)
            </button>
            <button
              type="button"
              onClick={() => setType("DISCOUNT")}
              className={`px-3 py-1.5 text-sm ${type === "DISCOUNT" ? "bg-green-700 text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            >
              Discount
            </button>
          </div>
        </div>

        <label className="block">
          <span className="block text-xs text-gray mb-1">
            {isDiscount ? "Grund" : "Description"}
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isDiscount ? "z.B. Heizungsausfall 3 Tage" : "z.B. Schlüsselersatz"
            }
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-xs text-gray mb-1">Amount (€)</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50.00"
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>

        <div>
          <div className="block text-xs text-gray mb-1">When</div>
          <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden">
            <button
              type="button"
              onClick={() => setChargeOn("NEXT_RENT")}
              className={`px-3 py-1.5 text-sm ${chargeOn === "NEXT_RENT" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            >
              Mit nächster Miete
            </button>
            <button
              type="button"
              onClick={() => setChargeOn("DEPOSIT_SETTLEMENT")}
              className={`px-3 py-1.5 text-sm ${chargeOn === "DEPOSIT_SETTLEMENT" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            >
              Erst bei Auszug
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
          >
            {saving ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Per-column filter cell — always a dropdown with all distinct values
 *  from that column. No freetext inputs. */
function FilterTh({
  col,
  value,
  onChange,
  options,
}: {
  col: string;
  value: string;
  onChange: (col: string, val: string) => void;
  options: string[];
}) {
  return (
    <td className="px-2 py-1">
      <select
        value={value}
        onChange={(e) => onChange(col, e.target.value)}
        className="w-full px-1.5 py-1 border border-lightgray rounded-[5px] text-[11px] bg-white"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </td>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger" | "warn";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 hover:bg-red-50"
      : tone === "warn"
        ? "text-orange-600 hover:bg-orange-50"
        : "text-black hover:bg-background-alt";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-sm ${toneClass} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function ConfirmModal({
  working,
  onConfirm,
  onCancel,
}: {
  action: { type: "terminate"; tenantId: string };
  working: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const title = "Terminate tenant?";
  const body =
    "This sets notice today and moveOut 3 months from today (end of month).";
  const cta = "Terminate";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full">
        <h3 className="font-bold text-black">{title}</h3>
        <p className="text-sm text-gray mt-2">{body}</p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm()}
            disabled={working}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
          >
            {working ? "..." : cta}
          </button>
        </div>
      </div>
    </div>
  );
}
