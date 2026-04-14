"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ExternalLink } from "lucide-react";

type RentPay = { id: string; amount: number; paidAmount: number; month: string };
type ExtraCharge = { id: string; description: string; amount: number };
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
  depositAmount: number | null;
  depositStatus: string;
  damagesAmount: number;
  arrearsAmount: number;
  depositRefundAmount: number | null;
  depositRefundIban: string | null;
  depositReturnedAt: string | null;
  room: {
    roomNumber: string;
    apartment: { location: { name: string } };
  };
  rentPayments: RentPay[];
  extraCharges: ExtraCharge[];
  defects: Defect[];
};

const DEPOSIT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  RECEIVED: "bg-green-100 text-green-800",
  RETURNED: "bg-blue-100 text-blue-800",
  RETAINED: "bg-red-100 text-red-800",
};

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
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

function computeBreakdown(t: Tenant) {
  const deposit = t.depositAmount ?? 0;
  const defects = t.defects.reduce((s, d) => s + d.deductionAmount, 0);
  const openRent = t.rentPayments.reduce(
    (s, r) => s + (r.amount - r.paidAmount),
    0
  );
  const openExtras = t.extraCharges.reduce((s, c) => s + c.amount, 0);
  const settlement = deposit - defects - openRent - openExtras;
  return { deposit, defects, openRent, openExtras, settlement };
}

