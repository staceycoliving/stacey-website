"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  PlayCircle,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Landmark,
  Zap,
  Receipt,
  Sparkles,
  FileText,
} from "lucide-react";
import { toast, Breadcrumbs, EmptyState, SkeletonKpiGrid, SkeletonTable } from "@/components/admin/ui";

/* ─── Types ──────────────────────────────────────────────── */

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
  stripePaymentIntentId: string | null;
  tenantId: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    paymentMethod: "SEPA" | "BANK_TRANSFER";
    room: {
      roomNumber: string;
      apartment: { location: { id: string; name: string } };
    } | null;
  };
};

type DepositTenant = {
  id: string;
  firstName: string;
  lastName: string;
  depositAmount: number | null;
  depositStatus: string;
  moveIn: string;
  moveOut: string | null;
  createdAt: string;
  room: {
    roomNumber: string;
    apartment: { location: { id: string; name: string } };
  } | null;
};

type ActiveTenant = {
  id: string;
  firstName: string;
  lastName: string;
  monthlyRent: number;
  moveIn: string;
  moveOut: string | null;
  room: {
    apartment: { location: { id: string; name: string } };
  } | null;
};

type BookingWithFee = {
  id: string;
  firstName: string;
  lastName: string;
  bookingFeePaidAt: string | null;
  locationId: string;
  location: { id: string; name: string };
};

type ExtraCharge = {
  id: string;
  description: string;
  amount: number;
  type: "CHARGE" | "DISCOUNT";
  chargeOn: "NEXT_RENT" | "DEPOSIT_SETTLEMENT";
  paidAt: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    room: {
      roomNumber: string;
      apartment: { location: { name: string } };
    } | null;
  };
};

type BundledAdjustment = {
  id: string;
  amount: number;
  type: "CHARGE" | "DISCOUNT";
  description: string;
  paidAt: string | null;
  stripePaymentIntentId: string | null;
};

