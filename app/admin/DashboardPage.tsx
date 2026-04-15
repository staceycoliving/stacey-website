"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Home, Calendar, ArrowRight, ClipboardList } from "lucide-react";

type Dashboard = {
  kpi: {
    occupancy: {
      occupied: number;
      total: number;
      pct: number;
    };
    openRentAmount: number;
    totalActionItems: number;
  };
  availabilityByLocation: {
    name: string;
    slug: string;
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
  };
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
  const { kpi, availabilityByLocation, actionItems, schedule } = data;
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
        <KpiCard
          icon={<Home className="w-4 h-4" />}
          label="Occupancy"
          value={`${kpi.occupancy.pct}%`}
          sub={`${kpi.occupancy.occupied} / ${kpi.occupancy.total} rooms`}
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Open rent"
          value={fmtEuro(kpi.openRentAmount)}
          sub={kpi.openRentAmount > 0 ? "Pending + failed" : "All up to date"}
          accent={kpi.openRentAmount > 0 ? "warn" : "ok"}
        />
        <KpiCard
          icon={<ClipboardList className="w-4 h-4" />}
          label="Action items"
          value={String(kpi.totalActionItems)}
          sub={kpi.totalActionItems > 0 ? "Click to review" : "All clear"}
          accent={kpi.totalActionItems > 0 ? "warn" : "ok"}
          onClick={kpi.totalActionItems > 0 ? scrollToActions : undefined}
        />
      </div>

      {/* Occupancy + availability per location */}
      <div>
        <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              Occupancy & availability
            </h2>
            <p className="text-xs text-gray mt-0.5">
              For team calls — pick the caller&apos;s desired move-in date to see matching slots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray">Move-in from</label>
            <select
              value={desiredDate}
              onChange={(e) => setDesiredDate(e.target.value)}
              className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
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
                onClick={() => setDesiredDate("")}
                className="text-xs text-gray hover:text-black underline"
              >
                clear
              </button>
            )}
          </div>
        </div>
        {(() => {
          // If a specific date is selected, hide locations with zero matching categories.
          const visibleLocations = desiredDate
            ? availabilityByLocation.filter((loc) =>
                loc.categories.some((c) => c.bookableDates.includes(desiredDate))
              )
            : availabilityByLocation;

          if (visibleLocations.length === 0) {
            return (
              <div className="bg-white rounded-[5px] border border-lightgray p-6 text-center text-sm text-gray">
                No category is bookable on {fmtDate(desiredDate)}. Try another date.
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {visibleLocations.map((loc) => (
                <LocationAvailabilityCard
                  key={loc.slug}
                  loc={loc}
                  desiredDate={desiredDate}
                />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Action Items */}
      <div ref={actionRef}>
        <h2 className="text-sm font-semibold mb-3">
          Action items
          {kpi.totalActionItems > 0 && ` · ${kpi.totalActionItems}`}
        </h2>
        <Card>
          <div className="divide-y divide-lightgray">
            {kpi.totalActionItems === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray">
                All clear. ✨
              </div>
            )}

            {actionItems.depositTimeoutSoon.map((b) => {
              const h = hoursUntil(b.deadline);
              return (
                <ActionRow
                  key={`dep-${b.id}`}
                  accent="warn"
                  label="Deposit deadline soon"
                  detail={`${b.name} · ${h !== null ? `${h}h left` : ""}`}
                  href="/admin/bookings"
                />
              );
            })}

            {actionItems.failedRents.map((r) => (
              <ActionRow
                key={`rent-${r.id}`}
                accent="danger"
                label="Failed rent charge"
                detail={`${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)}${r.failureReason ? ` · ${r.failureReason}` : ""}`}
                href={`/admin/tenants/${r.tenantId}`}
              />
            ))}

            {actionItems.settlementsPending.map((t) => {
              const d = daysSince(t.moveOut);
              return (
                <ActionRow
                  key={`settle-${t.id}`}
                  accent={d !== null && d > 30 ? "danger" : d !== null && d > 14 ? "warn" : "info"}
                  label="Deposit settlement pending"
                  detail={`${t.name} · ${t.room} · moved out ${d}d ago`}
                  href={`/admin/tenants/${t.id}`}
                />
              );
            })}

            {actionItems.missingSepa.map((t) => (
              <ActionRow
                key={`sepa-${t.id}`}
                accent="warn"
                label="No payment method yet"
                detail={`${t.name} · ${t.room} · move-in ${fmtDate(t.moveIn)}`}
                href={`/admin/tenants/${t.id}`}
              />
            ))}
          </div>
        </Card>
      </div>

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

function LocationAvailabilityCard({
  loc,
  desiredDate,
}: {
  loc: Dashboard["availabilityByLocation"][number];
  desiredDate: string;
}) {
  // Filtered mode: only show categories bookable on the selected date.
  // Show-all mode: show every category.
  const visibleCategories = desiredDate
    ? loc.categories.filter((c) => c.bookableDates.includes(desiredDate))
    : loc.categories;

  return (
    <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
      <div className="px-4 py-3 border-b border-lightgray flex items-center justify-between">
        <div>
          <div className="font-semibold text-black text-sm">{loc.name}</div>
          <div className="text-xs text-gray mt-0.5">
            {loc.occupied} / {loc.total} occupied · {loc.pct}%
          </div>
        </div>
        <div className="w-20 h-1.5 bg-background-alt rounded-[5px] overflow-hidden">
          <div className="h-full bg-black" style={{ width: `${loc.pct}%` }} />
        </div>
      </div>
      {visibleCategories.length === 0 ? (
        <div className="px-4 py-4 text-xs text-gray">
          {loc.categories.length === 0 ? "No rooms" : "No category bookable on this date"}
        </div>
      ) : (
        <div className="divide-y divide-lightgray">
          {visibleCategories.map((c) => (
            <CategoryRow key={c.category} cat={c} desiredDate={desiredDate} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  cat,
  desiredDate,
}: {
  cat: Dashboard["availabilityByLocation"][number]["categories"][number];
  desiredDate: string;
}) {
  const isFiltered = desiredDate !== "";

  return (
    <div className="px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div>
          <div className="font-medium text-black">{formatCategory(cat.category)}</div>
          <div className="text-xs text-gray">
            {cat.total} rooms · from{" "}
            {cat.minPrice !== null ? `€${Math.round(cat.minPrice / 100)}` : "—"}/mo
            {cat.reservedByBooking > 0 && ` · ${cat.reservedByBooking} reserved`}
            {cat.indefinitelyBooked > 0 && ` · ${cat.indefinitelyBooked} open end`}
          </div>
        </div>
        {isFiltered && (
          <span className="inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold bg-green-100 text-green-700 whitespace-nowrap">
            Available
          </span>
        )}
      </div>
      {cat.earliestDates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cat.earliestDates.map((d) => {
            const highlight = isFiltered && d <= desiredDate;
            return (
              <DateChip key={d} date={d} tone={highlight ? "match" : "info"} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateChip({
  date,
  tone,
}: {
  date: string;
  tone: "match" | "info";
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const toneClass =
    tone === "match"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-background-alt text-gray border-lightgray";
  const label = date <= todayStr ? "Now" : fmtDate(date);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[5px] border text-xs tabular-nums ${toneClass}`}
    >
      {label}
    </span>
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