export default function DepositsPage({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "all" | "returned">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [ibanInputs, setIbanInputs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let rows = tenants;
    if (filter === "pending") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      rows = tenants.filter(
        (t) =>
          t.depositStatus === "RECEIVED" &&
          t.moveOut &&
          new Date(t.moveOut) < today
      );
    } else if (filter === "returned") {
      rows = tenants.filter((t) => t.depositStatus === "RETURNED");
    }
    // Pending settlements first, then by days since moveOut desc
    return [...rows].sort((a, b) => {
      const da = daysSince(a.moveOut) ?? -1;
      const db = daysSince(b.moveOut) ?? -1;
      return db - da;
    });
  }, [tenants, filter]);

  const stats = {
    held: tenants.filter((t) => t.depositStatus === "RECEIVED").length,
    pendingSettlement: tenants.filter(
      (t) =>
        t.depositStatus === "RECEIVED" &&
        t.moveOut &&
        new Date(t.moveOut) < new Date()
    ).length,
    returned: tenants.filter((t) => t.depositStatus === "RETURNED").length,
    totalHeld: tenants
      .filter((t) => t.depositStatus === "RECEIVED")
      .reduce((s, t) => s + (t.depositAmount ?? 0), 0),
  };

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
      else alert(body.error ?? "Action failed");
      return { ok: res.ok, body };
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-black">Deposits</h1>
        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 text-sm ${filter === "pending" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Pending settlement ({stats.pendingSettlement})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm ${filter === "all" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("returned")}
            className={`px-3 py-1.5 text-sm ${filter === "returned" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Returned
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Held" value={String(stats.held)} />
        <Stat
          label="Pending settlement"
          value={String(stats.pendingSettlement)}
          tone={stats.pendingSettlement > 0 ? "warn" : "ok"}
        />
        <Stat label="Returned" value={String(stats.returned)} />
        <Stat label="Total held" value={`€${Math.round(stats.totalHeld / 100).toLocaleString("de-DE")}`} />
      </div>

      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lightgray bg-background-alt">
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Tenant</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Move-out</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Deposit</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Defects</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Open rent</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Settlement</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray">
                    No tenants in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const breakdown = computeBreakdown(t);
                  const days = daysSince(t.moveOut);
                  const ageClass =
                    days !== null && days > 30
                      ? "text-red-600 font-semibold"
                      : days !== null && days > 14
                        ? "text-orange-600 font-medium"
                        : "text-gray";
                  return (
                    <Fragment key={t.id}>
                      <tr
                        onClick={() => {
                          setExpandedId(expandedId === t.id ? null : t.id);
                          setIbanInputs((prev) => ({
                            ...prev,
                            [t.id]: t.depositRefundIban ?? "",
                          }));
                        }}
                        className={`border-b border-lightgray/50 hover:bg-background-alt cursor-pointer transition-colors ${
                          t.moveOut && t.depositStatus === "RECEIVED" && new Date(t.moveOut) < new Date() ? "bg-yellow-50/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/tenants/${t.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium hover:underline"
                          >
                            {t.firstName} {t.lastName}
                          </Link>
                          <div className="text-xs text-gray">{t.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {t.room.apartment.location.name} · #{t.room.roomNumber}
                        </td>
                        <td className={`px-4 py-3 text-xs ${ageClass}`}>
                          {fmtDate(t.moveOut)}
                          {days !== null && days >= 0 && (
                            <span className="block">{days}d ago</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {fmtEur(breakdown.deposit)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600">
                          {breakdown.defects > 0 ? `-${fmtEur(breakdown.defects)}` : "—"}
                          {t.defects.length > 0 && (
                            <span className="block text-[10px] text-gray">
                              {t.defects.length} item{t.defects.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600">
                          {breakdown.openRent + breakdown.openExtras > 0
                            ? `-${fmtEur(breakdown.openRent + breakdown.openExtras)}`
                            : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${breakdown.settlement >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {fmtEur(breakdown.settlement)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${DEPOSIT_STATUS_COLORS[t.depositStatus] || ""}`}
                          >
                            {t.depositStatus}
                          </span>
                        </td>
                      </tr>

                      {expandedId === t.id && (
                        <tr className="bg-background-alt">
                          <td colSpan={8} className="px-4 py-4">
                            <SettlementPanel
                              tenant={t}
                              breakdown={breakdown}
                              ibanInput={ibanInputs[t.id] ?? ""}
                              setIbanInput={(v) =>
                                setIbanInputs((prev) => ({ ...prev, [t.id]: v }))
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
    </div>
  );
}

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
    !isReturned && Boolean(tenant.depositRefundIban) && tenant.depositRefundAmount !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Breakdown */}
      <div>
        <div className="text-xs text-gray uppercase tracking-wide mb-2">
          Settlement breakdown
        </div>
        <div className="space-y-1 text-sm">
          <BreakdownRow label="Deposit" value={fmtEur(breakdown.deposit)} />
          <BreakdownRow label="Defects" value={`-${fmtEur(breakdown.defects)}`} tone={breakdown.defects > 0 ? "danger" : undefined} />
          <BreakdownRow label="Open rent" value={`-${fmtEur(breakdown.openRent)}`} tone={breakdown.openRent > 0 ? "danger" : undefined} />
          <BreakdownRow label="Open extras" value={`-${fmtEur(breakdown.openExtras)}`} tone={breakdown.openExtras > 0 ? "danger" : undefined} />
          <div className="border-t border-lightgray pt-1 mt-1 flex items-center justify-between font-bold">
            <span>Settlement</span>
            <span className={breakdown.settlement >= 0 ? "text-green-700" : "text-red-700"}>
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
              <li key={d.id} className="flex justify-between gap-2 border-b border-lightgray/50 py-1">
                <span className="truncate">{d.description}</span>
                <span className="tabular-nums text-red-600">
                  -{fmtEur(d.deductionAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {(tenant.rentPayments.length > 0 || tenant.extraCharges.length > 0) && (
          <>
            <div className="text-xs text-gray uppercase tracking-wide mb-2">
              Open items
            </div>
            <ul className="text-sm space-y-1">
              {tenant.rentPayments.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 text-xs">
                  <span>Rent {new Date(r.month).toLocaleDateString("de-DE", { month: "short", year: "numeric" })}</span>
                  <span className="tabular-nums text-red-600">
                    -{fmtEur(r.amount - r.paidAmount)}
                  </span>
                </li>
              ))}
              {tenant.extraCharges.map((c) => (
                <li key={c.id} className="flex justify-between gap-2 text-xs">
                  <span>{c.description}</span>
                  <span className="tabular-nums text-red-600">-{fmtEur(c.amount)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
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
            if (!confirm(`Send settlement email to ${tenant.email}?\n\nIncludes the breakdown and refund amount of ${fmtEur(breakdown.settlement)}.`)) return;
            await apiCall(tenant.id, "send_settlement");
          }}
          disabled={updating || !canSendSettlement}
          className="w-full mb-2 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-white disabled:opacity-50"
          title={!canSendSettlement ? "Set IBAN first" : "Send settlement email to tenant"}
        >
          <Mail className="w-3 h-3" /> Send settlement email
        </button>

        <button
          onClick={async () => {
            if (!confirm(`Mark deposit as transferred to ${ibanInput || "tenant"}?\n\nThis sets depositStatus = RETURNED and records today's date.`)) return;
            await apiCall(tenant.id, "mark_transferred");
          }}
          disabled={updating || !canMarkTransferred}
          className="w-full px-3 py-1.5 rounded-[5px] text-xs font-medium bg-black text-white hover:bg-black/90 disabled:opacity-50"
        >
          Mark as transferred
        </button>

        {tenant.depositReturnedAt && (
          <p className="mt-2 text-xs text-green-600 font-medium">
            Transferred {fmtDate(tenant.depositReturnedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray">{label}</span>
      <span
        className={`tabular-nums ${tone === "danger" ? "text-red-600" : "text-black"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "ok" ? "text-green-600" : tone === "warn" ? "text-orange-600" : "text-black";
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-4">
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}
