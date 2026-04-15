"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Home,
  Calendar,
  ArrowRight,
  ClipboardList,
  Wallet,
  LogOut,
  Copy,
  ExternalLink,
} from "lucide-react";

type Dashboard = {
  kpi: {
    occupancy3Months: {
      label: string;
      occupied: number;
      total: number;
      free: number;
      pct: number;
    }[];
    monthlyRent: {
      monthLabel: string;
      expectedCents: number;
      collectedCents: number;
      openCents: number;
      tenantsWithOpen: number;
    };
    openRentAmount: number;
    totalActionItems: number;
  };
  availabilityByLocation: {
    name: string;
    slug: string;
    city: string;
    occupied: number;
    total: number;
    pct: number;
    categories: {
      category: string;
      total: number;
      indefinitelyBooked: number;
      reservedByBooking: number;
      earliestDates: string[]; // raw "free from" dates, unique + sorted
      bookableDates: string[]; // same as website booking tool (14-day flex expanded)
      minPrice: number | null;
    }[];
  }[];
  actionItems: {
    depositTimeoutSoon: { id: string; name: string; deadline: string | null }[];
    failedRents: {
      id: string;
      tenantName: string;
      tenantId: string;
      month: string;
      amount: number;
      failureReason: string | null;
    }[];
    settlementsPending: {
      id: string;
      name: string;
      moveOut: string | null;
      room: string;
    }[];
    missingSepa: {
      id: string;
      name: string;
      moveIn: string;
      room: string;
    }[];
    dunningReminder1: {
      id: string;
      tenantId: string;
      tenantName: string;
      month: string;
      amount: number;
    }[];
    dunningMahnung1: {
      id: string;
      tenantId: string;
      tenantName: string;
      month: string;
      amount: number;
    }[];
    dunningMahnung2: {
      id: string;
      tenantId: string;
      tenantName: string;
      month: string;
      amount: number;
    }[];
  };
  noticePipeline: {
    id: string;
    name: string;
    moveOut: string | null;
    room: string;
    monthlyRent: number;
    daysAway: number;
  }[];
  schedule: {
    moveIns: { id: string; name: string; date: string | null; room: string }[];
    moveOuts: { id: string; name: string; date: string | null; room: string }[];
  };
};

