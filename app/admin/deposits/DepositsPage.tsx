"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  ExternalLink,
  Search,
  AlertOctagon,
  RefreshCw,
  Send,
  CheckSquare,
  X,
  Wallet,
} from "lucide-react";
import { toast, Breadcrumbs, EmptyState } from "@/components/admin/ui";

/* ─── Deadline constant ─────────────────────────────────── */

/** Our internal + communicated deadline for refunding a deposit after moveOut. */
const RETURN_DEADLINE_WEEKS = 6;
const RETURN_DEADLINE_DAYS = RETURN_DEADLINE_WEEKS * 7;

/* ─── Types ─────────────────────────────────────────────── */

type RentPay = {
  id: string;
  amount: number;
  paidAmount: number;
  month: string;
  status: string;
};
type ExtraCharge = {
  id: string;
  description: string;
  amount: number;
  type: "CHARGE" | "DISCOUNT";
};
type Defect = {
  id: string;
  description: string;
  deductionAmount: number;
  createdAt: string;
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  moveOut: string | null;
  createdAt: string;
  depositAmount: number | null;
  depositStatus: string;
  damagesAmount: number;
  arrearsAmount: number;
  depositRefundAmount: number | null;
  depositRefundIban: string | null;
  depositReturnedAt: string | null;
  room: {
    roomNumber: string;
    apartment: { location: { id: string; name: string; slug: string } };
  };
  rentPayments: RentPay[];
  extraCharges: ExtraCharge[];
  defects: Defect[];
};

type LocationOpt = { id: string; name: string; slug: string };

const DEPOSIT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  RECEIVED: "bg-green-100 text-green-800",
  RETURNED: "bg-blue-100 text-blue-800",
  RETAINED: "bg-red-100 text-red-800",
};

/* ─── Formatters ─────────────────────────────────────────── */

