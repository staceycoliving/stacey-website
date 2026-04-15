"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Location = { id: string; slug: string; name: string };

type RentPayment = {
  id: string;
  month: string;
  amount: number;
  paidAmount: number;
  status: string;
  paidAt: string | null;
  reminder1SentAt: string | null;
  mahnung1SentAt: string | null;
  mahnung2SentAt: string | null;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    room: {
      roomNumber: string;
      apartment: { location: { id: string; name: string } };
    };
  };
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  depositAmount: number | null;
  depositStatus: string;
  moveIn: string;
  moveOut: string | null;
  room: {
    roomNumber: string;
    apartment: { location: { id: string; name: string } };
  };
};

type BookingWithFee = {
  id: string;
  firstName: string;
  lastName: string;
  bookingFeePaidAt: string | null;
  location: { id: string; name: string };
};

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
  PARTIAL: "bg-orange-100 text-orange-800",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "rent", label: "Rent Roll" },
  { id: "arrears", label: "Arrears" },
  { id: "deposits", label: "Deposits" },
  { id: "export", label: "Export" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function fmtEur(cents: number) {
  return `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtEurInt(cents: number) {
  return `€${Math.round(cents / 100).toLocaleString("de-DE")}`;
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { month: "short", year: "numeric" });
}

function fmtMonthLong(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FinancePage({
  data,
}: {
  data: {
    rentPayments: RentPayment[];
    tenants: Tenant[];
    bookingsWithFee: BookingWithFee[];
    locations: Location[];
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [tab, setTab] = useState<TabId>(initialTab);

  // Keep URL ?tab=… in sync (so /admin/rent redirect lands on Rent Roll)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== tab) {
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  }, [tab]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-black">Finance</h1>
        <p className="text-sm text-gray mt-1">
          Revenue, rent collection, deposits and DATEV export.
        </p>
      </div>

      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="border-b border-lightgray flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-black text-black"
                  : "border-transparent text-gray hover:text-black"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "overview" && <OverviewTab data={data} />}
          {tab === "rent" && (
            <RentRollTab rentPayments={data.rentPayments} onChanged={() => router.refresh()} />
          )}
          {tab === "arrears" && <ArrearsTab rentPayments={data.rentPayments} />}
          {tab === "deposits" && <DepositsTab tenants={data.tenants} />}
          {tab === "export" && <ExportTab locations={data.locations} />}
        </div>
      </div>
    </div>
  );
}

// ─── Overview ──────────────────────────────────────────────

function OverviewTab({
  data,
}: {
  data: {
    rentPayments: RentPayment[];
    tenants: Tenant[];
    bookingsWithFee: BookingWithFee[];
    locations: Location[];
  };
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  // KPIs
  const thisMonthExpected = data.rentPayments
    .filter((p) => p.month >= monthStart && p.month <= new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString())
    .reduce((s, p) => s + p.amount, 0);
  const thisMonthPaid = data.rentPayments
    .filter((p) => p.month >= monthStart && p.month <= new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString())
    .reduce((s, p) => s + p.paidAmount, 0);

  const ytdRent = data.rentPayments
    .filter((p) => p.paidAt && p.paidAt >= yearStart)
    .reduce((s, p) => s + p.paidAmount, 0);
  const ytdBookingFees = data.bookingsWithFee
    .filter((b) => b.bookingFeePaidAt && b.bookingFeePaidAt >= yearStart)
    .length * 19500; // €195 per booking
  const ytdTotal = ytdRent + ytdBookingFees;

  const totalOpen = data.rentPayments.reduce(
    (s, p) => s + (p.amount - p.paidAmount),
    0
  );
  const depositsHeld = data.tenants.reduce(
    (s, t) => s + (t.depositAmount ?? 0),
    0
  );

  // Monthly chart (last 12 months)
  const monthly: { month: string; expected: number; paid: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mISO = m.toISOString();
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0).toISOString();
    const monthPays = data.rentPayments.filter(
      (p) => p.month >= mISO && p.month <= mEnd
    );
    monthly.push({
      month: mISO,
      expected: monthPays.reduce((s, p) => s + p.amount, 0),
      paid: monthPays.reduce((s, p) => s + p.paidAmount, 0),
    });
  }
  const maxBar = Math.max(1, ...monthly.map((m) => Math.max(m.expected, m.paid)));

  // Per-location revenue this month
  const perLocation = data.locations.map((loc) => {
    const locPays = data.rentPayments.filter(
      (p) =>
        p.tenant.room.apartment.location.id === loc.id &&
        p.month >= monthStart
    );
    const expected = locPays.reduce((s, p) => s + p.amount, 0);
    const paid = locPays.reduce((s, p) => s + p.paidAmount, 0);
    return { name: loc.name, expected, paid, outstanding: expected - paid };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiBox label="This month paid" value={fmtEurInt(thisMonthPaid)} sub={`of ${fmtEurInt(thisMonthExpected)}`} />
        <KpiBox label="Year-to-date" value={fmtEurInt(ytdTotal)} sub={`Rent ${fmtEurInt(ytdRent)} · Fees ${fmtEurInt(ytdBookingFees)}`} />
        <KpiBox label="Outstanding" value={fmtEurInt(totalOpen)} tone={totalOpen > 0 ? "warn" : "ok"} />
        <KpiBox label="Deposits held" value={fmtEurInt(depositsHeld)} sub={`${data.tenants.length} tenants`} />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">
          Monthly rent · expected vs collected
        </h3>
        <div className="bg-background-alt rounded-[5px] p-4 border border-lightgray">
          <div className="flex items-end gap-2 h-40">
            {monthly.map((m) => {
              const expectedH = (m.expected / maxBar) * 100;
              const paidH = (m.paid / maxBar) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center">
                  <div className="flex items-end gap-0.5 h-32 w-full justify-center">
                    <div
                      className="bg-gray-300 w-3 rounded-t-[2px]"
                      style={{ height: `${expectedH}%` }}
                      title={`Expected ${fmtEur(m.expected)}`}
                    />
                    <div
                      className="bg-green-500 w-3 rounded-t-[2px]"
                      style={{ height: `${paidH}%` }}
                      title={`Paid ${fmtEur(m.paid)}`}
                    />
                  </div>
                  <div className="text-[10px] text-gray mt-1 tabular-nums">
                    {fmtMonth(m.month)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs text-gray mt-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-300 rounded-[2px]" /> Expected
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-[2px]" /> Paid
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">This month by location</h3>
        <div className="overflow-x-auto border border-lightgray rounded-[5px]">
          <table className="w-full text-sm">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Location</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Expected</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Paid</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {perLocation.map((l) => (
                <tr key={l.name} className="border-t border-lightgray/50">
                  <td className="px-3 py-2 font-medium">{l.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtEur(l.expected)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmtEur(l.paid)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${l.outstanding > 0 ? "text-red-600" : "text-gray"}`}>
                    {l.outstanding > 0 ? fmtEur(l.outstanding) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-lightgray bg-background-alt font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtEur(perLocation.reduce((s, l) => s + l.expected, 0))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-green-700">
                  {fmtEur(perLocation.reduce((s, l) => s + l.paid, 0))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-red-600">
                  {fmtEur(perLocation.reduce((s, l) => s + l.outstanding, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Rent Roll (existing logic, simplified) ────────────────

function RentRollTab({
  rentPayments,
  onChanged,
}: {
  rentPayments: RentPayment[];
  onChanged: () => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const months = [...new Set(rentPayments.map((rp) => rp.month))].sort().reverse();
  const [selectedMonth, setSelectedMonth] = useState(months[0] || "");

  const filtered = rentPayments.filter((rp) => rp.month === selectedMonth);

  async function runMonthlyRent() {
    if (!confirm(
      "Run monthly rent collection now?\n\nCreates RentPayment records for the current month and charges all tenants with a payment method."
    )) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/run-monthly-rent", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Done!\n\nMonth: ${data.month}\nTotal tenants: ${data.total}\nCreated: ${data.created}\nCharged: ${data.charged}\nSkipped: ${data.skipped}${data.errors.length > 0 ? `\n\nErrors:\n${data.errors.join("\n")}` : ""}`);
        onChanged();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to run rent collection");
    }
    setRunning(false);
  }

  async function markPaid(rentPaymentId: string) {
    setUpdating(rentPaymentId);
    try {
      await fetch("/api/admin/rent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentPaymentId, action: "mark_paid" }),
      });
      onChanged();
    } catch (err) {
      console.error("Failed:", err);
    }
    setUpdating(null);
  }

  function mahnungLabel(rp: RentPayment) {
    if (rp.mahnung2SentAt) return "2. Mahnung";
    if (rp.mahnung1SentAt) return "1. Mahnung";
    if (rp.reminder1SentAt) return "Reminded";
    return "—";
  }

  const stats = {
    expected: filtered.reduce((sum, rp) => sum + rp.amount, 0),
    received: filtered.reduce((sum, rp) => sum + rp.paidAmount, 0),
    outstanding: filtered.reduce(
      (sum, rp) => (rp.status !== "PAID" ? sum + (rp.amount - rp.paidAmount) : sum),
      0
    ),
    count: filtered.length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          {months.length === 0 && <option value="">No rent data yet</option>}
          {months.map((m) => (
            <option key={m} value={m}>{fmtMonthLong(m)}</option>
          ))}
        </select>
        <button
          onClick={runMonthlyRent}
          disabled={running}
          className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
        >
          {running ? "Running..." : "Run rent collection now"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiBox label="Tenants" value={String(stats.count)} />
        <KpiBox label="Expected" value={fmtEur(stats.expected)} />
        <KpiBox label="Received" value={fmtEur(stats.received)} tone="ok" />
        <KpiBox label="Outstanding" value={fmtEur(stats.outstanding)} tone={stats.outstanding > 0 ? "warn" : "ok"} />
      </div>

      <div className="overflow-x-auto border border-lightgray rounded-[5px]">
        <table className="w-full text-sm">
          <thead className="bg-background-alt">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Tenant</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Location</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Room</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Amount</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Paid</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Mahnung</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray">No rent payments for this month</td></tr>
            ) : (
              filtered.map((rp) => (
                <tr key={rp.id} className="border-t border-lightgray/50 hover:bg-background-alt">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/admin/tenants/${rp.tenant.id}`} className="hover:underline">
                      {rp.tenant.firstName} {rp.tenant.lastName}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{rp.tenant.room.apartment.location.name}</td>
                  <td className="px-3 py-2">#{rp.tenant.room.roomNumber}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtEur(rp.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtEur(rp.paidAmount)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${STATUS_COLORS[rp.status] || ""}`}>
                      {rp.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className={rp.mahnung2SentAt ? "text-red-600 font-medium" : rp.mahnung1SentAt ? "text-orange-600" : "text-gray"}>
                      {mahnungLabel(rp)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {rp.status !== "PAID" && (
                      <button
                        onClick={() => markPaid(rp.id)}
                        disabled={updating === rp.id}
                        className="px-2 py-0.5 rounded-[5px] text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        {updating === rp.id ? "..." : "Mark paid"}
                      </button>
                    )}
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

// ─── Arrears ───────────────────────────────────────────────

function ArrearsTab({ rentPayments }: { rentPayments: RentPayment[] }) {
  // Group all unpaid by tenant
  const unpaid = rentPayments.filter(
    (rp) => rp.status !== "PAID" && rp.amount > rp.paidAmount
  );

  type TenantArrears = {
    tenantId: string;
    tenantName: string;
    location: string;
    room: string;
    months: number;
    total: number;
  };

  const byTenant = new Map<string, TenantArrears>();
  for (const rp of unpaid) {
    const id = rp.tenant.id;
    const prev = byTenant.get(id);
    const open = rp.amount - rp.paidAmount;
    if (prev) {
      prev.months += 1;
      prev.total += open;
    } else {
      byTenant.set(id, {
        tenantId: id,
        tenantName: `${rp.tenant.firstName} ${rp.tenant.lastName}`,
        location: rp.tenant.room.apartment.location.name,
        room: rp.tenant.room.roomNumber,
        months: 1,
        total: open,
      });
    }
  }

  const rows = Array.from(byTenant.values()).sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiBox label="Tenants in arrears" value={String(rows.length)} tone={rows.length > 0 ? "warn" : "ok"} />
        <KpiBox label="Open months total" value={String(rows.reduce((s, r) => s + r.months, 0))} />
        <KpiBox label="Total outstanding" value={fmtEurInt(grandTotal)} tone={grandTotal > 0 ? "warn" : "ok"} />
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-sm text-gray py-8">No outstanding rent. ✨</div>
      ) : (
        <div className="overflow-x-auto border border-lightgray rounded-[5px]">
          <table className="w-full text-sm">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Tenant</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Location</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Room</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Months open</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tenantId} className="border-t border-lightgray/50 hover:bg-background-alt">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/admin/tenants/${r.tenantId}`} className="hover:underline">
                      {r.tenantName}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.location}</td>
                  <td className="px-3 py-2">#{r.room}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${r.months > 1 ? "text-red-600 font-medium" : ""}`}>
                    {r.months}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-600 font-medium">
                    {fmtEur(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Deposits ───────────────────────────────────────────────

function DepositsTab({ tenants }: { tenants: Tenant[] }) {
  // Group by location
  const byLocation = new Map<string, { name: string; count: number; total: number; tenants: Tenant[] }>();
  for (const t of tenants) {
    const id = t.room.apartment.location.id;
    const prev = byLocation.get(id);
    const amt = t.depositAmount ?? 0;
    if (prev) {
      prev.count += 1;
      prev.total += amt;
      prev.tenants.push(t);
    } else {
      byLocation.set(id, {
        name: t.room.apartment.location.name,
        count: 1,
        total: amt,
        tenants: [t],
      });
    }
  }
  const groups = Array.from(byLocation.values()).sort((a, b) => b.total - a.total);
  const grand = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-6">
      <KpiBox label="Total deposits held" value={fmtEurInt(grand)} sub={`${tenants.length} tenants`} />

      <div className="overflow-x-auto border border-lightgray rounded-[5px]">
        <table className="w-full text-sm">
          <thead className="bg-background-alt">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Location</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Tenants</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Held</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.name} className="border-t border-lightgray/50">
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{g.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtEur(g.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">All tenants with held deposit</h3>
        <div className="overflow-x-auto border border-lightgray rounded-[5px] max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-background-alt sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Tenant</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Location</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Move-in</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Move-out</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Deposit</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-lightgray/50 hover:bg-background-alt">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/admin/tenants/${t.id}`} className="hover:underline">
                      {t.firstName} {t.lastName}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{t.room.apartment.location.name} · #{t.room.roomNumber}</td>
                  <td className="px-3 py-2">{fmtDate(t.moveIn)}</td>
                  <td className="px-3 py-2">{fmtDate(t.moveOut)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtEur(t.depositAmount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── DATEV Export ──────────────────────────────────────────

function ExportTab({ locations }: { locations: Location[] }) {
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [chart, setChart] = useState<"SKR03" | "SKR04">("SKR03");
  const [includeRent, setIncludeRent] = useState(true);
  const [includeFees, setIncludeFees] = useState(true);
  const [includeExtras, setIncludeExtras] = useState(true);
  const [locationId, setLocationId] = useState("");

  function downloadUrl() {
    const params = new URLSearchParams({
      from,
      to,
      chart,
      rent: includeRent ? "1" : "0",
      fees: includeFees ? "1" : "0",
      extras: includeExtras ? "1" : "0",
    });
    if (locationId) params.set("location", locationId);
    return `/api/admin/finance/datev?${params.toString()}`;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-gray">
        Generates a DATEV-compatible CSV with all paid transactions in the selected
        period. Choose the chart of accounts (SKR03 or SKR04) and which transaction
        types to include.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-gray mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs text-gray mb-1">Chart of accounts</span>
        <select
          value={chart}
          onChange={(e) => setChart(e.target.value as "SKR03" | "SKR04")}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="SKR03">SKR03</option>
          <option value="SKR04">SKR04</option>
        </select>
      </label>

      <label className="block">
        <span className="block text-xs text-gray mb-1">Location (optional)</span>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </label>

      <div className="space-y-1">
        <span className="block text-xs text-gray mb-1">Include</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeRent} onChange={(e) => setIncludeRent(e.target.checked)} />
          Rent payments (paid)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeFees} onChange={(e) => setIncludeFees(e.target.checked)} />
          Booking fees (€195)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeExtras} onChange={(e) => setIncludeExtras(e.target.checked)} />
          Extra charges (paid)
        </label>
      </div>

      <a
        href={downloadUrl()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90"
      >
        Download CSV
      </a>

      <p className="text-xs text-gray pt-3 border-t border-lightgray">
        Format: <code>Buchungsdatum;Belegnummer;Betrag;Steuerschlüssel;Gegenkonto;Buchungstext</code><br />
        Default account mapping: Rent → 8400 (SKR03) / 4400 (SKR04), Booking fees → 8200 / 4200, Extras → 8300 / 4300.
      </p>
    </div>
  );
}

// ─── Shared ─────────────────────────────────────────────────

function KpiBox({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  const valueClass =
    tone === "ok" ? "text-green-700" : tone === "warn" ? "text-orange-600" : "text-black";
  return (
    <div className="bg-background-alt rounded-[5px] border border-lightgray p-3">
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray mt-1">{sub}</p>}
    </div>
  );
}