function fmtEuro(cents: number) {
  return `€${Math.round(cents / 100).toLocaleString("de-DE")}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function hoursUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60));
}

function daysSince(iso: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function DashboardPage({ data }: { data: Dashboard }) {
  const { kpi, availabilityByLocation, actionItems, schedule, noticePipeline } = data;
  const actionRef = useRef<HTMLDivElement>(null);

  // All bookable dates across every location/category — same logic as the
  // public booking tool (14-day flex expanded).
  const today = new Date().toISOString().slice(0, 10);
  const allBookableDates = Array.from(
    new Set(
      availabilityByLocation.flatMap((l) =>
        l.categories.flatMap((c) => c.bookableDates)
      )
    )
  ).sort();

  // Empty string = "show all" mode (no date filter applied).
  const [desiredDate, setDesiredDate] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>(""); // slug or ""
  const [personsFilter, setPersonsFilter] = useState<1 | 2>(1);

  function scrollToActions() {
    actionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black">Dashboard</h1>
        <p className="text-sm text-gray mt-1">
          {new Date().toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards: 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <OccupancyCard snapshots={kpi.occupancy3Months} />
        <MonthlyRentCard rent={kpi.monthlyRent} />
        <KpiCard
          icon={<ClipboardList className="w-4 h-4" />}
          label="Action items"
          value={String(kpi.totalActionItems)}
          sub={kpi.totalActionItems > 0 ? "Click to review" : "All clear"}
          accent={kpi.totalActionItems > 0 ? "warn" : "ok"}
          onClick={kpi.totalActionItems > 0 ? scrollToActions : undefined}
        />
      </div>

      {/* Availability */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Availability</h2>
          <p className="text-xs text-gray mt-0.5">
            Für Anrufe — filter + sort damit du die passende Option schnell findest.
          </p>
        </div>

        <AvailabilityTable
          locations={availabilityByLocation}
          desiredDate={desiredDate}
          onDesiredDateChange={setDesiredDate}
          allBookableDates={allBookableDates}
          today={today}
          cityFilter={cityFilter}
          onCityFilterChange={(v) => {
            setCityFilter(v);
            setLocationFilter(""); // reset location when city changes
          }}
          locationFilter={locationFilter}
          onLocationFilterChange={setLocationFilter}
          personsFilter={personsFilter}
          onPersonsFilterChange={setPersonsFilter}
        />
      </div>

      {/* Action Items — grouped by urgency + type-legend overview */}
      <div ref={actionRef}>
        <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold">
            Action items
            {kpi.totalActionItems > 0 && ` · ${kpi.totalActionItems}`}
          </h2>
          <ActionTypesLegend items={actionItems} />
        </div>
        {(() => {
          // Bucket each item by urgency so the admin reads top-down.
          type Row = {
            key: string;
            accent: "info" | "warn" | "danger";
            label: string;
            detail: string;
            href: string;
            // Sort key within its bucket — smaller = more urgent first.
            sortKey: number;
          };
          const today: Row[] = [];
          const thisWeek: Row[] = [];
          const older: Row[] = [];
          const nowTs = Date.now();

          // Deposit deadlines are always <24h per query → Today. Sort by
          // hours left ascending.
          for (const b of actionItems.depositTimeoutSoon) {
            const h = hoursUntil(b.deadline) ?? 99;
            today.push({
              key: `dep-${b.id}`,
              accent: "warn",
              label: "Deposit deadline soon",
              detail: `${b.name} · ${h}h left`,
              href: "/admin/bookings",
              sortKey: h,
            });
          }
          // Mahnung 2 — most severe, always Today + danger.
          for (const r of actionItems.dunningMahnung2) {
            const monthTs = new Date(r.month).getTime();
            const daysOpen = Math.floor((nowTs - monthTs) / (24 * 60 * 60 * 1000));
            today.push({
              key: `m2-${r.id}`,
              accent: "danger",
              label: "2. Mahnung + Kündigungsandrohung due",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)} · ${daysOpen}d overdue`,
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOpen, // most overdue first
            });
          }
          // Mahnung 1 → Today, warn.
          for (const r of actionItems.dunningMahnung1) {
            const monthTs = new Date(r.month).getTime();
            const daysOpen = Math.floor((nowTs - monthTs) / (24 * 60 * 60 * 1000));
            today.push({
              key: `m1-${r.id}`,
              accent: "warn",
              label: "1. Mahnung due",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)} · ${daysOpen}d overdue`,
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOpen + 100, // after M2
            });
          }
          // Reminder 1 → This week, info.
          for (const r of actionItems.dunningReminder1) {
            const monthTs = new Date(r.month).getTime();
            const daysOpen = Math.floor((nowTs - monthTs) / (24 * 60 * 60 * 1000));
            thisWeek.push({
              key: `r1-${r.id}`,
              accent: "info",
              label: "Zahlungserinnerung due",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)} · ${daysOpen}d open`,
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOpen,
            });
          }
          // Failed rents: this month → Today; older → Older bucket.
          for (const r of actionItems.failedRents) {
            const monthTs = new Date(r.month).getTime();
            const daysOld = Math.floor((nowTs - monthTs) / (24 * 60 * 60 * 1000));
            const row: Row = {
              key: `rent-${r.id}`,
              accent: "danger",
              label: "Failed rent charge",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(
                r.amount
              )}${r.failureReason ? ` · ${r.failureReason}` : ""}`,
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOld,
            };
            if (daysOld <= 30) today.push(row);
            else older.push(row);
          }
          // Missing payment method: moveIn in ≤3d → Today; else → This week.
          for (const t of actionItems.missingSepa) {
            const days = Math.floor(
              (new Date(t.moveIn).getTime() - nowTs) / (24 * 60 * 60 * 1000)
            );
            const row: Row = {
              key: `pay-${t.id}`,
              accent: "warn",
              label: "No payment method yet",
              detail: `${t.name} · ${t.room} · move-in ${fmtDate(t.moveIn)}`,
              href: `/admin/tenants/${t.id}`,
              sortKey: days, // soonest move-in first
            };
            if (days <= 3) today.push(row);
            else thisWeek.push(row);
          }
          // Settlements: <14d → This week; 14-30d → This week warn; >30d → Older (danger).
          for (const t of actionItems.settlementsPending) {
            const d = daysSince(t.moveOut) ?? 0;
            const row: Row = {
              key: `settle-${t.id}`,
              accent: d > 30 ? "danger" : d > 14 ? "warn" : "info",
              label: "Deposit settlement pending",
              detail: `${t.name} · ${t.room} · moved out ${d}d ago`,
              href: `/admin/tenants/${t.id}`,
              sortKey: -d,
            };
            if (d > 30) older.push(row);
            else thisWeek.push(row);
          }

          // Sort each bucket by sortKey (urgent first).
          today.sort((a, b) => a.sortKey - b.sortKey);
          thisWeek.sort((a, b) => a.sortKey - b.sortKey);
          older.sort((a, b) => a.sortKey - b.sortKey);

          return (
            <div className="space-y-3">
              <ActionBucket title="Today" items={today} emptyDone />
              <ActionBucket title="This week" items={thisWeek} emptyDone />
              <ActionBucket title="Older" items={older} />
            </div>
          );
        })()}
      </div>

      {/* Notice pipeline — revenue at risk in next 90 days */}
      {noticePipeline.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold">Notice pipeline · next 90 days</h2>
              <p className="text-xs text-gray mt-0.5">
                Kündigungen wo noch <strong>kein Nachmieter</strong> gefunden
                ist — planbare Einnahmen-Lücken.
              </p>
            </div>
            <div className="text-xs text-gray tabular-nums">
              €
              {(
                noticePipeline.reduce((s, n) => s + n.monthlyRent, 0) / 100
              ).toLocaleString("de-DE")}{" "}
              MRR at risk
            </div>
          </div>
          <Card>
            <div className="divide-y divide-lightgray">
              {noticePipeline.map((n) => (
                <Link
                  key={n.id}
                  href={`/admin/tenants/${n.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-background-alt transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <LogOut className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-black truncate">
                        {n.name}
                      </div>
                      <div className="text-xs text-gray truncate">
                        {n.room} · leaves {fmtDate(n.moveOut)}
                        {n.daysAway <= 14 && (
                          <span className="ml-2 text-orange-600 font-medium">
                            in {n.daysAway}d
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs tabular-nums text-gray flex-shrink-0">
                    {fmtEuro(n.monthlyRent)}/mo
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Move-ins / Move-outs next 4 weeks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Move-ins · next 4 weeks"
            icon={<Calendar className="w-4 h-4" />}
          />
          <ScheduleList items={schedule.moveIns} emptyText="No move-ins in the next 4 weeks" />
        </Card>
        <Card>
          <CardHeader
            title="Move-outs · next 4 weeks"
            icon={<Calendar className="w-4 h-4" />}
          />
          <ScheduleList items={schedule.moveOuts} emptyText="No move-outs in the next 4 weeks" />
        </Card>
      </div>
    </div>
  );
}

// Categories bookable for 2 persons per product rule (CLAUDE.md §Booking).
const COUPLES_ALLOWED = new Set([
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "PREMIUM_PLUS_BALCONY",
]);

/** Group a sorted YYYY-MM-DD date list into contiguous segments.
 *  [2026-04-15..2026-04-29, 2026-08-01, 2026-09-01]
 *    → [[…14 days…], [2026-08-01], [2026-09-01]]
 *  Two consecutive days are part of the same segment; any gap ≥ 2 days
 *  starts a new one. Matches "each room has its own 14-day flex window"
 *  semantics. */
function splitContiguousDates(sorted: string[]): string[][] {
  if (sorted.length === 0) return [];
  const segments: string[][] = [];
  let current: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diffDays === 1) {
      current.push(sorted[i]);
    } else {
      segments.push(current);
      current = [sorted[i]];
    }
  }
  segments.push(current);
  return segments;
}