function fmtEur(cents: number) {
  return `€${(cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d: string | null) {
  if (!d) return ",";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Deadline view-model for a tenant's deposit-return status. */
function deadlineStatus(
  moveOut: string | null,
  depositStatus: string
): {
  daysLeft: number | null; // null when moveOut missing
  status: "returned" | "on_track" | "urgent" | "overdue" | "no_moveout";
  label: string;
  tone: "ok" | "urgent" | "overdue" | "neutral";
} {
  if (depositStatus === "RETURNED") {
    return {
      daysLeft: null,
      status: "returned",
      label: "Returned",
      tone: "ok",
    };
  }
  if (!moveOut) {
    return {
      daysLeft: null,
      status: "no_moveout",
      label: "No moveOut set",
      tone: "neutral",
    };
  }
  const days = daysSince(moveOut) ?? 0;
  const daysLeft = RETURN_DEADLINE_DAYS - days;
  if (daysLeft < 0) {
    return {
      daysLeft,
      status: "overdue",
      label: `OVERDUE · ${-daysLeft}d`,
      tone: "overdue",
    };
  }
  if (daysLeft <= 14) {
    return {
      daysLeft,
      status: "urgent",
      label: `${daysLeft}d left`,
      tone: "urgent",
    };
  }
  return {
    daysLeft,
    status: "on_track",
    label: `${daysLeft}d left`,
    tone: "ok",
  };
}

function computeBreakdown(t: Tenant) {
  const deposit = t.depositAmount ?? 0;
  const defects = t.defects.reduce((s, d) => s + d.deductionAmount, 0);
  const openRent = t.rentPayments
    .filter((r) => r.status !== "PAID")
    .reduce((s, r) => s + Math.max(0, r.amount - r.paidAmount), 0);
  const overpayment = t.rentPayments
    .filter((r) => r.status === "PAID")
    .reduce((s, r) => s + Math.max(0, r.paidAmount - r.amount), 0);
  const openCharges = t.extraCharges
    .filter((c) => c.type === "CHARGE")
    .reduce((s, c) => s + c.amount, 0);
  const openDiscounts = t.extraCharges
    .filter((c) => c.type === "DISCOUNT")
    .reduce((s, c) => s + c.amount, 0);
  const settlement =
    deposit + overpayment + openDiscounts - defects - openRent - openCharges;
  return {
    deposit,
    defects,
    openRent,
    openCharges,
    openDiscounts,
    overpayment,
    settlement,
  };
}

type FilterKey =
  | "overdue"
  | "pending"
  | "retained"
  | "returned"
  | "all";

/* ─── Main ──────────────────────────────────────────────── */

export default function DepositsPage({
  tenants,
  locations,
}: {
  tenants: Tenant[];
  locations: LocationOpt[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [locFilter, setLocFilter] = useState<string>(""); // location.slug
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [ibanInputs, setIbanInputs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<null | "transfer" | "email" | "recalc">(
    null
  );

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Bucket by filter
  const filtered = useMemo(() => {
    let rows = tenants;

    switch (filter) {
      case "overdue":
        rows = tenants.filter((t) => {
          if (t.depositStatus === "RETURNED") return false;
          if (!t.moveOut) return false;
          return daysSince(t.moveOut)! > RETURN_DEADLINE_DAYS;
        });
        break;
      case "pending":
        rows = tenants.filter(
          (t) =>
            t.depositStatus === "RECEIVED" &&
            t.moveOut &&
            new Date(t.moveOut) < today
        );
        break;
      case "retained":
        rows = tenants.filter((t) => t.depositStatus === "RETAINED");
        break;
      case "returned":
        rows = tenants.filter((t) => t.depositStatus === "RETURNED");
        break;
      case "all":
      default:
        rows = tenants;
    }

    // Location filter
    if (locFilter) {
      rows = rows.filter((t) => t.room.apartment.location.slug === locFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((t) => {
        const name = `${t.firstName} ${t.lastName}`.toLowerCase();
        return (
          name.includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.room.roomNumber.toLowerCase().includes(q) ||
          t.room.apartment.location.name.toLowerCase().includes(q)
        );
      });
    }

    // Sort: within pending/overdue by days-past-moveOut desc (oldest first)
    return [...rows].sort((a, b) => {
      const da = daysSince(a.moveOut) ?? -1;
      const db = daysSince(b.moveOut) ?? -1;
      return db - da;
    });
  }, [tenants, filter, locFilter, search, today]);

  /* ─── Stats (always global, not filtered) ──────────────── */
  const stats = useMemo(() => {
    const held = tenants.filter((t) => t.depositStatus === "RECEIVED");
    const pending = held.filter(
      (t) => t.moveOut && new Date(t.moveOut) < today
    );
    const overdue = pending.filter(
      (t) => daysSince(t.moveOut)! > RETURN_DEADLINE_DAYS
    );
    const returned = tenants.filter((t) => t.depositStatus === "RETURNED");
    const retained = tenants.filter((t) => t.depositStatus === "RETAINED");
    return {
      held: held.length,
      pending: pending.length,
      overdue: overdue.length,
      overdueTotal: overdue.reduce(
        (s, t) => s + (t.depositAmount ?? 0),
        0
      ),
      returned: returned.length,
      retained: retained.length,
      totalHeld: held.reduce((s, t) => s + (t.depositAmount ?? 0), 0),
    };
  }, [tenants, today]);

  /* ─── Selection helpers ────────────────────────────────── */
  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    const selectableIds = filtered
      .filter((t) => t.depositStatus !== "RETURNED")
      .map((t) => t.id);
    if (selectableIds.every((id) => selected.has(id))) {
      setSelected(
        new Set([...selected].filter((id) => !selectableIds.includes(id)))
      );
    } else {
      setSelected(new Set([...selected, ...selectableIds]));
    }
  }
  const selectedRows = tenants.filter((t) => selected.has(t.id));

  /* ─── API call helper ──────────────────────────────────── */
  async function apiCall(
    tenantId: string,
    action: string,
    extra: Record<string, unknown> = {}
  ): Promise<{ ok: boolean; body: Record<string, unknown> }> {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, action, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) router.refresh();
      else toast.error(body.error ?? "Action failed");
      return { ok: res.ok, body };
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      {/* Header + stats */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Deposits" }]} />
                    <h1 className="text-2xl font-bold text-black">Deposits</h1>
          <p className="text-sm text-gray mt-1">
            Settlement work tool · refund deadline is{" "}
            <span className="font-semibold">
              {RETURN_DEADLINE_WEEKS} weeks after move-out
            </span>
            .
          </p>
        </div>
        <Link
          href="/admin/finance?tab=deposits"
          className="text-xs text-gray hover:text-black underline inline-flex items-center gap-1"
        >
          Finance overview <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Stat label="Held" value={String(stats.held)} />
        <Stat
          label="Pending settlement"
          value={String(stats.pending)}
          tone={stats.pending > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Overdue (>6 weeks)"
          value={String(stats.overdue)}
          sub={stats.overdue > 0 ? fmtEur(stats.overdueTotal) : undefined}
          tone={stats.overdue > 0 ? "danger" : "ok"}
        />
        <Stat label="Retained" value={String(stats.retained)} />
        <Stat label="Total held" value={fmtEur(stats.totalHeld)} />
      </div>

      {/* Filter + search row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden">
          <FilterButton
            active={filter === "overdue"}
            onClick={() => setFilter("overdue")}
            count={stats.overdue}
            accent={stats.overdue > 0 ? "danger" : undefined}
          >
            Overdue
          </FilterButton>
          <FilterButton
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            count={stats.pending}
          >
            Pending
          </FilterButton>
          <FilterButton
            active={filter === "retained"}
            onClick={() => setFilter("retained")}
            count={stats.retained}
          >
            Retained
          </FilterButton>
          <FilterButton
            active={filter === "returned"}
            onClick={() => setFilter("returned")}
            count={stats.returned}
          >
            Returned
          </FilterButton>
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All
          </FilterButton>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray pointer-events-none" />
            <input
              type="text"
              placeholder="Search tenant / email / room"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-2 py-2 border border-lightgray rounded-[5px] text-sm bg-white w-56"
            />
          </div>
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="px-2 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk bar */}
      {selectedRows.length > 0 && (
        <div className="mb-3 bg-black text-white rounded-[5px] px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm">
            <span className="font-semibold">{selectedRows.length} selected</span>{" "}
            · Total held:{" "}
            {fmtEur(
              selectedRows.reduce((s, t) => s + (t.depositAmount ?? 0), 0)
            )}
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setBulkModal("recalc")}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-white/40 rounded-[5px] hover:bg-white/10"
            >
              <RefreshCw className="w-3 h-3" /> Recalculate
            </button>
            <button
              onClick={() => setBulkModal("email")}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-white/40 rounded-[5px] hover:bg-white/10"
            >
              <Send className="w-3 h-3" /> Send settlement email
            </button>
            <button
              onClick={() => setBulkModal("transfer")}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white text-black rounded-[5px] hover:bg-white/90"
            >
              <CheckSquare className="w-3 h-3" /> Mark transferred…
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1 text-xs border border-white/40 rounded-[5px] hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lightgray bg-background-alt">
                <th className="px-2 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered
                        .filter((t) => t.depositStatus !== "RETURNED")
                        .every((t) => selected.has(t.id))
                    }
                    onChange={toggleSelectAll}
                    title="Select all non-returned in view"
                  />
                </th>
                <th className="text-left px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Tenant
                </th>
                <th className="text-left px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Location
                </th>
                <th className="text-left px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Move-out
                </th>
                <th className="text-left px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Deadline
                </th>
                <th className="text-right px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Deposit
                </th>
                <th className="text-right px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Defects
                </th>
                <th className="text-right px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Open rent
                </th>
                <th className="text-right px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Settlement
                </th>
                <th className="text-left px-3 py-3 font-semibold text-xs text-gray uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-0 py-0">
                    <EmptyState
                      icon={<Wallet className="w-5 h-5" />}
                      title="No tenants in this view"
                      description="Try switching to another status tab."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const breakdown = computeBreakdown(t);
                  const deadline = deadlineStatus(t.moveOut, t.depositStatus);
                  const daysOut = daysSince(t.moveOut);
                  const isExpanded = expandedId === t.id;
                  const isSelectable = t.depositStatus !== "RETURNED";
                  const isSelected = selected.has(t.id);

                  const rowTone =
                    deadline.tone === "overdue"
                      ? "bg-red-50"
                      : deadline.tone === "urgent"
                        ? "bg-yellow-50"
                        : "";

                  return (
                    <Fragment key={t.id}>
                      <tr
                        className={`border-b border-lightgray/50 hover:bg-background-alt transition-colors ${rowTone} ${
                          isSelected ? "bg-pink/5" : ""
                        }`}
                      >
                        <td className="px-2 py-3">
                          {isSelectable && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelected(t.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </td>
                        <td
                          className="px-3 py-3 cursor-pointer"
                          onClick={() => {
                            setExpandedId(isExpanded ? null : t.id);
                            setIbanInputs((prev) => ({
                              ...prev,
                              [t.id]: t.depositRefundIban ?? "",
                            }));
                          }}
                        >
                          <Link
                            href={`/admin/tenants/${t.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium hover:underline"
                          >
                            {t.firstName} {t.lastName}
                          </Link>
                          <div className="text-xs text-gray">{t.email}</div>
                        </td>
                        <td
                          className="px-3 py-3 cursor-pointer"
                          onClick={() => {
                            setExpandedId(isExpanded ? null : t.id);
                            setIbanInputs((prev) => ({
                              ...prev,
                              [t.id]: t.depositRefundIban ?? "",
                            }));
                          }}
                        >
                          {t.room.apartment.location.name} · #{t.room.roomNumber}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {fmtDate(t.moveOut)}
                          {daysOut !== null && daysOut >= 0 && (
                            <div className="text-gray">{daysOut}d ago</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <DeadlineBadge status={deadline} />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {fmtEur(breakdown.deposit)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-red-600">
                          {breakdown.defects > 0
                            ? `−${fmtEur(breakdown.defects)}`
                            : ","}
                          {t.defects.length > 0 && (
                            <span className="block text-[10px] text-gray">
                              {t.defects.length} item
                              {t.defects.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-red-600">
                          {breakdown.openRent + breakdown.openCharges > 0
                            ? `−${fmtEur(breakdown.openRent + breakdown.openCharges)}`
                            : ","}
                        </td>
                        <td
                          className={`px-3 py-3 text-right tabular-nums font-semibold ${
                            breakdown.settlement >= 0
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {fmtEur(breakdown.settlement)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${DEPOSIT_STATUS_COLORS[t.depositStatus] || ""}`}
                          >
                            {t.depositStatus}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-background-alt">
                          <td colSpan={10} className="px-4 py-4">
                            <SettlementPanel
                              tenant={t}
                              breakdown={breakdown}
                              ibanInput={ibanInputs[t.id] ?? ""}
                              setIbanInput={(v) =>
                                setIbanInputs((prev) => ({
                                  ...prev,
                                  [t.id]: v,
                                }))
                              }
                              updating={updating}
                              apiCall={apiCall}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk modals */}
      {bulkModal && (
        <BulkActionModal
          mode={bulkModal}
          rows={selectedRows}
          onClose={() => setBulkModal(null)}
          onSuccess={() => {
            setBulkModal(null);
            setSelected(new Set());
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Bulk action modal ─────────────────────────────────── */

function BulkActionModal({
  mode,
  rows,
  onClose,
  onSuccess,
}: {
  mode: "transfer" | "email" | "recalc";
  rows: Tenant[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [transferredAt, setTransferredAt] = useState(today);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const rowsForMode = rows.filter((t) => {
    if (mode === "transfer")
      return (
        t.depositStatus !== "RETURNED" &&
        Boolean(t.depositRefundIban) &&
        t.depositRefundAmount !== null
      );
    if (mode === "email")
      return t.depositStatus !== "RETURNED" && Boolean(t.depositRefundIban);
    // recalc works for any non-returned
    return t.depositStatus !== "RETURNED";
  });

  const title =
    mode === "transfer"
      ? "Mark deposits as transferred"
      : mode === "email"
        ? "Send settlement emails"
        : "Recalculate refunds";

  const cta =
    mode === "transfer"
      ? `Mark ${rowsForMode.length} as transferred`
      : mode === "email"
        ? `Send ${rowsForMode.length} emails`
        : `Recalculate ${rowsForMode.length}`;

  const skipped = rows.length - rowsForMode.length;

  async function run() {
    setRunning(true);
    setProgress(0);
    setErrors([]);
    const errs: string[] = [];
    for (let i = 0; i < rowsForMode.length; i++) {
      const t = rowsForMode[i];
      try {
        const res = await fetch("/api/admin/deposits", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: t.id,
            action:
              mode === "transfer"
                ? "mark_transferred"
                : mode === "email"
                  ? "send_settlement"
                  : "calculate_refund",
            ...(mode === "transfer" ? { transferredAt } : {}),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          errs.push(
            `${t.firstName} ${t.lastName}: ${body.error ?? res.statusText}`
          );
        }
      } catch (err) {
        errs.push(
          `${t.firstName} ${t.lastName}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      setProgress(i + 1);
    }
    setErrors(errs);
    if (errs.length === 0) {
      onSuccess();
    } else {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-lightgray flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            disabled={running}
            className="p-1 hover:bg-background-alt rounded-[5px] disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1 space-y-3">
          {mode === "transfer" && (
            <label className="block max-w-xs">
              <span className="block text-xs text-gray mb-1">
                Transfer date (value date on bank)
              </span>
              <input
                type="date"
                value={transferredAt}
                onChange={(e) => setTransferredAt(e.target.value)}
                disabled={running}
                className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white disabled:opacity-50"
              />
            </label>
          )}

          {mode === "email" && (
            <p className="text-xs text-gray">
              This sends the settlement email including the breakdown + refund
              amount + IBAN. Make sure the refund amount is up-to-date
              (recalculate first if in doubt).
            </p>
          )}

          {mode === "recalc" && (
            <p className="text-xs text-gray">
              Recomputes deposit + overpayment − defects − open rent − open
              extras for each selected tenant and updates the stored refund
              amount. Safe to run anytime.
            </p>
          )}

          {skipped > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-[5px] p-3 text-xs text-yellow-900">
              <strong>{skipped}</strong> row{skipped === 1 ? " was" : "s were"}{" "}
              filtered out (
              {mode === "email" || mode === "transfer"
                ? "missing IBAN or already returned"
                : "already returned"}
              ). They won't be processed.
            </div>
          )}

          <div className="border border-lightgray rounded-[5px] overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-background-alt sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Tenant</th>
                  <th className="px-3 py-2 text-right">Refund</th>
                  <th className="px-3 py-2 text-left">IBAN</th>
                </tr>
              </thead>
              <tbody>
                {rowsForMode.map((t) => (
                  <tr key={t.id} className="border-t border-lightgray/50">
                    <td className="px-3 py-1.5">
                      {t.firstName} {t.lastName}
                      <div className="text-[10px] text-gray">
                        {t.room.apartment.location.name} · #{t.room.roomNumber}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {t.depositRefundAmount !== null
                        ? fmtEur(t.depositRefundAmount)
                        : "(not calculated)"}
                    </td>
                    <td className="px-3 py-1.5 text-gray font-mono text-[10px]">
                      {t.depositRefundIban
                        ? `${t.depositRefundIban.slice(0, 8)}…`
                        : ","}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {running && (
            <div className="text-xs text-gray">
              Processing… {progress} / {rowsForMode.length}
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-[5px] p-3 text-xs text-red-900 max-h-40 overflow-y-auto">
              <div className="font-semibold mb-1">
                {errors.length} error{errors.length === 1 ? "" : "s"}:
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-lightgray flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={running}
            className="px-4 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt disabled:opacity-50"
          >
            {errors.length > 0 ? "Close" : "Cancel"}
          </button>
          {errors.length === 0 && (
            <button
              onClick={run}
              disabled={running || rowsForMode.length === 0}
              className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
            >
              {running ? `Processing ${progress}/${rowsForMode.length}…` : cta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Settlement panel (expanded row) ───────────────────── */

function SettlementPanel({
  tenant,
  breakdown,
  ibanInput,
  setIbanInput,
  updating,
  apiCall,
}: {
  tenant: Tenant;
  breakdown: ReturnType<typeof computeBreakdown>;
  ibanInput: string;
  setIbanInput: (v: string) => void;
  updating: boolean;
  apiCall: (
    id: string,
    action: string,
    extra?: Record<string, unknown>
  ) => Promise<{ ok: boolean; body: Record<string, unknown> }>;
}) {
  const isReturned = tenant.depositStatus === "RETURNED";
  const canSendSettlement =
    !isReturned && Boolean(ibanInput?.trim()) && breakdown.settlement >= 0;
  const canMarkTransferred =
    !isReturned &&
    Boolean(tenant.depositRefundIban) &&
    tenant.depositRefundAmount !== null;
  const [transferredAt, setTransferredAt] = useState(
    new Date().toISOString().slice(0, 10)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Breakdown */}
      <div>
        <div className="text-xs text-gray uppercase tracking-wide mb-2">
          Settlement breakdown
        </div>
        <div className="space-y-1 text-sm">
          <BreakdownRow label="Deposit" value={fmtEur(breakdown.deposit)} />
          {breakdown.overpayment > 0 && (
            <BreakdownRow
              label="Rent credit"
              value={`+${fmtEur(breakdown.overpayment)}`}
              tone="credit"
            />
          )}
          {breakdown.openDiscounts > 0 && (
            <BreakdownRow
              label="Discounts"
              value={`+${fmtEur(breakdown.openDiscounts)}`}
              tone="credit"
            />
          )}
          <BreakdownRow
            label="Defects"
            value={`−${fmtEur(breakdown.defects)}`}
            tone={breakdown.defects > 0 ? "danger" : undefined}
          />
          <BreakdownRow
            label="Open rent"
            value={`−${fmtEur(breakdown.openRent)}`}
            tone={breakdown.openRent > 0 ? "danger" : undefined}
          />
          <BreakdownRow
            label="Open charges"
            value={`−${fmtEur(breakdown.openCharges)}`}
            tone={breakdown.openCharges > 0 ? "danger" : undefined}
          />
          <div className="border-t border-lightgray pt-1 mt-1 flex items-center justify-between font-bold">
            <span>Settlement</span>
            <span
              className={
                breakdown.settlement >= 0 ? "text-green-700" : "text-red-700"
              }
            >
              {fmtEur(breakdown.settlement)}
            </span>
          </div>
        </div>
        <Link
          href={`/admin/tenants/${tenant.id}`}
          className="inline-flex items-center gap-1 text-xs text-gray hover:text-black mt-2"
        >
          Manage defects in folio <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Defects + open items */}
      <div>
        <div className="text-xs text-gray uppercase tracking-wide mb-2">
          Defects ({tenant.defects.length})
        </div>
        {tenant.defects.length === 0 ? (
          <p className="text-xs text-gray">None logged.</p>
        ) : (
          <ul className="text-sm space-y-1 mb-3">
            {tenant.defects.map((d) => (
              <li
                key={d.id}
                className="flex justify-between gap-2 border-b border-lightgray/50 py-1"
              >
                <span className="truncate">{d.description}</span>
                <span className="tabular-nums text-red-600">
                  −{fmtEur(d.deductionAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {(() => {
          const openRents = tenant.rentPayments.filter(
            (r) => r.status !== "PAID" && r.amount - r.paidAmount > 0
          );
          const overpaidRents = tenant.rentPayments.filter(
            (r) => r.status === "PAID" && r.paidAmount > r.amount
          );
          if (
            openRents.length === 0 &&
            tenant.extraCharges.length === 0 &&
            overpaidRents.length === 0
          ) {
            return null;
          }
          return (
            <>
              <div className="text-xs text-gray uppercase tracking-wide mb-2">
                Open items
              </div>
              <ul className="text-sm space-y-1">
                {openRents.map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between gap-2 text-xs"
                  >
                    <span>
                      Rent{" "}
                      {new Date(r.month).toLocaleDateString("de-DE", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="tabular-nums text-red-600">
                      −{fmtEur(r.amount - r.paidAmount)}
                    </span>
                  </li>
                ))}
                {tenant.extraCharges.map((c) => {
                  const isDiscount = c.type === "DISCOUNT";
                  return (
                    <li
                      key={c.id}
                      className="flex justify-between gap-2 text-xs"
                    >
                      <span>
                        {isDiscount ? "Discount: " : ""}
                        {c.description}
                      </span>
                      <span
                        className={`tabular-nums ${isDiscount ? "text-green-700" : "text-red-600"}`}
                      >
                        {isDiscount ? "+" : "−"}
                        {fmtEur(c.amount)}
                      </span>
                    </li>
                  );
                })}
                {overpaidRents.map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between gap-2 text-xs"
                  >
                    <span>
                      Rent{" "}
                      {new Date(r.month).toLocaleDateString("de-DE", {
                        month: "short",
                        year: "numeric",
                      })}{" "}
                     , credit
                    </span>
                    <span className="tabular-nums text-green-700">
                      +{fmtEur(r.paidAmount - r.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          );
        })()}
      </div>

      {/* Actions */}
      <div>
        <div className="text-xs text-gray uppercase tracking-wide mb-2">
          IBAN for transfer
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={ibanInput}
            onChange={(e) => setIbanInput(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-lightgray rounded-[5px] text-sm"
            placeholder="DE89 …"
            disabled={isReturned}
          />
          <button
            onClick={() => apiCall(tenant.id, "set_iban", { iban: ibanInput })}
            disabled={updating || isReturned}
            className="px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-white disabled:opacity-50"
          >
            Save
          </button>
        </div>

        <button
          onClick={async () => {
            await apiCall(tenant.id, "calculate_refund");
          }}
          disabled={updating || isReturned}
          className="w-full mb-2 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-white disabled:opacity-50"
        >
          Recalculate refund
        </button>

        <button
          onClick={async () => {
            if (
              !confirm(
                `Send settlement email to ${tenant.email}?\n\nIncludes the breakdown and refund amount of ${fmtEur(breakdown.settlement)}.`
              )
            )
              return;
            await apiCall(tenant.id, "send_settlement");
          }}
          disabled={updating || !canSendSettlement}
          className="w-full mb-2 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-white disabled:opacity-50"
          title={!canSendSettlement ? "Set IBAN first" : "Send settlement email"}
        >
          <Mail className="w-3 h-3" /> Send settlement email
        </button>

        <div className="flex gap-2 mb-2">
          <input
            type="date"
            value={transferredAt}
            onChange={(e) => setTransferredAt(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-lightgray rounded-[5px] text-xs"
            disabled={isReturned}
            title="Transfer value date"
          />
          <button
            onClick={async () => {
              if (
                !confirm(
                  `Mark deposit as transferred on ${transferredAt}?\n\nThis sets depositStatus = RETURNED.`
                )
              )
                return;
              await apiCall(tenant.id, "mark_transferred", {
                transferredAt,
              });
            }}
            disabled={updating || !canMarkTransferred}
            className="flex-1 px-3 py-1.5 rounded-[5px] text-xs font-medium bg-black text-white hover:bg-black/90 disabled:opacity-50"
          >
            Mark transferred
          </button>
        </div>

        {tenant.depositReturnedAt && (
          <p className="mt-2 text-xs text-green-600 font-medium">
            Transferred {fmtDate(tenant.depositReturnedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Small helpers ─────────────────────────────────────── */

function FilterButton({
  active,
  onClick,
  count,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  accent?: "danger";
  children: React.ReactNode;
}) {
  const activeClass =
    accent === "danger" && active
      ? "bg-red-600 text-white"
      : active
        ? "bg-black text-white"
        : "bg-white text-gray hover:bg-background-alt";
  const countClass =
    active
      ? "bg-white/20 text-white"
      : accent === "danger"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-700";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${activeClass}`}
    >
      {accent === "danger" && !active && (
        <AlertOctagon className="w-3 h-3 text-red-600" />
      )}
      {children}
      {count !== undefined && (
        <span
          className={`px-1.5 py-0 rounded-[3px] text-[10px] font-semibold tabular-nums ${countClass}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function DeadlineBadge({
  status,
}: {
  status: ReturnType<typeof deadlineStatus>;
}) {
  if (status.status === "returned") {
    return <span className="text-gray text-xs">,</span>;
  }
  if (status.status === "no_moveout") {
    return <span className="text-gray text-xs italic">{status.label}</span>;
  }
  const cls =
    status.tone === "overdue"
      ? "bg-red-100 text-red-800 font-bold"
      : status.tone === "urgent"
        ? "bg-orange-100 text-orange-800 font-semibold"
        : "bg-green-100 text-green-800";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[11px] tabular-nums ${cls}`}
    >
      {status.label}
    </span>
  );
}

function BreakdownRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "credit";
}) {
  const colorClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "credit"
        ? "text-green-700"
        : "text-black";
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray">{label}</span>
      <span className={`tabular-nums ${colorClass}`}>{value}</span>
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
  value: string;
  sub?: string;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "ok"
      ? "text-green-600"
      : tone === "warn"
        ? "text-orange-600"
        : tone === "danger"
          ? "text-red-600"
          : "text-black";
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-3">
      <p className="text-[11px] text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${toneClass}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray mt-0.5">{sub}</p>}
    </div>
  );
}