type Data = {
  rentPayments: RentPayment[];
  depositTenants: DepositTenant[];
  activeTenants: ActiveTenant[];
  bookingsWithFee: BookingWithFee[];
  extraCharges: ExtraCharge[];
  bundledAdjustments: BundledAdjustment[];
  locations: Location[];
  serverNow: string;
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
  { id: "extras", label: "Adjustments" },
  { id: "export", label: "Export" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ─── Formatters ─────────────────────────────────────────── */

function fmtEur(cents: number) {
  return `€${(cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtEurInt(cents: number) {
  return `€${Math.round(cents / 100).toLocaleString("de-DE")}`;
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
  });
}

function fmtMonthLong(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function fmtDate(d: string | null) {
  if (!d) return ",";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function monthKey(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/* ─── Main ──────────────────────────────────────────────── */

export default function FinancePage({ data }: { data: Data }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [tab, setTab] = useState<TabId>(initialTab);

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
        <Breadcrumbs items={[{ label: "Finance" }]} />
                <h1 className="text-2xl font-bold text-black">Finance</h1>
        <p className="text-sm text-gray mt-1">
          Revenue, cashflow, rent collection, deposits and DATEV export.
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
            <RentRollTab
              rentPayments={data.rentPayments}
              bundledAdjustments={data.bundledAdjustments}
              onChanged={() => router.refresh()}
            />
          )}
          {tab === "arrears" && (
            <ArrearsTab
              rentPayments={data.rentPayments}
              onChanged={() => router.refresh()}
            />
          )}
          {tab === "deposits" && (
            <DepositsTab tenants={data.depositTenants} />
          )}
          {tab === "extras" && <ExtrasTab extraCharges={data.extraCharges} />}
          {tab === "export" && <ExportTab locations={data.locations} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Overview Tab ─────────────────────────────────────── */

function OverviewTab({ data }: { data: Data }) {
  const now = new Date(data.serverNow);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Cash received in current calendar month (rent + fees + extras, by paidAt)
  const cashRent = data.rentPayments
    .filter(
      (p) =>
        p.paidAt &&
        new Date(p.paidAt) >= monthStart &&
        new Date(p.paidAt) < nextMonthStart
    )
    .reduce((s, p) => s + p.paidAmount, 0);
  const cashFees = data.bookingsWithFee
    .filter(
      (b) =>
        b.bookingFeePaidAt &&
        new Date(b.bookingFeePaidAt) >= monthStart &&
        new Date(b.bookingFeePaidAt) < nextMonthStart
    )
    .reduce((s) => s + 19500, 0);
  const cashExtras = data.extraCharges
    .filter(
      (e) =>
        e.paidAt &&
        new Date(e.paidAt) >= monthStart &&
        new Date(e.paidAt) < nextMonthStart
    )
    .reduce(
      (s, e) => s + (e.type === "DISCOUNT" ? -e.amount : e.amount),
      0
    );
  const cashThisMonth = cashRent + cashFees + cashExtras;

  // Previous month cash (for trend)
  const prevMonthCashRent = data.rentPayments
    .filter(
      (p) =>
        p.paidAt &&
        new Date(p.paidAt) >= prevMonthStart &&
        new Date(p.paidAt) < monthStart
    )
    .reduce((s, p) => s + p.paidAmount, 0);
  const prevMonthCashFees = data.bookingsWithFee
    .filter(
      (b) =>
        b.bookingFeePaidAt &&
        new Date(b.bookingFeePaidAt) >= prevMonthStart &&
        new Date(b.bookingFeePaidAt) < monthStart
    )
    .reduce((s) => s + 19500, 0);
  const prevMonthCashExtras = data.extraCharges
    .filter(
      (e) =>
        e.paidAt &&
        new Date(e.paidAt) >= prevMonthStart &&
        new Date(e.paidAt) < monthStart
    )
    .reduce(
      (s, e) => s + (e.type === "DISCOUNT" ? -e.amount : e.amount),
      0
    );
  const prevMonthCash = prevMonthCashRent + prevMonthCashFees + prevMonthCashExtras;

  // Rent expected/collected for the current rent-month
  const thisMonthRents = data.rentPayments.filter(
    (p) => new Date(p.month) >= monthStart && new Date(p.month) < nextMonthStart
  );
  const thisMonthExpected = thisMonthRents.reduce((s, p) => s + p.amount, 0);
  const thisMonthPaid = thisMonthRents.reduce((s, p) => s + p.paidAmount, 0);
  const collectionRate =
    thisMonthExpected > 0 ? Math.round((thisMonthPaid / thisMonthExpected) * 100) : 0;

  // Outstanding (all unpaid across all months)
  const totalOpen = data.rentPayments.reduce(
    (s, p) => (p.status !== "PAID" ? s + (p.amount - p.paidAmount) : s),
    0
  );

  // Deposits held
  const depositsHeld = data.depositTenants.reduce(
    (s, t) => s + (t.depositAmount ?? 0),
    0
  );

  // Next-month forecast (MRR projection)
  const forecastTenants = data.activeTenants.filter((t) => {
    const mIn = new Date(t.moveIn);
    const mOut = t.moveOut ? new Date(t.moveOut) : null;
    if (mIn > nextMonthEnd) return false;
    if (mOut && mOut < nextMonthStart) return false;
    return true;
  });
  const forecastNextMonth = forecastTenants.reduce((s, t) => s + t.monthlyRent, 0);

  // YTD collection
  const ytdRent = data.rentPayments
    .filter((p) => p.paidAt && new Date(p.paidAt) >= yearStart)
    .reduce((s, p) => s + p.paidAmount, 0);
  const ytdFees =
    data.bookingsWithFee.filter(
      (b) => b.bookingFeePaidAt && new Date(b.bookingFeePaidAt) >= yearStart
    ).length * 19500;
  const ytdExtras = data.extraCharges
    .filter((e) => e.paidAt && new Date(e.paidAt) >= yearStart)
    .reduce(
      (s, e) => s + (e.type === "DISCOUNT" ? -e.amount : e.amount),
      0
    );
  const ytdTotal = ytdRent + ytdFees + ytdExtras;

  // 12-month chart
  const monthly: {
    month: string;
    baseExpected: number;
    basePaid: number;
    adjPaid: number;
    feesPaid: number;
    collectionRate: number;
  }[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const rents = data.rentPayments.filter((p) => {
      const d = new Date(p.month);
      return d >= m && d < mEnd;
    });
    const expected = rents.reduce((s, p) => s + p.amount, 0);
    const paid = rents.reduce((s, p) => s + p.paidAmount, 0);
    const cashInPeriod = data.rentPayments
      .filter(
        (p) =>
          p.paidAt && new Date(p.paidAt) >= m && new Date(p.paidAt) < mEnd
      )
      .reduce((s, p) => s + p.paidAmount, 0);
    const feesInPeriod = data.bookingsWithFee
      .filter(
        (b) =>
          b.bookingFeePaidAt &&
          new Date(b.bookingFeePaidAt) >= m &&
          new Date(b.bookingFeePaidAt) < mEnd
      )
      .reduce((s) => s + 19500, 0);
    const adjInPeriod = data.extraCharges
      .filter(
        (e) =>
          e.paidAt && new Date(e.paidAt) >= m && new Date(e.paidAt) < mEnd
      )
      .reduce(
        (s, e) => s + (e.type === "DISCOUNT" ? -e.amount : e.amount),
        0
      );

    monthly.push({
      month: m.toISOString(),
      baseExpected: expected,
      basePaid: cashInPeriod,
      adjPaid: adjInPeriod,
      feesPaid: feesInPeriod,
      collectionRate: expected > 0 ? Math.round((paid / expected) * 100) : 0,
    });
  }
  const maxBar = Math.max(
    1,
    ...monthly.map((m) =>
      Math.max(m.baseExpected, m.basePaid + m.adjPaid + m.feesPaid)
    )
  );

  // Per-location (this month)
  const perLocation = data.locations.map((loc) => {
    const locPays = thisMonthRents.filter(
      (p) => p.tenant.room?.apartment.location.id === loc.id
    );
    const expected = locPays.reduce((s, p) => s + p.amount, 0);
    const paid = locPays.reduce((s, p) => s + p.paidAmount, 0);
    const rate = expected > 0 ? Math.round((paid / expected) * 100) : 0;
    return {
      name: loc.name,
      expected,
      paid,
      outstanding: expected - paid,
      rate,
    };
  });

  return (
    <div className="space-y-8">
      {/* KPI cards, 6 across */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiBox
          label="Cash this month"
          value={fmtEurInt(cashThisMonth)}
          sub={
            prevMonthCash > 0
              ? `${cashThisMonth > prevMonthCash ? "+" : ""}${Math.round(
                  ((cashThisMonth - prevMonthCash) / prevMonthCash) * 100
                )}% vs last`
              : "First month with cash"
          }
          trend={
            cashThisMonth > prevMonthCash
              ? "up"
              : cashThisMonth < prevMonthCash
                ? "down"
                : "flat"
          }
        />
        <KpiBox
          label="Rent expected (this month)"
          value={fmtEurInt(thisMonthExpected)}
          sub={`${fmtEurInt(thisMonthPaid)} paid`}
        />
        <KpiBox
          label="Collection rate"
          value={`${collectionRate}%`}
          sub={`${fmtEurInt(thisMonthExpected - thisMonthPaid)} remaining`}
          tone={collectionRate >= 95 ? "ok" : collectionRate >= 80 ? undefined : "warn"}
        />
        <KpiBox
          label="Outstanding total"
          value={fmtEurInt(totalOpen)}
          sub="all months"
          tone={totalOpen > 0 ? "warn" : "ok"}
        />
        <KpiBox
          label="Deposits held"
          value={fmtEurInt(depositsHeld)}
          sub={`${data.depositTenants.length} tenants`}
        />
        <KpiBox
          label="Next month forecast"
          value={fmtEurInt(forecastNextMonth)}
          sub={`${forecastTenants.length} active`}
        />
      </div>

      {/* Chart */}
      <div>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-sm font-semibold">
            12-month cashflow · stacked = rent + adjustments + fees (actual cash in)
          </h3>
          <div className="flex gap-3 text-xs text-gray">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-300 rounded-[2px]" /> Expected rent
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-green-600 rounded-[2px]" /> Rent paid
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-pink rounded-[2px]" /> Adjustments
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded-[2px]" /> Booking fees
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 border-t-2 border-dashed border-orange-500" />{" "}
              Collection rate
            </span>
          </div>
        </div>
        <div className="bg-background-alt rounded-[5px] p-4 border border-lightgray">
          <div className="flex items-end gap-2 h-48 relative">
            {monthly.map((m) => {
              const expectedH = (m.baseExpected / maxBar) * 100;
              const rentH = (m.basePaid / maxBar) * 100;
              const adjH = (Math.max(0, m.adjPaid) / maxBar) * 100;
              const feesH = (m.feesPaid / maxBar) * 100;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center group relative"
                >
                  <div className="flex items-end gap-0.5 h-40 w-full justify-center">
                    {/* Expected (background bar) */}
                    <div
                      className="bg-gray-300 w-3 rounded-t-[2px]"
                      style={{ height: `${expectedH}%` }}
                      title={`Expected ${fmtEur(m.baseExpected)}`}
                    />
                    {/* Stacked actuals */}
                    <div className="w-3 flex flex-col-reverse">
                      <div
                        className="bg-green-600 rounded-t-[2px]"
                        style={{ height: `${rentH * 1.6}px` }}
                        title={`Rent paid ${fmtEur(m.basePaid)}`}
                      />
                      {adjH > 0 && (
                        <div
                          className="bg-pink"
                          style={{ height: `${adjH * 1.6}px` }}
                          title={`Adjustments ${fmtEur(m.adjPaid)}`}
                        />
                      )}
                      {feesH > 0 && (
                        <div
                          className="bg-blue-500"
                          style={{ height: `${feesH * 1.6}px` }}
                          title={`Fees ${fmtEur(m.feesPaid)}`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray mt-1 tabular-nums">
                    {fmtMonth(m.month)}
                  </div>
                  {/* Hover tooltip with collection rate */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 pointer-events-none bg-black text-white text-xs px-2 py-1 rounded-[4px] whitespace-nowrap z-10 tabular-nums">
                    {fmtMonth(m.month)} · {m.collectionRate}% collected
                  </div>
                </div>
              );
            })}
          </div>
          {/* Collection-rate mini row under the chart */}
          <div className="flex items-end gap-2 mt-2 border-t border-lightgray pt-2">
            {monthly.map((m) => (
              <div
                key={m.month + "-rate"}
                className="flex-1 text-center text-[10px] text-orange-600 font-semibold tabular-nums"
              >
                {m.collectionRate}%
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-location */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          This month by location · {fmtMonthLong(monthStart.toISOString())}
        </h3>
        <div className="overflow-x-auto border border-lightgray rounded-[5px]">
          <table className="w-full text-sm">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                  Location
                </th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                  Expected
                </th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                  Paid
                </th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                  Outstanding
                </th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {perLocation.map((l) => (
                <tr key={l.name} className="border-t border-lightgray/50">
                  <td className="px-3 py-2 font-medium">{l.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtEur(l.expected)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">
                    {fmtEur(l.paid)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      l.outstanding > 0 ? "text-red-600" : "text-gray"
                    }`}
                  >
                    {l.outstanding > 0 ? fmtEur(l.outstanding) : ","}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums font-semibold ${
                      l.rate >= 95 ? "text-green-700" : l.rate >= 80 ? "text-orange-600" : "text-red-600"
                    }`}
                  >
                    {l.rate}%
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
                <td className="px-3 py-2 text-right tabular-nums">
                  {collectionRate}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* YTD quick-refs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiBox label="YTD total" value={fmtEurInt(ytdTotal)} sub="all cash inflow" />
        <KpiBox label="YTD rent" value={fmtEurInt(ytdRent)} />
        <KpiBox label="YTD fees" value={fmtEurInt(ytdFees)} />
        <KpiBox label="YTD adjustments" value={fmtEurInt(ytdExtras)} />
      </div>
    </div>
  );
}

/* ─── Rent Roll Tab ─────────────────────────────────────── */

function RentRollTab({
  rentPayments,
  bundledAdjustments,
  onChanged,
}: {
  rentPayments: RentPayment[];
  bundledAdjustments: BundledAdjustment[];
  onChanged: () => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<"" | "SEPA" | "BANK_TRANSFER">("");
  const [payModal, setPayModal] = useState<{
    rows: RentPayment[];
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const months = [...new Set(rentPayments.map((rp) => rp.month))].sort().reverse();
  const [selectedMonth, setSelectedMonth] = useState(months[0] || "");

  // Lookup bundled adjustments by stripePI
  const adjByPI = useMemo(() => {
    const m = new Map<string, { base: number; total: number; items: BundledAdjustment[] }>();
    for (const a of bundledAdjustments) {
      if (!a.stripePaymentIntentId) continue;
      const prev = m.get(a.stripePaymentIntentId) ?? {
        base: 0,
        total: 0,
        items: [] as BundledAdjustment[],
      };
      prev.total += a.type === "DISCOUNT" ? -a.amount : a.amount;
      prev.items.push(a);
      m.set(a.stripePaymentIntentId, prev);
    }
    return m;
  }, [bundledAdjustments]);

  const monthFiltered = rentPayments.filter((rp) => rp.month === selectedMonth);

  const filtered = monthFiltered.filter((rp) => {
    if (statusFilter && rp.status !== statusFilter) return false;
    if (methodFilter && rp.tenant.paymentMethod !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${rp.tenant.firstName} ${rp.tenant.lastName}`.toLowerCase();
      if (
        !name.includes(q) &&
        !rp.tenant.email.toLowerCase().includes(q) &&
        !(rp.tenant.room?.roomNumber.toLowerCase() ?? "").includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const selectable = filtered.filter((rp) => rp.status !== "PAID");
    if (selectable.every((rp) => selected.has(rp.id))) {
      // All already selected → deselect
      setSelected(
        new Set([...selected].filter((id) => !selectable.some((rp) => rp.id === id)))
      );
    } else {
      // Select all visible non-paid
      setSelected(new Set([...selected, ...selectable.map((rp) => rp.id)]));
    }
  }

  const selectedRows = filtered.filter((rp) => selected.has(rp.id));

  async function retryCharge(rentPaymentId: string) {
    setUpdating(rentPaymentId);
    try {
      const res = await fetch(`/api/admin/rent-payments/${rentPaymentId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      toast.info(data.message ?? "Done");
      onChanged();
    } finally {
      setUpdating(null);
    }
  }

  async function markDunningSent(
    rentPaymentId: string,
    stage: "reminder1" | "mahnung1" | "mahnung2"
  ) {
    if (!confirm(`Mark ${stage} as sent? (Send the email/letter separately.)`))
      return;
    setUpdating(rentPaymentId);
    try {
      await fetch(`/api/admin/rent-payments/${rentPaymentId}/dunning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      onChanged();
    } finally {
      setUpdating(null);
    }
  }

  function mahnungLabel(rp: RentPayment) {
    if (rp.mahnung2SentAt) return "2. Mahnung";
    if (rp.mahnung1SentAt) return "1. Mahnung";
    if (rp.reminder1SentAt) return "Reminded";
    return ",";
  }

  function nextMahnungStage(
    rp: RentPayment
  ): "reminder1" | "mahnung1" | "mahnung2" | null {
    if (rp.status === "PAID") return null;
    if (!rp.reminder1SentAt) return "reminder1";
    if (!rp.mahnung1SentAt) return "mahnung1";
    if (!rp.mahnung2SentAt) return "mahnung2";
    return null;
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            {months.length === 0 && <option value="">No rent data yet</option>}
            {months.map((m) => (
              <option key={m} value={m}>
                {fmtMonthLong(m)}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray pointer-events-none" />
            <input
              type="text"
              placeholder="Search tenant / email / room"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-2 py-2 border border-lightgray rounded-[5px] text-sm bg-white w-60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) =>
              setMethodFilter(e.target.value as "" | "SEPA" | "BANK_TRANSFER")
            }
            className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All methods</option>
            <option value="SEPA">SEPA</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedMonth && (
            <a
              href={`/api/admin/finance/monthly-csv?month=${selectedMonth.slice(0, 7)}`}
              className="inline-flex items-center gap-1 px-3 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
            >
              <Download className="w-3.5 h-3.5" /> Month CSV
            </a>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-1 px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90"
          >
            <PlayCircle className="w-4 h-4" /> Run rent collection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiBox label="Tenants" value={String(stats.count)} />
        <KpiBox label="Expected" value={fmtEur(stats.expected)} />
        <KpiBox label="Received" value={fmtEur(stats.received)} tone="ok" />
        <KpiBox
          label="Outstanding"
          value={fmtEur(stats.outstanding)}
          tone={stats.outstanding > 0 ? "warn" : "ok"}
        />
      </div>

      {/* Bulk-selection bar */}
      {selectedRows.length > 0 && (
        <div className="mb-3 bg-black text-white rounded-[5px] px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm">
            <span className="font-semibold">{selectedRows.length} selected</span> ·{" "}
            Open total:{" "}
            {fmtEur(
              selectedRows.reduce(
                (s, r) => s + Math.max(0, r.amount - r.paidAmount),
                0
              )
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1 text-xs border border-white/40 rounded-[5px] hover:bg-white/10"
            >
              Clear selection
            </button>
            <button
              onClick={() => setPayModal({ rows: selectedRows })}
              className="px-3 py-1 text-xs font-semibold bg-white text-black rounded-[5px] hover:bg-white/90"
            >
              Mark {selectedRows.length} as paid…
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-lightgray rounded-[5px]">
        <table className="w-full text-sm">
          <thead className="bg-background-alt">
            <tr>
              <th className="px-2 py-2 text-left text-xs text-gray uppercase w-8">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 &&
                    filtered.filter((rp) => rp.status !== "PAID").every((rp) => selected.has(rp.id))
                  }
                  onChange={toggleSelectAll}
                  title="Select all non-paid in view"
                />
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Tenant</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Method</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Location</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Room</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Amount</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Adj</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Paid</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Mahnung</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-0 py-0">
                  <EmptyState
                    icon={<Receipt className="w-5 h-5" />}
                    title="No rent payments"
                    description="No rent rows match the current filters."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((rp) => {
                const adj = rp.stripePaymentIntentId
                  ? adjByPI.get(rp.stripePaymentIntentId)
                  : null;
                const adjAmount = adj?.total ?? 0;
                const baseAmount = rp.amount - adjAmount;
                const next = nextMahnungStage(rp);
                const isBank = rp.tenant.paymentMethod === "BANK_TRANSFER";
                const isSelected = selected.has(rp.id);
                return (
                  <tr
                    key={rp.id}
                    className={`border-t border-lightgray/50 hover:bg-background-alt ${
                      isSelected ? "bg-pink/5" : ""
                    }`}
                  >
                    <td className="px-2 py-2">
                      {rp.status !== "PAID" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(rp.id)}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <Link
                        href={`/admin/tenants/${rp.tenant.id}`}
                        className="hover:underline"
                      >
                        {rp.tenant.firstName} {rp.tenant.lastName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <PaymentMethodBadge method={rp.tenant.paymentMethod} />
                    </td>
                    <td className="px-3 py-2">
                      {rp.tenant.room?.apartment.location.name ?? ","}
                    </td>
                    <td className="px-3 py-2">
                      {rp.tenant.room ? `#${rp.tenant.room.roomNumber}` : ","}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums"
                      title={`Base ${fmtEur(baseAmount)}${adj ? ` + adjustments ${fmtEur(adjAmount)}` : ""}`}
                    >
                      {fmtEur(rp.amount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {adj ? (
                        <span
                          className={
                            adjAmount >= 0 ? "text-orange-600" : "text-green-700"
                          }
                          title={adj.items
                            .map(
                              (i) =>
                                `${i.type === "DISCOUNT" ? "-" : "+"}${fmtEur(i.amount)} ${i.description}`
                            )
                            .join("\n")}
                        >
                          {adjAmount > 0 ? "+" : ""}
                          {fmtEur(adjAmount)}
                        </span>
                      ) : (
                        ","
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtEur(rp.paidAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${
                          STATUS_COLORS[rp.status] || ""
                        }`}
                      >
                        {rp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          rp.mahnung2SentAt
                            ? "text-red-600 font-medium"
                            : rp.mahnung1SentAt
                              ? "text-orange-600"
                              : "text-gray"
                        }
                      >
                        {mahnungLabel(rp)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {rp.status !== "PAID" && (
                          <button
                            onClick={() => setPayModal({ rows: [rp] })}
                            disabled={updating === rp.id}
                            className="px-2 py-0.5 rounded-[5px] text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                            title={
                              isBank
                                ? "Mark as paid (bank transfer received)"
                                : "Mark as paid"
                            }
                          >
                            Mark paid
                          </button>
                        )}
                        {!isBank &&
                          (rp.status === "FAILED" ||
                            rp.status === "PENDING" ||
                            rp.status === "PARTIAL") && (
                            <button
                              onClick={() => retryCharge(rp.id)}
                              disabled={updating === rp.id}
                              className="px-2 py-0.5 rounded-[5px] text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1"
                              title="Re-run Stripe charge"
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                          )}
                        {next && (
                          <button
                            onClick={() => markDunningSent(rp.id, next)}
                            disabled={updating === rp.id}
                            className="px-2 py-0.5 rounded-[5px] text-xs font-medium border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50 inline-flex items-center gap-1"
                            title={`Mark ${next} as sent (send the email/letter separately)`}
                          >
                            <Mail className="w-3 h-3" />{" "}
                            {next === "reminder1"
                              ? "Rem."
                              : next === "mahnung1"
                                ? "M1"
                                : "M2"}
                          </button>
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

      {payModal && (
        <PaymentModal
          rows={payModal.rows}
          onClose={() => setPayModal(null)}
          onSuccess={() => {
            setPayModal(null);
            setSelected(new Set());
            onChanged();
          }}
        />
      )}

      {showPreview && (
        <RunRentPreviewModal
          onClose={() => setShowPreview(false)}
          onSuccess={() => {
            setShowPreview(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ─── Run-rent Preview Modal ───────────────────────────── */

function RunRentPreviewModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [preview, setPreview] = useState<{
    month: string;
    summary: {
      willCharge: number;
      willChargeTotal: number;
      bankTransfer: number;
      bankTransferTotal: number;
      skippedNoSepa: number;
      skippedBeforeMoveIn: number;
      alreadyPaid: number;
      alreadyProcessing: number;
      alreadyFailed: number;
    };
    rows: {
      tenantId: string;
      name: string;
      location: string;
      room: string;
      baseRent: number;
      adjustment: number;
      total: number;
      paymentMethod: "SEPA" | "BANK_TRANSFER";
      status: string;
      reason: string;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/admin/finance/preview-rent")
      .then((r) => r.json())
      .then(setPreview)
      .finally(() => setLoading(false));
  }, []);

  async function runNow() {
    if (!preview || preview.summary.willCharge === 0) return;
    if (
      !confirm(
        `Charge ${preview.summary.willCharge} tenants for ${fmtEur(preview.summary.willChargeTotal)} total?`
      )
    )
      return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/run-monthly-rent", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Rent run complete · ${data.month}`, {
          description: `${data.charged} charged · ${data.created} created · ${data.skipped} skipped${
            data.errors.length > 0 ? `\n\n${data.errors.join("\n")}` : ""
          }`,
          duration: 7000,
        });
        onSuccess();
      } else {
        toast.error("Failed", { description: data.error });
      }
    } catch {
      toast.error("Failed to run rent collection");
    }
    setRunning(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-lightgray flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Run rent collection, Preview</h3>
            {preview && (
              <p className="text-xs text-gray mt-0.5">
                Current month: {fmtMonthLong(preview.month + "-01")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background-alt rounded-[5px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          {loading && (
            <div className="space-y-4">
              <SkeletonKpiGrid count={5} />
              <SkeletonTable rows={5} cells={6} />
            </div>
          )}
          {preview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <StatSmall
                  label="SEPA · will charge"
                  value={`${preview.summary.willCharge} · ${fmtEurInt(preview.summary.willChargeTotal)}`}
                  tone="ok"
                />
                <StatSmall
                  label="Bank transfer · manual"
                  value={`${preview.summary.bankTransfer} · ${fmtEurInt(preview.summary.bankTransferTotal)}`}
                />
                <StatSmall
                  label="No payment method"
                  value={String(preview.summary.skippedNoSepa)}
                  tone={preview.summary.skippedNoSepa > 0 ? "warn" : undefined}
                />
                <StatSmall
                  label="Before move-in"
                  value={String(preview.summary.skippedBeforeMoveIn)}
                />
                <StatSmall
                  label="Already paid/running"
                  value={String(
                    preview.summary.alreadyPaid + preview.summary.alreadyProcessing
                  )}
                />
              </div>
              <div className="overflow-x-auto border border-lightgray rounded-[5px] max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-background-alt sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left">Tenant</th>
                      <th className="px-3 py-2 text-left">Method</th>
                      <th className="px-3 py-2 text-left">Room</th>
                      <th className="px-3 py-2 text-right">Base</th>
                      <th className="px-3 py-2 text-right">Adj</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Will</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.tenantId} className="border-t border-lightgray/50">
                        <td className="px-3 py-1.5">
                          <Link
                            href={`/admin/tenants/${r.tenantId}`}
                            className="hover:underline"
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5">
                          <PaymentMethodBadge method={r.paymentMethod} />
                        </td>
                        <td className="px-3 py-1.5 text-gray">
                          {r.location} · #{r.room}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {fmtEur(r.baseRent)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.adjustment !== 0
                            ? (r.adjustment > 0 ? "+" : "") + fmtEur(r.adjustment)
                            : ","}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                          {fmtEur(r.total)}
                        </td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={r.status} reason={r.reason} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-lightgray flex items-center justify-between gap-2">
          <p className="text-xs text-gray">
            SEPA charges are irreversible once accepted. Review the list above first.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
            >
              Cancel
            </button>
            <button
              onClick={runNow}
              disabled={
                running || !preview || preview.summary.willCharge === 0
              }
              className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
            >
              {running
                ? "Running…"
                : preview && preview.summary.willCharge > 0
                  ? `Charge ${preview.summary.willCharge} tenants`
                  : "Nothing to charge"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, reason }: { status: string; reason: string }) {
  const tone =
    status === "will_charge"
      ? "bg-green-100 text-green-800"
      : status === "bank_transfer"
        ? "bg-gray-100 text-gray-700 border border-gray-300"
        : status === "already_paid"
          ? "bg-gray-100 text-gray-600"
          : status === "already_processing"
            ? "bg-blue-100 text-blue-800"
            : status === "already_failed"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-semibold ${tone}`}
      title={reason}
    >
      {reason}
    </span>
  );
}

function StatSmall({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "ok" ? "text-green-700" : tone === "warn" ? "text-orange-600" : "text-black";
  return (
    <div className="bg-background-alt rounded-[5px] p-2 border border-lightgray">
      <p className="text-[10px] text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

/* ─── Arrears Tab ──────────────────────────────────────── */

function ArrearsTab({
  rentPayments,
  onChanged,
}: {
  rentPayments: RentPayment[];
  onChanged: () => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ rows: RentPayment[] } | null>(null);

  async function markDunningSent(
    rentPaymentId: string,
    stage: "reminder1" | "mahnung1" | "mahnung2"
  ) {
    if (!confirm(`Mark ${stage} as sent for this row?`)) return;
    setUpdating(rentPaymentId);
    try {
      await fetch(`/api/admin/rent-payments/${rentPaymentId}/dunning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      onChanged();
    } finally {
      setUpdating(null);
    }
  }

  function openPayModal(rentPayment: RentPayment) {
    setPayModal({ rows: [rentPayment] });
  }

  async function retryCharge(rentPaymentId: string) {
    setUpdating(rentPaymentId);
    try {
      const res = await fetch(
        `/api/admin/rent-payments/${rentPaymentId}/retry`,
        { method: "POST" }
      );
      const data = await res.json();
      toast.info(data.message ?? "Done");
      onChanged();
    } finally {
      setUpdating(null);
    }
  }

  const now = new Date();
  const unpaid = rentPayments.filter(
    (rp) => rp.status !== "PAID" && rp.amount > rp.paidAmount
  );

  // Aging: days since month start (simple, matches how we dun in cron)
  function daysOpen(monthIso: string): number {
    return Math.floor(
      (now.getTime() - new Date(monthIso).getTime()) / (24 * 60 * 60 * 1000)
    );
  }

  function bucketOf(rp: RentPayment): "b0_30" | "b30_60" | "b60_90" | "b90" {
    const d = daysOpen(rp.month);
    if (d < 30) return "b0_30";
    if (d < 60) return "b30_60";
    if (d < 90) return "b60_90";
    return "b90";
  }

  type TenantArrears = {
    tenantId: string;
    tenantName: string;
    email: string;
    location: string;
    room: string;
    months: RentPayment[];
    total: number;
    oldestDays: number;
    worstBucket: "b0_30" | "b30_60" | "b60_90" | "b90";
    dunningStage: "none" | "reminder1" | "mahnung1" | "mahnung2";
  };

  const byTenant = new Map<string, TenantArrears>();
  for (const rp of unpaid) {
    const id = rp.tenant.id;
    const open = rp.amount - rp.paidAmount;
    const stage = rp.mahnung2SentAt
      ? "mahnung2"
      : rp.mahnung1SentAt
        ? "mahnung1"
        : rp.reminder1SentAt
          ? "reminder1"
          : "none";
    const b = bucketOf(rp);
    const d = daysOpen(rp.month);
    const prev = byTenant.get(id);
    if (prev) {
      prev.months.push(rp);
      prev.total += open;
      if (d > prev.oldestDays) prev.oldestDays = d;
      const BUCKET_ORDER: Record<string, number> = {
        b0_30: 0,
        b30_60: 1,
        b60_90: 2,
        b90: 3,
      };
      if (BUCKET_ORDER[b] > BUCKET_ORDER[prev.worstBucket]) {
        prev.worstBucket = b;
      }
      const STAGE_ORDER: Record<string, number> = {
        none: 0,
        reminder1: 1,
        mahnung1: 2,
        mahnung2: 3,
      };
      if (STAGE_ORDER[stage] > STAGE_ORDER[prev.dunningStage]) {
        prev.dunningStage = stage;
      }
    } else {
      byTenant.set(id, {
        tenantId: id,
        tenantName: `${rp.tenant.firstName} ${rp.tenant.lastName}`,
        email: rp.tenant.email,
        location: rp.tenant.room?.apartment.location.name ?? ",",
        room: rp.tenant.room?.roomNumber ?? ",",
        months: [rp],
        total: open,
        oldestDays: d,
        worstBucket: b,
        dunningStage: stage,
      });
    }
  }

  const rows = Array.from(byTenant.values()).sort(
    (a, b) => b.oldestDays - a.oldestDays || b.total - a.total
  );

  // Bucket summaries
  const buckets = {
    b0_30: { label: "0-30 days", count: 0, total: 0, tone: "" },
    b30_60: { label: "30-60 days", count: 0, total: 0, tone: "text-orange-600" },
    b60_90: { label: "60-90 days", count: 0, total: 0, tone: "text-red-600" },
    b90: { label: "90+ days", count: 0, total: 0, tone: "text-red-700 font-bold" },
  } as const;
  const bucketCounts: Record<string, number> = {
    b0_30: 0,
    b30_60: 0,
    b60_90: 0,
    b90: 0,
  };
  const bucketTotals: Record<string, number> = {
    b0_30: 0,
    b30_60: 0,
    b60_90: 0,
    b90: 0,
  };
  for (const r of rows) {
    bucketCounts[r.worstBucket]++;
    bucketTotals[r.worstBucket] += r.total;
  }

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      {/* Aging buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {(
          Object.entries(buckets) as [keyof typeof buckets, (typeof buckets)[keyof typeof buckets]][]
        ).map(([key, b]) => (
          <div
            key={key}
            className="bg-background-alt rounded-[5px] border border-lightgray p-3"
          >
            <p className="text-xs text-gray uppercase tracking-wide">{b.label}</p>
            <p className={`text-xl font-bold mt-1 ${b.tone}`}>
              {fmtEurInt(bucketTotals[key])}
            </p>
            <p className="text-xs text-gray mt-0.5">
              {bucketCounts[key]} {bucketCounts[key] === 1 ? "tenant" : "tenants"}
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-5 h-5" />}
          title="No outstanding rent"
          description="Every tenant is paid up for this period."
        />
      ) : (
        <>
          <p className="text-xs text-gray mb-2">
            {rows.length} tenants · {fmtEurInt(grandTotal)} total outstanding.
            Expand a row to see individual months.
          </p>
          <div className="border border-lightgray rounded-[5px] overflow-hidden">
            {rows.map((r) => (
              <ArrearsRow
                key={r.tenantId}
                row={r}
                updating={updating}
                onMarkPaid={openPayModal}
                onRetry={retryCharge}
                onSendDunning={markDunningSent}
              />
            ))}
          </div>
        </>
      )}

      {payModal && (
        <PaymentModal
          rows={payModal.rows}
          onClose={() => setPayModal(null)}
          onSuccess={() => {
            setPayModal(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function ArrearsRow({
  row,
  updating,
  onMarkPaid,
  onRetry,
  onSendDunning,
}: {
  row: {
    tenantId: string;
    tenantName: string;
    email: string;
    location: string;
    room: string;
    months: RentPayment[];
    total: number;
    oldestDays: number;
    worstBucket: string;
    dunningStage: "none" | "reminder1" | "mahnung1" | "mahnung2";
  };
  updating: string | null;
  onMarkPaid: (rp: RentPayment) => void;
  onRetry: (id: string) => void;
  onSendDunning: (id: string, stage: "reminder1" | "mahnung1" | "mahnung2") => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const bucketBadge =
    row.worstBucket === "b90"
      ? "bg-red-200 text-red-900"
      : row.worstBucket === "b60_90"
        ? "bg-red-100 text-red-800"
        : row.worstBucket === "b30_60"
          ? "bg-orange-100 text-orange-800"
          : "bg-yellow-100 text-yellow-800";

  const stageBadge =
    row.dunningStage === "mahnung2"
      ? { label: "2. Mahnung sent", cls: "bg-red-100 text-red-800" }
      : row.dunningStage === "mahnung1"
        ? { label: "1. Mahnung sent", cls: "bg-orange-100 text-orange-800" }
        : row.dunningStage === "reminder1"
          ? { label: "Reminder sent", cls: "bg-yellow-100 text-yellow-800" }
          : { label: "No contact yet", cls: "bg-gray-100 text-gray-600" };

  // Next stage based on worst month (the one with earliest reminder gap)
  const nextStageRow = row.months.find(
    (m) => !m.mahnung2SentAt || !m.mahnung1SentAt || !m.reminder1SentAt
  );
  let nextStage: "reminder1" | "mahnung1" | "mahnung2" | null = null;
  let nextStageRowId: string | null = null;
  if (nextStageRow) {
    nextStageRowId = nextStageRow.id;
    if (!nextStageRow.reminder1SentAt) nextStage = "reminder1";
    else if (!nextStageRow.mahnung1SentAt) nextStage = "mahnung1";
    else if (!nextStageRow.mahnung2SentAt) nextStage = "mahnung2";
  }

  return (
    <div className="border-b border-lightgray last:border-b-0">
      <div className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-background-alt">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left flex items-center gap-3 min-w-0"
        >
          <span className="text-xs text-gray w-14 tabular-nums flex-shrink-0">
            {row.oldestDays}d
          </span>
          <span className="font-medium min-w-0 truncate">
            <Link
              href={`/admin/tenants/${row.tenantId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {row.tenantName}
            </Link>
          </span>
          <span className="text-xs text-gray flex-shrink-0">
            {row.location} · #{row.room}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold flex-shrink-0 ${bucketBadge}`}
          >
            {row.months.length}mo open
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold flex-shrink-0 ${stageBadge.cls}`}
          >
            {stageBadge.label}
          </span>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-semibold text-red-600 tabular-nums">
            {fmtEur(row.total)}
          </span>
          {nextStage && nextStageRowId && (
            <button
              onClick={() => onSendDunning(nextStageRowId!, nextStage!)}
              disabled={updating === nextStageRowId}
              className="px-2 py-0.5 rounded-[5px] text-xs font-medium border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50 inline-flex items-center gap-1"
              title={`Mark ${nextStage} as sent`}
            >
              <Mail className="w-3 h-3" />{" "}
              {nextStage === "reminder1"
                ? "Send reminder"
                : nextStage === "mahnung1"
                  ? "Send Mahnung 1"
                  : "Send Mahnung 2"}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="bg-background-alt px-3 py-2 border-t border-lightgray">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray">
                <th className="text-left py-1 font-medium">Month</th>
                <th className="text-right py-1 font-medium">Amount</th>
                <th className="text-right py-1 font-medium">Paid</th>
                <th className="text-left py-1 font-medium px-2">Status</th>
                <th className="text-left py-1 font-medium">Mahnung</th>
                <th className="text-right py-1 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {row.months
                .sort(
                  (a, b) =>
                    new Date(a.month).getTime() - new Date(b.month).getTime()
                )
                .map((rp) => (
                  <tr key={rp.id} className="border-t border-lightgray/50">
                    <td className="py-1">{fmtMonthLong(rp.month)}</td>
                    <td className="py-1 text-right tabular-nums">
                      {fmtEur(rp.amount)}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {fmtEur(rp.paidAmount)}
                    </td>
                    <td className="py-1 px-2">
                      <span
                        className={`inline-block px-1.5 py-0 rounded-[5px] text-[10px] font-semibold ${STATUS_COLORS[rp.status] || ""}`}
                      >
                        {rp.status}
                      </span>
                    </td>
                    <td className="py-1">
                      {rp.mahnung2SentAt
                        ? "2. Mahnung"
                        : rp.mahnung1SentAt
                          ? "1. Mahnung"
                          : rp.reminder1SentAt
                            ? "Reminder"
                            : ","}
                    </td>
                    <td className="py-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onMarkPaid(rp)}
                          disabled={updating === rp.id}
                          className="px-1.5 py-0.5 rounded-[3px] text-[10px] border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          Mark paid…
                        </button>
                        {(rp.status === "FAILED" || rp.status === "PARTIAL") && (
                          <button
                            onClick={() => onRetry(rp.id)}
                            disabled={updating === rp.id}
                            className="px-1.5 py-0.5 rounded-[3px] text-[10px] border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                      </div>
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

/* ─── Deposits Tab ─────────────────────────────────────── */

function DepositsTab({ tenants }: { tenants: DepositTenant[] }) {
  const now = new Date();
  const RETURN_DEADLINE_DAYS = 42; // 6 weeks, see /admin/deposits

  // Age buckets based on createdAt (our best proxy for "deposit received")
  function monthsHeld(t: DepositTenant): number {
    return Math.floor(
      (now.getTime() - new Date(t.createdAt).getTime()) /
        (30 * 24 * 60 * 60 * 1000)
    );
  }
  const ageBuckets = {
    "0_3m": { label: "0-3 months", count: 0, total: 0 },
    "3_12m": { label: "3-12 months", count: 0, total: 0 },
    "12_24m": { label: "12-24 months", count: 0, total: 0 },
    "24m+": { label: "24+ months", count: 0, total: 0 },
  };
  for (const t of tenants) {
    const m = monthsHeld(t);
    const bucket =
      m < 3 ? "0_3m" : m < 12 ? "3_12m" : m < 24 ? "12_24m" : "24m+";
    ageBuckets[bucket].count += 1;
    ageBuckets[bucket].total += t.depositAmount ?? 0;
  }

  // Overdue (moved out >6 weeks ago, not yet refunded)
  const overdue = tenants.filter((t) => {
    if (!t.moveOut) return false;
    const days = Math.floor(
      (now.getTime() - new Date(t.moveOut).getTime()) / 86_400_000
    );
    return days > RETURN_DEADLINE_DAYS;
  });
  const overdueTotal = overdue.reduce(
    (s, t) => s + (t.depositAmount ?? 0),
    0
  );

  // Settlements due in next 30 days (tenants moving out)
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const settlementsDue = tenants
    .filter(
      (t) =>
        t.moveOut && new Date(t.moveOut) >= now && new Date(t.moveOut) <= in30
    )
    .sort(
      (a, b) =>
        new Date(a.moveOut!).getTime() - new Date(b.moveOut!).getTime()
    );

  // Per-location
  const byLocation = new Map<
    string,
    { name: string; count: number; total: number }
  >();
  for (const t of tenants) {
    const id = t.room?.apartment.location.id ?? ",";
    const prev = byLocation.get(id);
    const amt = t.depositAmount ?? 0;
    if (prev) {
      prev.count += 1;
      prev.total += amt;
    } else {
      byLocation.set(id, {
        name: t.room?.apartment.location.name ?? "Unknown",
        count: 1,
        total: amt,
      });
    }
  }
  const groups = Array.from(byLocation.values()).sort(
    (a, b) => b.total - a.total
  );
  const grand = tenants.reduce((s, t) => s + (t.depositAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header + CTA to work tool */}
      <div className="bg-background-alt border border-lightgray rounded-[5px] p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold mb-0.5">
            Deposit overview (read-only)
          </h3>
          <p className="text-xs text-gray">
            This is the high-level summary. For settlement actions (IBAN,
            refund calculation, email, mark transferred), use the dedicated
            work tool.
          </p>
        </div>
        <Link
          href="/admin/deposits"
          className="inline-flex items-center gap-1 px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 whitespace-nowrap"
        >
          Open settlement tool →
        </Link>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[5px] p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-red-800">
              ⚠ {overdue.length} deposit
              {overdue.length === 1 ? "" : "s"} overdue (&gt;6 weeks)
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Total blocked:{" "}
              <span className="font-semibold">{fmtEur(overdueTotal)}</span>.
              Settle these first to stay within the communicated deadline.
            </p>
          </div>
          <Link
            href="/admin/deposits"
            className="text-xs font-semibold text-red-800 underline hover:no-underline whitespace-nowrap"
          >
            Open overdue list →
          </Link>
        </div>
      )}

      {/* Age distribution */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Age distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            Object.entries(ageBuckets) as [
              keyof typeof ageBuckets,
              (typeof ageBuckets)[keyof typeof ageBuckets],
            ][]
          ).map(([key, b]) => (
            <div
              key={key}
              className="bg-background-alt rounded-[5px] border border-lightgray p-3"
            >
              <p className="text-xs text-gray uppercase tracking-wide">
                {b.label}
              </p>
              <p className="text-xl font-bold mt-1">{fmtEurInt(b.total)}</p>
              <p className="text-xs text-gray mt-0.5">
                {b.count} {b.count === 1 ? "tenant" : "tenants"}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray">
          Total held:{" "}
          <span className="font-semibold">{fmtEur(grand)}</span>
        </div>
      </div>

      {/* Settlements due */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Settlements due · next 30 days
        </h3>
        {settlementsDue.length === 0 ? (
          <div className="text-center text-sm text-gray py-6 border border-lightgray rounded-[5px]">
            No tenants moving out in the next 30 days.
          </div>
        ) : (
          <div className="overflow-x-auto border border-lightgray rounded-[5px]">
            <table className="w-full text-sm">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                    Tenant
                  </th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                    Location
                  </th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                    Move-out
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                    Deposit held
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {settlementsDue.map((t) => {
                  const daysLeft = Math.ceil(
                    (new Date(t.moveOut!).getTime() - now.getTime()) /
                      (24 * 60 * 60 * 1000)
                  );
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-lightgray/50 hover:bg-background-alt"
                    >
                      <td className="px-3 py-2 font-medium">
                        <Link
                          href={`/admin/tenants/${t.id}?tab=settlement`}
                          className="hover:underline"
                        >
                          {t.firstName} {t.lastName}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        {t.room?.apartment.location.name ?? ","} · #
                        {t.room?.roomNumber ?? ","}
                      </td>
                      <td className="px-3 py-2">
                        {fmtDate(t.moveOut)}{" "}
                        <span className="text-gray text-xs">
                          ({daysLeft}d)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtEur(t.depositAmount ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href="/admin/deposits"
                          className="inline-block px-2 py-0.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt"
                        >
                          Settle →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-location */}
      <div>
        <h3 className="text-sm font-semibold mb-2">By location</h3>
        <div className="overflow-x-auto border border-lightgray rounded-[5px]">
          <table className="w-full text-sm">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                  Location
                </th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                  Tenants
                </th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                  Held
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.name} className="border-t border-lightgray/50">
                  <td className="px-3 py-2 font-medium">{g.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {g.count}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtEur(g.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Adjustments (ExtraCharges) Tab ───────────────────── */

function ExtrasTab({ extraCharges }: { extraCharges: ExtraCharge[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "CHARGE" | "DISCOUNT">(
    "all"
  );

  const filtered = extraCharges.filter((e) => {
    if (filter === "open" && e.paidAt) return false;
    if (filter === "paid" && !e.paidAt) return false;
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    return true;
  });

  const openTotal = extraCharges
    .filter((e) => !e.paidAt)
    .reduce(
      (s, e) => s + (e.type === "DISCOUNT" ? -e.amount : e.amount),
      0
    );
  const paidTotal = extraCharges
    .filter((e) => e.paidAt)
    .reduce(
      (s, e) => s + (e.type === "DISCOUNT" ? -e.amount : e.amount),
      0
    );

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <KpiBox label="Total entries" value={String(extraCharges.length)} />
        <KpiBox
          label="Open (not yet collected)"
          value={fmtEurInt(openTotal)}
          tone={openTotal > 0 ? "warn" : "ok"}
        />
        <KpiBox
          label="Paid in last 12 months"
          value={fmtEurInt(paidTotal)}
          tone="ok"
        />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as "all" | "open" | "paid")
          }
          className="px-3 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "all" | "CHARGE" | "DISCOUNT")
          }
          className="px-3 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="all">Charges + Discounts</option>
          <option value="CHARGE">Charges only</option>
          <option value="DISCOUNT">Discounts only</option>
        </select>
        <span className="text-xs text-gray ml-auto">
          {filtered.length} of {extraCharges.length} shown
        </span>
      </div>

      <div className="overflow-x-auto border border-lightgray rounded-[5px]">
        <table className="w-full text-sm">
          <thead className="bg-background-alt">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Tenant</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Room</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Description</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Timing</th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">Amount</th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-0 py-0">
                  <EmptyState
                    icon={<FileText className="w-5 h-5" />}
                    title="No adjustments"
                    description="Nothing matches the current filters."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const sign = e.type === "DISCOUNT" ? -1 : 1;
                const signed = sign * e.amount;
                return (
                  <tr
                    key={e.id}
                    className="border-t border-lightgray/50 hover:bg-background-alt"
                  >
                    <td className="px-3 py-2 text-xs text-gray tabular-nums">
                      {fmtDate(e.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <Link
                        href={`/admin/tenants/${e.tenant.id}`}
                        className="hover:underline"
                      >
                        {e.tenant.firstName} {e.tenant.lastName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray">
                      {e.tenant.room?.apartment.location.name ?? ","} · #
                      {e.tenant.room?.roomNumber ?? ","}
                    </td>
                    <td className="px-3 py-2">{e.description}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="inline-block px-1.5 py-0.5 rounded-[5px] bg-gray-100 text-gray-700">
                        {e.chargeOn === "NEXT_RENT"
                          ? "Next rent"
                          : "Settlement"}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-semibold ${
                        signed < 0 ? "text-green-700" : "text-orange-700"
                      }`}
                    >
                      {signed > 0 ? "+" : ""}
                      {fmtEur(signed)}
                    </td>
                    <td className="px-3 py-2">
                      {e.paidAt ? (
                        <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Paid{" "}
                          {fmtDate(e.paidAt)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-orange-700 text-xs">
                          <AlertTriangle className="w-3 h-3" /> Open
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Export Tab ───────────────────────────────────────── */

function ExportTab({ locations }: { locations: Location[] }) {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);

  const [from, setFrom] = useState(lastMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(lastMonthEnd.toISOString().slice(0, 10));
  const [chart, setChart] = useState<"SKR03" | "SKR04">("SKR03");
  const [includeRent, setIncludeRent] = useState(true);
  const [includeFees, setIncludeFees] = useState(true);
  const [includeExtras, setIncludeExtras] = useState(true);
  const [locationId, setLocationId] = useState("");
  const [preview, setPreview] = useState<{
    count: number;
    total: number;
    breakdown: {
      rent: { count: number; total: number };
      fees: { count: number; total: number };
      extras: { count: number; total: number };
    };
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  function setPreset(preset: "lastMonth" | "ytd" | "lastYear") {
    if (preset === "lastMonth") {
      setFrom(lastMonth.toISOString().slice(0, 10));
      setTo(lastMonthEnd.toISOString().slice(0, 10));
    } else if (preset === "ytd") {
      setFrom(yearStart.toISOString().slice(0, 10));
      setTo(today.toISOString().slice(0, 10));
    } else {
      setFrom(lastYearStart.toISOString().slice(0, 10));
      setTo(lastYearEnd.toISOString().slice(0, 10));
    }
    setPreview(null); // reset preview when range changes
  }

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

  async function loadPreview() {
    setLoadingPreview(true);
    try {
      const params = new URLSearchParams({
        from,
        to,
        rent: includeRent ? "1" : "0",
        fees: includeFees ? "1" : "0",
        extras: includeExtras ? "1" : "0",
      });
      if (locationId) params.set("location", locationId);
      const res = await fetch(`/api/admin/finance/datev/preview?${params}`);
      const data = await res.json();
      setPreview(data);
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-gray">
        Generates a DATEV-compatible CSV with all paid transactions in the
        selected period. Choose chart of accounts (SKR03 / SKR04) and
        transaction types. Preview first, then download.
      </p>

      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray">Quick ranges:</span>
        <button
          onClick={() => setPreset("lastMonth")}
          className="px-2 py-1 text-xs border border-lightgray rounded-[5px] hover:bg-background-alt"
        >
          Last month
        </button>
        <button
          onClick={() => setPreset("ytd")}
          className="px-2 py-1 text-xs border border-lightgray rounded-[5px] hover:bg-background-alt"
        >
          Year-to-date
        </button>
        <button
          onClick={() => setPreset("lastYear")}
          className="px-2 py-1 text-xs border border-lightgray rounded-[5px] hover:bg-background-alt"
        >
          Last year
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-gray mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPreview(null);
            }}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPreview(null);
            }}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
            onChange={(e) => {
              setLocationId(e.target.value);
              setPreview(null);
            }}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1">
        <span className="block text-xs text-gray mb-1">Include</span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeRent}
            onChange={(e) => {
              setIncludeRent(e.target.checked);
              setPreview(null);
            }}
          />
          Rent payments (paid)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeFees}
            onChange={(e) => {
              setIncludeFees(e.target.checked);
              setPreview(null);
            }}
          />
          Booking fees (€195)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeExtras}
            onChange={(e) => {
              setIncludeExtras(e.target.checked);
              setPreview(null);
            }}
          />
          Extra charges / adjustments (paid)
        </label>
      </div>

      {/* Preview */}
      <div className="border border-lightgray rounded-[5px] p-3 bg-background-alt">
        {!preview ? (
          <button
            onClick={loadPreview}
            disabled={loadingPreview}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-lightgray bg-white rounded-[5px] text-sm hover:bg-background-alt disabled:opacity-50"
          >
            {loadingPreview ? "Loading…" : "Preview what's in the export"}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-sm">
                <span className="font-semibold text-base">{preview.count}</span>{" "}
                Buchungen ·{" "}
                <span className="font-semibold text-base">
                  {fmtEur(preview.total)}
                </span>{" "}
                Total
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded-[5px] p-2 border border-lightgray">
                <p className="text-gray">Rent</p>
                <p className="font-semibold tabular-nums">
                  {preview.breakdown.rent.count} ·{" "}
                  {fmtEur(preview.breakdown.rent.total)}
                </p>
              </div>
              <div className="bg-white rounded-[5px] p-2 border border-lightgray">
                <p className="text-gray">Fees</p>
                <p className="font-semibold tabular-nums">
                  {preview.breakdown.fees.count} ·{" "}
                  {fmtEur(preview.breakdown.fees.total)}
                </p>
              </div>
              <div className="bg-white rounded-[5px] p-2 border border-lightgray">
                <p className="text-gray">Extras</p>
                <p className="font-semibold tabular-nums">
                  {preview.breakdown.extras.count} ·{" "}
                  {fmtEur(preview.breakdown.extras.total)}
                </p>
              </div>
            </div>
            <button
              onClick={loadPreview}
              className="text-xs text-gray hover:underline"
            >
              Refresh preview
            </button>
          </div>
        )}
      </div>

      <a
        href={downloadUrl()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90"
      >
        <Download className="w-4 h-4" /> Download DATEV CSV
      </a>

      <p className="text-xs text-gray pt-3 border-t border-lightgray">
        Format:{" "}
        <code>
          Buchungsdatum;Belegnummer;Betrag;Steuerschlüssel;Gegenkonto;Buchungstext
        </code>
        <br />
        Default account mapping: Rent → 8400 (SKR03) / 4400 (SKR04), Booking
        fees → 8200 / 4200, Extras → 8300 / 4300.
      </p>
    </div>
  );
}

/* ─── Shared ─────────────────────────────────────────── */

function KpiBox({
  label,
  value,
  sub,
  tone,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
  trend?: "up" | "down" | "flat";
}) {
  const valueClass =
    tone === "ok"
      ? "text-green-700"
      : tone === "warn"
        ? "text-orange-600"
        : "text-black";
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className="bg-background-alt rounded-[5px] border border-lightgray p-3">
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p
        className={`text-xl font-bold mt-1 ${valueClass} tabular-nums flex items-center gap-1`}
      >
        {value}
        {trend && (
          <TrendIcon
            className={`w-4 h-4 ${
              trend === "up"
                ? "text-green-700"
                : trend === "down"
                  ? "text-red-600"
                  : "text-gray"
            }`}
          />
        )}
      </p>
      {sub && <p className="text-xs text-gray mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Payment method badge ─────────────────────────────── */

function PaymentMethodBadge({ method }: { method: "SEPA" | "BANK_TRANSFER" }) {
  if (method === "SEPA") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <Zap className="w-2.5 h-2.5" /> SEPA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      <Landmark className="w-2.5 h-2.5" /> Bank
    </span>
  );
}

/* ─── Mark-paid modal (single + bulk) ──────────────────── */

function PaymentModal({
  rows,
  onClose,
  onSuccess,
}: {
  rows: RentPayment[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [paidAt, setPaidAt] = useState<string>(today);
  // Single: editable amount field. Bulk: each row uses its full remaining
  // amount by default, with per-row override if needed.
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of rows) {
      const remaining = Math.max(0, r.amount - r.paidAmount);
      init[r.id] = (remaining / 100).toFixed(2);
    }
    return init;
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const isBulk = rows.length > 1;

  const totalToPost = rows.reduce(
    (s, r) => s + Math.round(Number(amounts[r.id] || "0") * 100),
    0
  );

  async function confirm() {
    setRunning(true);
    setProgress(0);
    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const cents = Math.round(Number(amounts[r.id] || "0") * 100);
        if (cents <= 0) {
          setProgress(i + 1);
          continue;
        }
        const res = await fetch("/api/admin/rent", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rentPaymentId: r.id,
            action: "mark_paid",
            amount: cents,
            paidAt,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(
            `Failed for ${r.tenant.firstName} ${r.tenant.lastName}`,
            { description: err.error ?? res.statusText }
          );
          setRunning(false);
          return;
        }
        setProgress(i + 1);
      }
      onSuccess();
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : String(err) });
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-lightgray flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">
              {isBulk
                ? `Mark ${rows.length} payments as paid`
                : "Mark payment as paid"}
            </h3>
            <p className="text-xs text-gray mt-0.5">
              Enter the actual received amount and the date it landed on the
              bank account (for DATEV). Partial payments are allowed.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="p-1 hover:bg-background-alt rounded-[5px] disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1 space-y-3">
          {/* Shared paid-on date */}
          <label className="block max-w-xs">
            <span className="block text-xs text-gray mb-1">
              Paid on (date on bank statement)
            </span>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              disabled={running}
              className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white disabled:opacity-50"
            />
          </label>

          {/* Per-row amount inputs */}
          <div className="border border-lightgray rounded-[5px] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                    Tenant
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                    Due
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                    Already paid
                  </th>
                  <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                    Amount received (€)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const remaining = Math.max(0, r.amount - r.paidAmount);
                  const cents = Math.round(
                    Number(amounts[r.id] || "0") * 100
                  );
                  const hint =
                    cents === 0
                      ? ", will skip"
                      : cents < remaining
                        ? `Under by ${fmtEur(remaining - cents)} → PARTIAL`
                        : cents > remaining
                          ? `Over by ${fmtEur(cents - remaining)}`
                          : "Full amount";
                  return (
                    <tr key={r.id} className="border-t border-lightgray/50">
                      <td className="px-3 py-2 text-xs">
                        <div className="font-medium">
                          {r.tenant.firstName} {r.tenant.lastName}
                        </div>
                        <div className="text-gray">
                          {fmtMonthLong(r.month)} ·{" "}
                          {r.tenant.room?.apartment.location.name ?? ","} · #
                          {r.tenant.room?.roomNumber ?? ","}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {fmtEur(r.amount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-gray">
                        {fmtEur(r.paidAmount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={amounts[r.id] ?? ""}
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                          disabled={running}
                          className="w-24 px-2 py-1 border border-lightgray rounded-[5px] text-right text-xs tabular-nums disabled:opacity-50"
                        />
                        <div className="text-[10px] text-gray mt-0.5">
                          {hint}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-background-alt border-t border-lightgray font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-right">
                    Total to record:
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtEur(totalToPost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {running && (
            <div className="text-xs text-gray">
              Recording… {progress} / {rows.length}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-lightgray flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={running}
            className="px-4 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={running || totalToPost === 0}
            className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
          >
            {running
              ? `Recording ${progress}/${rows.length}…`
              : `Record ${fmtEur(totalToPost)} as paid`}
          </button>
        </div>
      </div>
    </div>
  );
}