/** Option A: flattened table of every (location, category) slot. Built
 *  for call-center UX — filter by city/persons/date, sort by price,
 *  copy-paste a one-liner into an email. */
function AvailabilityTable({
  locations,
  desiredDate,
  onDesiredDateChange,
  allBookableDates,
  today,
  cityFilter,
  onCityFilterChange,
  locationFilter,
  onLocationFilterChange,
  personsFilter,
  onPersonsFilterChange,
}: {
  locations: Dashboard["availabilityByLocation"];
  desiredDate: string;
  onDesiredDateChange: (v: string) => void;
  allBookableDates: string[];
  today: string;
  cityFilter: string;
  onCityFilterChange: (v: string) => void;
  locationFilter: string;
  onLocationFilterChange: (v: string) => void;
  personsFilter: 1 | 2;
  onPersonsFilterChange: (v: 1 | 2) => void;
}) {
  const [sortBy, setSortBy] = useState<"price" | "date">("date");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [filterBarHeight, setFilterBarHeight] = useState(48);

  useEffect(() => {
    if (!copiedKey) return;
    const t = setTimeout(() => setCopiedKey(null), 1500);
    return () => clearTimeout(t);
  }, [copiedKey]);

  // Measure filter bar height so thead can stick directly below it no
  // matter how the filters wrap on narrow screens. Use
  // getBoundingClientRect so the number includes padding + border —
  // contentRect excludes those and leaves a gap under the filter bar.
  useEffect(() => {
    const el = filterBarRef.current;
    if (!el) return;
    const measure = () =>
      setFilterBarHeight(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Total offset from viewport top = AdminShell navbar (h-14 = 56px) + filter bar
  const theadTop = 56 + filterBarHeight;

  // Flatten to rows — ONE row per contiguous booking segment. A category
  // with 3 separate fixed dates (e.g. 01.08 / 01.09 / 01.11) produces 3
  // rows, not a misleading "01.08 – 01.11" range. Multi-day segments
  // come from the 14-day flex window when a room frees up soon.
  type Row = {
    key: string;
    city: string;
    location: string;
    locationSlug: string;
    category: string;
    categoryRaw: string;
    price: number | null;
    couplesOK: boolean;
    segmentFirst: string;
    segmentLast: string;
    segmentDays: string[];
    isFlex: boolean;
  };

  const rows: Row[] = locations.flatMap((loc) =>
    loc.categories
      .filter((c) => c.bookableDates.length > 0)
      .flatMap((c) => {
        const segments = splitContiguousDates(c.bookableDates);
        return segments.map((seg, idx) => ({
          key: `${loc.slug}-${c.category}-${idx}`,
          city: loc.city,
          location: loc.name,
          locationSlug: loc.slug,
          category: formatCategory(c.category),
          categoryRaw: c.category,
          price: c.minPrice,
          couplesOK: COUPLES_ALLOWED.has(c.category),
          segmentFirst: seg[0],
          segmentLast: seg[seg.length - 1],
          segmentDays: seg,
          isFlex: seg.length > 1,
        }));
      })
  );

  const allCities = Array.from(new Set(locations.map((l) => l.city))).sort();

  // Apply filters
  let filtered = rows;
  if (cityFilter) filtered = filtered.filter((r) => r.city === cityFilter);
  if (locationFilter)
    filtered = filtered.filter((r) => r.location === locationFilter);
  if (personsFilter === 2) filtered = filtered.filter((r) => r.couplesOK);
  if (desiredDate)
    filtered = filtered.filter((r) => r.segmentDays.includes(desiredDate));

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "price") {
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    }
    return a.segmentFirst.localeCompare(b.segmentFirst);
  });

  function copyRow(r: Row) {
    const priceText =
      r.price !== null ? `€${Math.round(r.price / 100)}/Mo` : "—";
    const dateText = r.isFlex
      ? `ab ${fmtDate(r.segmentFirst)} flexibel bis ${fmtDate(r.segmentLast)}`
      : `ab ${fmtDate(r.segmentFirst)} (fix)`;
    const couplesText = personsFilter === 2 ? " · 2 Personen möglich" : "";
    const text = `STACEY ${r.location} · ${r.category} · ${priceText} · ${dateText}${couplesText}`;
    navigator.clipboard.writeText(text).then(() => setCopiedKey(r.key));
  }

  return (
    <div>
      {/* Sub-filters — sticky just below the AdminShell navbar */}
      <div
        ref={filterBarRef}
        className="flex items-center gap-3 flex-wrap sticky top-14 z-20 bg-background-alt/95 backdrop-blur-sm py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-lightgray/50"
      >
        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden text-xs">
          <button
            onClick={() => onCityFilterChange("")}
            className={`px-2.5 py-1 ${!cityFilter ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            All cities
          </button>
          {allCities.map((c) => (
            <button
              key={c}
              onClick={() => onCityFilterChange(c)}
              className={`px-2.5 py-1 border-l border-lightgray ${cityFilter === c ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            >
              {c}
            </button>
          ))}
        </div>
        {(() => {
          if (!cityFilter) return null;
          const locationsInCity = locations
            .filter((l) => l.city === cityFilter)
            .map((l) => l.name)
            .sort();
          if (locationsInCity.length <= 1) return null;
          return (
            <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden text-xs">
              <button
                onClick={() => onLocationFilterChange("")}
                className={`px-2.5 py-1 ${!locationFilter ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
              >
                All locations
              </button>
              {locationsInCity.map((name) => (
                <button
                  key={name}
                  onClick={() => onLocationFilterChange(name)}
                  className={`px-2.5 py-1 border-l border-lightgray ${locationFilter === name ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          );
        })()}
        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden text-xs">
          <button
            onClick={() => onPersonsFilterChange(1)}
            className={`px-2.5 py-1 ${personsFilter === 1 ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            title="Alle Kategorien (1 Person)"
          >
            1P
          </button>
          <button
            onClick={() => onPersonsFilterChange(2)}
            className={`px-2.5 py-1 border-l border-lightgray ${personsFilter === 2 ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            title="Nur Kategorien die 2 Personen erlauben (Jumbo, Jumbo Balcony, Studio, Premium+ Balcony)"
          >
            2P
          </button>
        </div>
        <div className="inline-flex items-center gap-2 ml-auto">
          <label className="text-xs text-gray">Move-in from</label>
          <select
            value={desiredDate}
            onChange={(e) => onDesiredDateChange(e.target.value)}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-xs bg-white"
          >
            <option value="">Show all</option>
            {allBookableDates.map((d) => (
              <option key={d} value={d}>
                {fmtDate(d)}
                {d <= today && " (today)"}
              </option>
            ))}
          </select>
          {desiredDate && (
            <button
              onClick={() => onDesiredDateChange("")}
              className="text-xs text-gray hover:text-black underline"
            >
              clear
            </button>
          )}
        </div>
        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden text-xs">
          <span className="px-2 py-1 bg-background-alt text-gray">Sort:</span>
          <button
            onClick={() => setSortBy("price")}
            className={`px-2.5 py-1 border-l border-lightgray ${sortBy === "price" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Price
          </button>
          <button
            onClick={() => setSortBy("date")}
            className={`px-2.5 py-1 border-l border-lightgray ${sortBy === "date" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Date
          </button>
        </div>
        <span className="text-xs text-gray">
          {filtered.length} slot{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="bg-white rounded-[5px] border border-lightgray mt-2">
        <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr className="border-b border-lightgray">
              <th
                className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide sticky bg-background-alt border-b border-lightgray z-10"
                style={{ top: theadTop }}
              >
                Location
              </th>
              <th
                className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide sticky bg-background-alt border-b border-lightgray z-10"
                style={{ top: theadTop }}
              >
                Category
              </th>
              <th
                className="px-3 py-2 text-right text-xs text-gray uppercase tracking-wide sticky bg-background-alt border-b border-lightgray z-10"
                style={{ top: theadTop }}
              >
                Price
              </th>
              <th
                className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide sticky bg-background-alt border-b border-lightgray z-10"
                style={{ top: theadTop }}
              >
                2P
              </th>
              <th
                className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide sticky bg-background-alt border-b border-lightgray z-10"
                style={{ top: theadTop }}
              >
                Bookable
              </th>
              <th
                className="px-3 py-2 sticky bg-background-alt border-b border-lightgray z-10"
                style={{ top: theadTop }}
              ></th>
            </tr>
          </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-gray"
                  >
                    No slots match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.key}
                    className="border-b border-lightgray/50 hover:bg-background-alt/40"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-black">{r.location}</div>
                      <div className="text-[11px] text-gray">{r.city}</div>
                    </td>
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-black">
                      {r.price !== null ? `€${Math.round(r.price / 100)}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.couplesOK ? (
                        <span className="text-green-700">✓</span>
                      ) : (
                        <span className="text-gray">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase tracking-wide ${r.isFlex ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {r.isFlex ? "flex" : "fix"}
                        </span>
                        <span className="text-xs tabular-nums">
                          {r.isFlex ? (
                            <>
                              {fmtDate(r.segmentFirst)} –{" "}
                              {fmtDate(r.segmentLast)}
                            </>
                          ) : (
                            fmtDate(r.segmentFirst)
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => copyRow(r)}
                          className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
                          title="Copy one-liner"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedKey === r.key ? "Copied" : "Copy"}
                        </button>
                        <a
                          href={`/locations/${r.locationSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
                          title="Open public location page (new tab)"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Page
                        </a>
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

function OccupancyCard({
  snapshots,
}: {
  snapshots: Dashboard["kpi"]["occupancy3Months"];
}) {
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-4">
      <div className="flex items-center gap-2 text-xs text-gray uppercase tracking-wide">
        <Home className="w-4 h-4" />
        Occupancy
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {snapshots.map((s, i) => (
          <div
            key={s.label}
            className={`${i < snapshots.length - 1 ? "border-r border-lightgray pr-2" : ""}`}
          >
            <div className="text-[10px] uppercase tracking-wide text-gray">
              {s.label}
            </div>
            <div className="text-xl font-bold text-black tabular-nums mt-0.5">
              {s.pct}%
            </div>
            <div className="text-[11px] text-gray tabular-nums mt-0.5">
              {s.occupied}/{s.total}
              {s.free > 0 && (
                <span className="text-orange-600"> · {s.free} free</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyRentCard({
  rent,
}: {
  rent: Dashboard["kpi"]["monthlyRent"];
}) {
  const pct =
    rent.expectedCents > 0
      ? Math.round((rent.collectedCents / rent.expectedCents) * 100)
      : 0;
  const allPaid = rent.openCents === 0 && rent.expectedCents > 0;
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-4">
      <div className="flex items-center gap-2 text-xs text-gray uppercase tracking-wide">
        <Wallet className="w-4 h-4" />
        Miete · {rent.monthLabel}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl font-bold text-black">
          {fmtEuro(rent.collectedCents)}
        </span>
        <span className="text-sm text-gray">
          / {fmtEuro(rent.expectedCents)}
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-lightgray rounded-[5px] overflow-hidden">
        <div
          className={`h-full ${allPaid ? "bg-green-600" : pct > 75 ? "bg-black" : pct > 40 ? "bg-orange-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="text-xs text-gray mt-1.5">
        {rent.expectedCents === 0 ? (
          "Keine Miete in diesem Monat fällig"
        ) : allPaid ? (
          "Alles eingezogen ✓"
        ) : (
          <>
            {fmtEuro(rent.openCents)} pending ·{" "}
            {rent.tenantsWithOpen} tenant
            {rent.tenantsWithOpen === 1 ? "" : "s"}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: "warn" | "ok";
  onClick?: () => void;
}) {
  const valueClass =
    accent === "warn"
      ? "text-orange-600"
      : accent === "ok"
        ? "text-green-700"
        : "text-black";
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`bg-white rounded-[5px] border border-lightgray p-4 text-left w-full transition-colors ${clickable ? "hover:border-black cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center gap-2 text-xs text-gray uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold mt-2 ${valueClass}`}>{value}</div>
      <div className="text-xs text-gray mt-1">{sub}</div>
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
      {children}
    </div>
  );
}

function ActionBucket({
  title,
  items,
  emptyDone,
}: {
  title: string;
  items: {
    key: string;
    accent: "info" | "warn" | "danger";
    label: string;
    detail: string;
    href: string;
  }[];
  /** When true and items is empty, render a cheerful "done" card instead
   *  of hiding the bucket. Good for "Today" / "This week" so admins see
   *  positive completion. */
  emptyDone?: boolean;
}) {
  if (items.length === 0) {
    if (!emptyDone) return null;
    return (
      <div>
        <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1.5 px-1">
          {title} · 0
        </div>
        <Card>
          <div className="px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <span className="text-base">✓</span> All caught up.
          </div>
        </Card>
      </div>
    );
  }
  const urgent = items.filter((i) => i.accent === "danger").length;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1.5 px-1 flex items-center gap-1.5">
        <span>
          {title} · {items.length}
        </span>
        {urgent > 0 && (
          <span className="normal-case tracking-normal text-red-600 font-semibold">
            ({urgent} urgent)
          </span>
        )}
      </div>
      <Card>
        <div className="divide-y divide-lightgray">
          {items.map((r) => (
            <ActionRow
              key={r.key}
              accent={r.accent}
              label={r.label}
              detail={r.detail}
              href={r.href}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Small inline overview of every action type we monitor with live
 *  counts. Gives admins a one-glance "what's being watched" without
 *  hunting through the buckets below. Zeros intentionally shown —
 *  seeing "0" confirms the system is checking. */
function ActionTypesLegend({
  items,
}: {
  items: Dashboard["actionItems"];
}) {
  const types: { label: string; count: number; accent: string }[] = [
    { label: "Deposit deadline", count: items.depositTimeoutSoon.length, accent: "bg-orange-100 text-orange-700" },
    { label: "2. Mahnung", count: items.dunningMahnung2.length, accent: "bg-red-100 text-red-700" },
    { label: "1. Mahnung", count: items.dunningMahnung1.length, accent: "bg-orange-100 text-orange-700" },
    { label: "Zahlungserinnerung", count: items.dunningReminder1.length, accent: "bg-yellow-100 text-yellow-700" },
    { label: "Failed rent", count: items.failedRents.length, accent: "bg-red-100 text-red-700" },
    { label: "No payment method", count: items.missingSepa.length, accent: "bg-orange-100 text-orange-700" },
    { label: "Settlement pending", count: items.settlementsPending.length, accent: "bg-blue-100 text-blue-700" },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {types.map((t) => (
        <span
          key={t.label}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] font-medium ${t.count > 0 ? t.accent : "bg-background-alt text-gray"}`}
          title={`${t.label} (${t.count})`}
        >
          {t.label}
          <span className="tabular-nums">{t.count}</span>
        </span>
      ))}
    </div>
  );
}

function CardHeader({
  title,
  icon,
}: {
  title: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-lightgray">
      <div className="flex items-center gap-2 font-semibold text-black text-sm">
        {icon}
        {title}
      </div>
    </div>
  );
}

function ActionRow({
  accent,
  label,
  detail,
  href,
}: {
  accent: "warn" | "danger" | "info";
  label: string;
  detail: string;
  href: string;
}) {
  const dotClass =
    accent === "danger"
      ? "bg-red-500"
      : accent === "warn"
        ? "bg-orange-400"
        : "bg-blue-400";
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 hover:bg-background-alt text-sm"
    >
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <div>
          <div className="font-medium text-black">{label}</div>
          <div className="text-xs text-gray">{detail}</div>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray" />
    </Link>
  );
}

function ScheduleList({
  items,
  emptyText,
}: {
  items: { id: string; name: string; date: string | null; room: string }[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-gray text-center">{emptyText}</div>
    );
  }
  return (
    <div className="divide-y divide-lightgray max-h-96 overflow-y-auto">
      {items.map((t) => (
        <Link
          key={t.id}
          href={`/admin/tenants/${t.id}`}
          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-background-alt"
        >
          <div>
            <div className="font-medium text-black">{t.name}</div>
            <div className="text-xs text-gray">{t.room}</div>
          </div>
          <div className="text-xs text-gray">{fmtDate(t.date)}</div>
        </Link>
      ))}
    </div>
  );
}
