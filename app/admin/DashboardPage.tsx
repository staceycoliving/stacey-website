"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  ArrowRight,
  ClipboardList,
  Wallet,
  LogOut,
  Copy,
  ExternalLink,
  CreditCard,
  Clock,
  BellRing,
  MailWarning,
  AlertOctagon,
  UserX,
  PiggyBank,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Send,
  Pin,
  Trash2,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type FunnelPerson = {
  id: string;
  name: string;
  email: string;
  moveInDate: string | null;
  daysInStage: number;
};

type FunnelStage = {
  stuckCount: number;
  oldestDays: number | null;
  medianDays: number | null;
  people: FunnelPerson[];
};

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
  vacancyPipeline: {
    id: string;
    kind: "vacant_now" | "leaving_soon";
    label: string;
    room: string;
    category: string;
    monthlyRent: number;
    moveOut: string | null;
    daysAway: number;
  }[];
  schedule: {
    moveIns: { id: string; name: string; date: string | null; room: string }[];
  };
  newBookings: {
    todayCount: number;
    todayFeesCollected: number;
    last30Count: number;
    last30FeesCollected: number;
  };
  funnel: {
    total: number;
    agreementSigned: number;
    bookingFeePaid: number;
    depositPaid: number;
    previousDepositRate: number | null;
    stages: {
      started: FunnelStage;
      signed: FunnelStage;
      feePaid: FunnelStage;
    };
  };
  openDefects: {
    id: string;
    description: string;
    amount: number;
    createdAt: string;
    photos: number;
    tenantId: string;
    tenantName: string;
    room: string;
    movedOut: boolean;
  }[];
  activityFeed: {
    id: string;
    at: string;
    module: string;
    action: string;
    summary: string | null;
    entityType: string | null;
    entityId: string | null;
  }[];
  teamNotes: {
    id: string;
    content: string;
    author: string | null;
    sticky: boolean;
    createdAt: string;
  }[];
  recentEmails: {
    id: string;
    templateKey: string;
    recipient: string;
    status: string;
    triggeredBy: string;
    sentAt: string;
    entityType: string | null;
    entityId: string | null;
  }[];
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
  const {
    kpi,
    availabilityByLocation,
    actionItems,
    schedule,
    vacancyPipeline,
    newBookings,
    funnel,
    openDefects,
    activityFeed,
    teamNotes,
    recentEmails,
  } = data;
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

  // Action-items UI state — persisted across reloads via localStorage
  const [hiddenTypes, setHiddenTypes] = useState<Set<ActionTypeKey>>(new Set());
  const [olderCollapsed, setOlderCollapsed] = useState<boolean>(true);

  // Stable "now" for render-time calculations. Using useState with a lazy
  // initializer keeps Date.now() out of the render body (React Compiler's
  // purity rule) while still reflecting roughly-current time.
  const [nowTs] = useState(() => Date.now());

  // Hydrate from localStorage on first render. Wrapped in try/catch so
  // server render / private-mode / quota errors don't break the page.
  useEffect(() => {
    try {
      const rawFilters = window.localStorage.getItem(LS_KEY_ACTION_FILTERS);
      if (rawFilters) {
        const parsed = JSON.parse(rawFilters) as string[];
        setHiddenTypes(new Set(parsed as ActionTypeKey[]));
      }
      const rawCollapsed = window.localStorage.getItem(LS_KEY_OLDER_COLLAPSED);
      if (rawCollapsed !== null) setOlderCollapsed(rawCollapsed === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleType(t: ActionTypeKey) {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      try {
        window.localStorage.setItem(
          LS_KEY_ACTION_FILTERS,
          JSON.stringify(Array.from(next))
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function setOlderCollapsedPersisted(v: boolean) {
    setOlderCollapsed(v);
    try {
      window.localStorage.setItem(LS_KEY_OLDER_COLLAPSED, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

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

      {/* KPI Cards: 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OccupancyCard snapshots={kpi.occupancy3Months} />
        <MonthlyRentCard rent={kpi.monthlyRent} />
        <NewBookingsCard newBookings={newBookings} />
        <KpiCard
          icon={<ClipboardList className="w-4 h-4" />}
          label="Action items"
          value={String(kpi.totalActionItems)}
          sub={kpi.totalActionItems > 0 ? "Click to review" : "All clear"}
          accent={kpi.totalActionItems > 0 ? "warn" : "ok"}
          onClick={kpi.totalActionItems > 0 ? scrollToActions : undefined}
        />
      </div>

      {/* Action Items — morning top priority (what must be done today) */}
      <div ref={actionRef}>
        <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold">
            Action items
            {kpi.totalActionItems > 0 && ` · ${kpi.totalActionItems}`}
          </h2>
          <ActionTypesLegend
            items={actionItems}
            hiddenTypes={hiddenTypes}
            onToggleType={toggleType}
          />
        </div>
        {(() => {
          // Bucket each item by urgency so the admin reads top-down.
          type RowAction =
            | { kind: "retryRent"; rentPaymentId: string }
            | { kind: "markSent"; rentPaymentId: string; stage: "reminder1" | "mahnung1" | "mahnung2" };
          type Row = {
            key: string;
            type: ActionTypeKey;
            accent: "info" | "warn" | "danger";
            label: string;
            detail: string;
            hoverDetail?: string;
            href: string;
            sortKey: number;
            tenantKey?: string;
            tenantName?: string;
            isNewToday?: boolean;
            actions?: RowAction[];
          };
          const today: Row[] = [];
          const thisWeek: Row[] = [];
          const older: Row[] = [];
          const ONE_DAY = 24 * 60 * 60 * 1000;

          // Deposit deadlines are always <24h per query → Today. Sort by
          // hours left ascending.
          for (const b of actionItems.depositTimeoutSoon) {
            const h = hoursUntil(b.deadline) ?? 99;
            today.push({
              key: `dep-${b.id}`,
              type: "depositDeadline",
              accent: "warn",
              label: "Deposit deadline soon",
              detail: `${b.name} · ${h}h left`,
              hoverDetail: `Kaution-Deadline läuft in ${h}h ab. Bei Nichtzahlung verfällt die Reservierung.`,
              href: "/admin/bookings",
              sortKey: h,
              tenantKey: `b-${b.id}`,
              tenantName: b.name,
              isNewToday: h <= 24,
            });
          }
          for (const r of actionItems.dunningMahnung2) {
            const daysOpen = Math.floor((nowTs - new Date(r.month).getTime()) / ONE_DAY);
            today.push({
              key: `m2-${r.id}`,
              type: "mahnung2",
              accent: "danger",
              label: "2. Mahnung + Kündigungsandrohung",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)} · ${daysOpen}d overdue`,
              hoverDetail: `Miete seit ${daysOpen} Tagen offen. Letzte Mahnungs-Stufe vor Kündigung.`,
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOpen,
              tenantKey: `t-${r.tenantId}`,
              tenantName: r.tenantName,
              isNewToday: daysOpen === 30,
              actions: [{ kind: "markSent", rentPaymentId: r.id, stage: "mahnung2" }],
            });
          }
          for (const r of actionItems.dunningMahnung1) {
            const daysOpen = Math.floor((nowTs - new Date(r.month).getTime()) / ONE_DAY);
            today.push({
              key: `m1-${r.id}`,
              type: "mahnung1",
              accent: "warn",
              label: "1. Mahnung due",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)} · ${daysOpen}d overdue`,
              hoverDetail: `Miete seit ${daysOpen} Tagen offen. Erste formelle Mahnung fällig.`,
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOpen + 100,
              tenantKey: `t-${r.tenantId}`,
              tenantName: r.tenantName,
              isNewToday: daysOpen === 14,
              actions: [{ kind: "markSent", rentPaymentId: r.id, stage: "mahnung1" }],
            });
          }
          for (const r of actionItems.dunningReminder1) {
            const daysOpen = Math.floor((nowTs - new Date(r.month).getTime()) / ONE_DAY);
            thisWeek.push({
              key: `r1-${r.id}`,
              type: "reminder1",
              accent: "info",
              label: "Zahlungserinnerung due",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)} · ${daysOpen}d open`,
              hoverDetail: `Freundliche Erinnerung. Mahnungs-Eskalation startet ab Tag 14.`,
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOpen,
              tenantKey: `t-${r.tenantId}`,
              tenantName: r.tenantName,
              isNewToday: daysOpen === 3,
              actions: [{ kind: "markSent", rentPaymentId: r.id, stage: "reminder1" }],
            });
          }
          for (const r of actionItems.failedRents) {
            const daysOld = Math.floor((nowTs - new Date(r.month).getTime()) / ONE_DAY);
            const row: Row = {
              key: `rent-${r.id}`,
              type: "failedRent",
              accent: "danger",
              label: "Failed rent charge",
              detail: `${r.tenantName} · ${fmtMonth(r.month)} · ${fmtEuro(r.amount)}${r.failureReason ? ` · ${r.failureReason}` : ""}`,
              hoverDetail: r.failureReason
                ? `Stripe-Grund: ${r.failureReason}`
                : "SEPA-Einzug fehlgeschlagen. Grund nicht geloggt.",
              href: `/admin/tenants/${r.tenantId}`,
              sortKey: -daysOld,
              tenantKey: `t-${r.tenantId}`,
              tenantName: r.tenantName,
              isNewToday: daysOld <= 1,
              actions: [{ kind: "retryRent", rentPaymentId: r.id }],
            };
            if (daysOld <= 30) today.push(row);
            else older.push(row);
          }
          for (const t of actionItems.missingSepa) {
            const days = Math.floor((new Date(t.moveIn).getTime() - nowTs) / ONE_DAY);
            const row: Row = {
              key: `pay-${t.id}`,
              type: "missingSepa",
              accent: "warn",
              label: "No payment method yet",
              detail: `${t.name} · ${t.room} · move-in ${fmtDate(t.moveIn)}`,
              hoverDetail: `Mieter zieht in ${days}d ein ohne Zahlungsmethode — erster Einzug schlägt fehl.`,
              href: `/admin/tenants/${t.id}`,
              sortKey: days,
              tenantKey: `t-${t.id}`,
              tenantName: t.name,
            };
            if (days <= 3) today.push(row);
            else thisWeek.push(row);
          }
          for (const t of actionItems.settlementsPending) {
            const d = daysSince(t.moveOut) ?? 0;
            const row: Row = {
              key: `settle-${t.id}`,
              type: "settlement",
              accent: d > 30 ? "danger" : d > 14 ? "warn" : "info",
              label: "Deposit settlement pending",
              detail: `${t.name} · ${t.room} · moved out ${d}d ago`,
              hoverDetail: `Mieter ausgezogen, Kaution-Settlement offen. Über /admin/deposits abrechnen.`,
              href: `/admin/tenants/${t.id}`,
              sortKey: -d,
              tenantKey: `t-${t.id}`,
              tenantName: t.name,
              isNewToday: d === 0,
            };
            if (d > 30) older.push(row);
            else thisWeek.push(row);
          }

          // Filter by hidden types + sort by urgency
          const filterAndSort = (rs: Row[]) =>
            rs
              .filter((r) => !hiddenTypes.has(r.type))
              .sort((a, b) => a.sortKey - b.sortKey);
          const todayFiltered = filterAndSort(today);
          const thisWeekFiltered = filterAndSort(thisWeek);
          const olderFiltered = filterAndSort(older);

          return (
            <div className="space-y-3">
              <ActionBucket title="Today" items={todayFiltered} emptyDone />
              <ActionBucket title="This week" items={thisWeekFiltered} emptyDone />
              <ActionBucket
                title="Older"
                items={olderFiltered}
                collapsed={olderCollapsed}
                onToggleCollapse={() => setOlderCollapsedPersisted(!olderCollapsed)}
              />
            </div>
          );
        })()}
      </div>

      {/* Team pinboard — shared notes for async coordination */}
      <PinboardSection notes={teamNotes} />

      {/* Vacancy pipeline — free rooms now + moveOuts in next 30 days */}
      {vacancyPipeline.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold">Vacancy pipeline · next 30 days</h2>
              <p className="text-xs text-gray mt-0.5">
                Freie Zimmer jetzt + Kündigungen ohne Nachmieter — planbare
                Einnahmen-Lücken.
              </p>
            </div>
            <div className="text-xs text-gray tabular-nums">
              €
              {(
                vacancyPipeline.reduce((s, n) => s + n.monthlyRent, 0) / 100
              ).toLocaleString("de-DE")}{" "}
              MRR at risk
            </div>
          </div>
          <Card>
            <div className="divide-y divide-lightgray max-h-96 overflow-y-auto">
              {vacancyPipeline.map((n) => {
                const isVacant = n.kind === "vacant_now";
                const href = isVacant
                  ? "/admin/rooms"
                  : `/admin/tenants/${n.id.replace(/^tenant-/, "")}`;
                return (
                  <Link
                    key={n.id}
                    href={href}
                    className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-background-alt transition-colors border-l-4 ${
                      isVacant ? "border-l-red-500" : "border-l-orange-400"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <LogOut
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isVacant ? "text-red-600" : "text-orange-600"}`}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-black truncate flex items-center gap-2">
                          {n.label}
                          {isVacant ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] uppercase tracking-wide bg-red-100 text-red-700 font-semibold">
                              Vacant now
                            </span>
                          ) : n.daysAway <= 14 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 font-semibold">
                              in {n.daysAway}d
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-gray truncate">
                          {n.room}
                          {isVacant
                            ? ""
                            : ` · leaves ${fmtDate(n.moveOut)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs tabular-nums text-gray flex-shrink-0">
                      {fmtEuro(n.monthlyRent)}/mo
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Booking conversion funnel — last 30 days */}
      <BookingFunnelSection funnel={funnel} />

      {/* Availability — reference for calls */}
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
            setLocationFilter("");
          }}
          locationFilter={locationFilter}
          onLocationFilterChange={setLocationFilter}
          personsFilter={personsFilter}
          onPersonsFilterChange={setPersonsFilter}
        />
      </div>

      {/* Open Defects — maintenance pipeline */}
      <OpenDefectsSection defects={openDefects} />

      {/* Upcoming move-ins next 4 weeks — operational heads-up */}
      <div>
        <h2 className="text-sm font-semibold mb-3">
          Upcoming move-ins · next 4 weeks
        </h2>
        <Card>
          <ScheduleList
            items={schedule.moveIns}
            emptyText="No move-ins in the next 4 weeks"
          />
        </Card>
      </div>

      {/* Recent emails — widget with quick link to full /admin/emails */}
      <RecentEmailsSection emails={recentEmails} />

      {/* Activity feed — last 15 admin actions across the team */}
      <ActivityFeedSection items={activityFeed} />
    </div>
  );
}

// Action-type metadata (icon + label + color). One source of truth for
// the legend, the row icon, and anything that needs a type lookup.
type ActionTypeKey =
  | "depositDeadline"
  | "mahnung2"
  | "mahnung1"
  | "reminder1"
  | "failedRent"
  | "missingSepa"
  | "settlement";

const ACTION_TYPE_META: Record<
  ActionTypeKey,
  { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  depositDeadline: {
    label: "Deposit deadline",
    icon: Clock,
    accent: "bg-orange-100 text-orange-700",
  },
  mahnung2: {
    label: "2. Mahnung",
    icon: AlertOctagon,
    accent: "bg-red-100 text-red-700",
  },
  mahnung1: {
    label: "1. Mahnung",
    icon: MailWarning,
    accent: "bg-orange-100 text-orange-700",
  },
  reminder1: {
    label: "Zahlungserinnerung",
    icon: BellRing,
    accent: "bg-yellow-100 text-yellow-700",
  },
  failedRent: {
    label: "Failed rent",
    icon: CreditCard,
    accent: "bg-red-100 text-red-700",
  },
  missingSepa: {
    label: "No payment method",
    icon: UserX,
    accent: "bg-orange-100 text-orange-700",
  },
  settlement: {
    label: "Settlement pending",
    icon: PiggyBank,
    accent: "bg-blue-100 text-blue-700",
  },
};

const LS_KEY_ACTION_FILTERS = "stacey-admin-action-filters-v1";
const LS_KEY_OLDER_COLLAPSED = "stacey-admin-older-collapsed-v1";

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

function NewBookingsCard({
  newBookings,
}: {
  newBookings: Dashboard["newBookings"];
}) {
  return (
    <Link
      href="/admin/bookings"
      className="bg-white rounded-[5px] border border-lightgray p-4 block hover:border-black transition-colors"
    >
      <div className="flex items-center gap-2 text-xs text-gray uppercase tracking-wide">
        <Sparkles className="w-4 h-4" />
        New bookings
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="border-r border-lightgray pr-2">
          <div className="text-[10px] uppercase tracking-wide text-gray">Today</div>
          <div className="text-xl font-bold text-black tabular-nums mt-0.5">
            {newBookings.todayCount}
          </div>
          <div className="text-[11px] text-gray tabular-nums mt-0.5">
            +{fmtEuro(newBookings.todayFeesCollected)} fees
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray">Last 30 days</div>
          <div className="text-xl font-bold text-black tabular-nums mt-0.5">
            {newBookings.last30Count}
          </div>
          <div className="text-[11px] text-gray tabular-nums mt-0.5">
            +{fmtEuro(newBookings.last30FeesCollected)} fees
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Booking conversion funnel for the last 30 days, with:
 *  - Subtitle showing current tenant-rate vs previous 30-day period.
 *  - Per-stage tooltip revealing oldest + median days stuck there.
 *  - Click a stage → expands a list of the people currently stuck in
 *    that stage, each with a quick action relevant to that stage
 *    (resend email / open booking). */
function BookingFunnelSection({
  funnel,
}: {
  funnel: Dashboard["funnel"];
}) {
  const router = useRouter();
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [busyPerson, setBusyPerson] = useState<string | null>(null);

  if (funnel.total === 0) return null;

  type Stage = {
    key: "started" | "signed" | "feePaid" | "depositPaid";
    label: string;
    count: number;
    // Only the first 3 stages have a stuck-list (the 4th is the done-state).
    stage: FunnelStage | null;
    // Which email template is most useful to push folks FROM this stage
    // to the next one. null → no email action, just "open" link.
    pushTemplate: string | null;
    isTerminal?: boolean;
  };
  const stages: Stage[] = [
    {
      key: "started",
      label: "Started",
      count: funnel.total,
      stage: funnel.stages.started,
      pushTemplate: null, // no fee reminder template yet — admin opens booking manually
    },
    {
      key: "signed",
      label: "Agreement signed",
      count: funnel.agreementSigned,
      stage: funnel.stages.signed,
      pushTemplate: null, // next step is Fee paid; we don't have a "pay the fee" reminder
    },
    {
      key: "feePaid",
      label: "Booking fee paid",
      count: funnel.bookingFeePaid,
      stage: funnel.stages.feePaid,
      pushTemplate: "deposit_reminder",
    },
    {
      key: "depositPaid",
      label: "Deposit paid",
      count: funnel.depositPaid,
      stage: null, // terminal — waiting for move-in is not a stuck state
      pushTemplate: null,
      isTerminal: true,
    },
  ];

  // Deposit-paid rate is the true conversion (last admin-influenced stage).
  const currentRate = funnel.total > 0 ? funnel.depositPaid / funnel.total : 0;
  const prevRate = funnel.previousDepositRate;
  const delta = prevRate !== null ? (currentRate - prevRate) * 100 : null;
  const trendLabel =
    delta === null
      ? null
      : delta > 0.5
        ? { text: `↑ ${delta.toFixed(0)}pp vs prev 30d`, cls: "text-green-700" }
        : delta < -0.5
          ? { text: `↓ ${Math.abs(delta).toFixed(0)}pp vs prev 30d`, cls: "text-red-600" }
          : { text: "flat vs prev 30d", cls: "text-gray" };

  async function sendPush(template: string, bookingId: string) {
    if (
      !confirm(
        `${template === "deposit_reminder" ? "Deposit reminder" : template} an diesen Mieter senden?`
      )
    )
      return;
    setBusyPerson(bookingId);
    try {
      const res = await fetch("/api/admin/emails/resend-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, templateKey: template }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`✓ Gesendet an ${data.sentTo}`);
        router.refresh();
      } else {
        alert(`Fehler: ${data.error ?? res.statusText}`);
      }
    } finally {
      setBusyPerson(null);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold">Booking funnel · last 30 days</h2>
        <div className="text-xs text-gray tabular-nums flex items-center gap-2">
          <span>
            <strong className="text-black">
              {Math.round(currentRate * 100)}%
            </strong>{" "}
            deposit-paid rate
          </span>
          {trendLabel && <span className={trendLabel.cls}>{trendLabel.text}</span>}
        </div>
      </div>
      <Card>
        <div className="p-4">
          <div className="flex items-stretch gap-1">
            {stages.map((s, i) => {
              const pct = funnel.total > 0 ? (s.count / funnel.total) * 100 : 0;
              const next = stages[i + 1];
              const dropOff =
                next && s.count > 0
                  ? Math.round(((s.count - next.count) / s.count) * 100)
                  : 0;
              const isOpen = openStage === s.key;
              const canExpand = !s.isTerminal && s.stage !== null;

              const tooltip = (() => {
                if (s.isTerminal) return "Done — waiting for move-in";
                if (!s.stage) return "";
                const parts: string[] = [];
                if (s.stage.stuckCount > 0) {
                  parts.push(`${s.stage.stuckCount} currently here`);
                }
                if (s.stage.oldestDays !== null) {
                  parts.push(`oldest ${s.stage.oldestDays}d`);
                }
                if (s.stage.medianDays !== null) {
                  parts.push(`median ${s.stage.medianDays}d`);
                }
                return parts.length > 0
                  ? parts.join(" · ")
                  : "Click to see people";
              })();

              // "% of started" — always relative to the top of the funnel so
              // it's easy to compare stages horizontally.
              const pctOfStarted =
                funnel.total > 0
                  ? Math.round((s.count / funnel.total) * 100)
                  : 0;

              const barContent = (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-gray truncate flex items-center gap-1">
                    {s.label}
                    {canExpand &&
                      (isOpen ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      ))}
                  </div>
                  <div
                    className={`mt-1 relative rounded-[5px] overflow-hidden ${
                      isOpen
                        ? "ring-2 ring-black"
                        : s.isTerminal
                          ? "bg-[#FCB0C0]/20"
                          : "bg-background-alt"
                    }`}
                    style={{ height: 36 }}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 ${s.isTerminal ? "bg-[#FCB0C0]" : "bg-black"}`}
                      style={{ width: `${pct}%` }}
                    />
                    <div
                      className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                        s.isTerminal ? "text-black" : "text-white mix-blend-difference"
                      }`}
                    >
                      {s.count}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray mt-0.5 tabular-nums flex items-center gap-1">
                    <span className="font-semibold text-black">
                      {pctOfStarted}%
                    </span>
                    <span>of started</span>
                    {s.stage && s.stage.stuckCount > 0 && (
                      <span className="ml-auto text-orange-600 font-medium">
                        {s.stage.stuckCount} stuck
                        {s.stage.medianDays !== null && ` · ~${s.stage.medianDays}d`}
                      </span>
                    )}
                    {s.isTerminal && (
                      <span className="ml-auto text-black font-medium">goal</span>
                    )}
                  </div>
                </>
              );

              if (!canExpand) {
                return (
                  <div
                    key={s.key}
                    className="flex-1 min-w-0 flex flex-col"
                    title={tooltip}
                  >
                    {barContent}
                  </div>
                );
              }
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    setOpenStage((v) => (v === s.key ? null : s.key))
                  }
                  className="flex-1 min-w-0 flex flex-col text-left cursor-pointer"
                  title={tooltip}
                >
                  {barContent}
                </button>
              );
            })}
          </div>

          {/* Expanded stage drawer — only for non-terminal stages */}
          {openStage && (() => {
            const s = stages.find((x) => x.key === openStage);
            if (!s || !s.stage) return null;
            if (s.stage.people.length === 0) {
              return (
                <div className="mt-4 pt-4 border-t border-lightgray text-sm text-gray">
                  Niemand in Stage &ldquo;{s.label}&rdquo; stuck. ✓
                </div>
              );
            }
            const stuck = s.stage.people.length;
            const total = s.count;
            const movedOn = Math.max(0, total - stuck);
            return (
              <div className="mt-4 pt-4 border-t border-lightgray">
                <div className="text-xs text-gray mb-2 px-1">
                  <strong className="text-black">{stuck} stuck</strong> here
                  {total > 0 && movedOn > 0 && (
                    <>
                      {" "}
                      · {movedOn} of {total} already moved on to the next stage
                    </>
                  )}
                </div>
                <div className="divide-y divide-lightgray/60 border border-lightgray/50 rounded-[5px]">
                  {s.stage.people.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-black truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-gray truncate">
                          {p.email}
                          {p.moveInDate && ` · move-in ${fmtDate(p.moveInDate)}`}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray tabular-nums flex-shrink-0">
                        {p.daysInStage}d
                      </div>
                      {s.pushTemplate && (
                        <button
                          onClick={() => sendPush(s.pushTemplate!, p.id)}
                          disabled={busyPerson === p.id}
                          className="px-2 py-1 text-xs rounded-[5px] border border-lightgray bg-white hover:border-black disabled:opacity-40"
                          title="Send reminder"
                        >
                          {busyPerson === p.id ? "…" : "Send reminder"}
                        </button>
                      )}
                      <Link
                        href="/admin/bookings"
                        className="p-1 text-gray hover:text-black"
                        aria-label="Open in bookings"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}

function OpenDefectsSection({
  defects,
}: {
  defects: Dashboard["openDefects"];
}) {
  if (defects.length === 0) return null;
  const totalAmount = defects.reduce((s, d) => s + d.amount, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold">Open defects · {defects.length}</h2>
        <span className="text-xs text-gray tabular-nums">
          Total deductions: {fmtEuro(totalAmount)}
        </span>
      </div>
      <Card>
        <div className="divide-y divide-lightgray">
          {defects.slice(0, 8).map((d) => (
            <Link
              key={d.id}
              href={`/admin/tenants/${d.tenantId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-background-alt"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-black truncate">
                  {d.description}
                </div>
                <div className="text-xs text-gray truncate">
                  {d.room} · {d.tenantName}
                  {d.movedOut && (
                    <span className="ml-2 text-orange-600">moved out</span>
                  )}
                  {d.photos > 0 && (
                    <span className="ml-2">· {d.photos} photo{d.photos === 1 ? "" : "s"}</span>
                  )}
                </div>
              </div>
              <div className="text-xs tabular-nums text-red-600 flex-shrink-0">
                −{fmtEuro(d.amount)}
              </div>
              <ArrowRight className="w-4 h-4 text-gray flex-shrink-0" />
            </Link>
          ))}
          {defects.length > 8 && (
            <div className="px-4 py-2 text-xs text-gray text-center">
              +{defects.length - 8} more
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/** Activity feed — last ~15 admin actions across the team. Uses the
 *  existing AuditLog rows. Gives the team visibility into what others
 *  are doing right now (reduces duplicate work / step-on-toes). */
function ActivityFeedSection({
  items,
}: {
  items: Dashboard["activityFeed"];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">Recent team activity</h2>
        <Link
          href="/admin/audit"
          className="text-xs text-gray hover:text-black"
        >
          Full audit log &rarr;
        </Link>
      </div>
      <Card>
        <div className="divide-y divide-lightgray max-h-96 overflow-y-auto">
          {items.map((a) => {
            const href = a.entityId
              ? a.entityType === "tenant"
                ? `/admin/tenants/${a.entityId}`
                : a.entityType === "booking"
                  ? `/admin/bookings`
                  : "/admin/audit"
              : "/admin/audit";
            return (
              <Link
                key={a.id}
                href={href}
                className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-background-alt"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-black truncate">
                    {a.summary ?? `${a.module} · ${a.action}`}
                  </div>
                  <div className="text-[11px] text-gray">
                    {a.module} · {a.action}
                  </div>
                </div>
                <div className="text-[11px] text-gray tabular-nums flex-shrink-0">
                  {relativeTime(a.at)}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/** Team pinboard — inline add/delete/sticky. Sticky notes float to top;
 *  otherwise newest first. Optimistic refresh via router.refresh(). */
function PinboardSection({ notes }: { notes: Dashboard["teamNotes"] }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem("stacey-admin-note-author") ?? "";
    } catch {
      return "";
    }
  });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/team-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author: author || undefined }),
      });
      if (res.ok) {
        setContent("");
        try {
          if (author) window.localStorage.setItem("stacey-admin-note-author", author);
        } catch {
          /* ignore */
        }
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleSticky(id: string, sticky: boolean) {
    await fetch(`/api/admin/team-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sticky: !sticky }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/admin/team-notes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">Team pinboard</h2>
        <span className="text-xs text-gray">{notes.length} notes</span>
      </div>
      <Card>
        {/* Add form */}
        <div className="p-3 border-b border-lightgray bg-background-alt/40">
          <div className="flex gap-2 items-start">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Name"
              className="w-24 px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
            />
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add();
              }}
              placeholder="Was soll das Team wissen?"
              className="flex-1 px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
            />
            <button
              onClick={add}
              disabled={saving || !content.trim()}
              className="px-3 py-1.5 rounded-[5px] bg-black text-white text-sm hover:bg-black/90 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
        {/* Notes list */}
        {notes.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray">
            Pinboard ist leer. Schreib was rein!
          </div>
        ) : (
          <div className="divide-y divide-lightgray">
            {notes.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-2.5 ${n.sticky ? "bg-yellow-50" : ""}`}
              >
                <button
                  onClick={() => void toggleSticky(n.id, n.sticky)}
                  className={`mt-1 ${n.sticky ? "text-orange-600" : "text-lightgray hover:text-gray"}`}
                  title={n.sticky ? "Un-pin" : "Pin (stick to top)"}
                >
                  <Pin className={`w-3.5 h-3.5 ${n.sticky ? "fill-current" : ""}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-black whitespace-pre-wrap break-words">
                    {n.content}
                  </div>
                  <div className="text-[11px] text-gray mt-0.5">
                    {n.author ? `${n.author} · ` : ""}
                    {relativeTime(n.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => void remove(n.id)}
                  className="text-gray hover:text-red-500 mt-1"
                  aria-label="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/** Dashboard widget for the last 10 emails. Full log + quick-send at
 *  /admin/emails. */
function RecentEmailsSection({
  emails,
}: {
  emails: Dashboard["recentEmails"];
}) {
  if (emails.length === 0) return null;
  const labelFor = (key: string) =>
    ({
      welcome: "Welcome",
      payment_setup: "Payment setup",
      rent_reminder: "Rent reminder",
      mahnung1: "1. Mahnung",
      mahnung2: "2. Mahnung",
      deposit_return: "Deposit settlement",
    })[key] ?? key;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">Recent emails</h2>
        <Link
          href="/admin/emails"
          className="text-xs text-gray hover:text-black"
        >
          Full log + quick-send &rarr;
        </Link>
      </div>
      <Card>
        <div className="divide-y divide-lightgray">
          {emails.map((e) => {
            const href =
              e.entityType === "tenant" && e.entityId
                ? `/admin/tenants/${e.entityId}`
                : "/admin/emails";
            return (
              <Link
                key={e.id}
                href={href}
                className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-background-alt"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {e.status === "sent" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-black truncate">
                      <span className="font-medium">{labelFor(e.templateKey)}</span>{" "}
                      <span className="text-gray">→ {e.recipient}</span>
                    </div>
                    {e.triggeredBy === "manual_resend" && (
                      <span className="text-[10px] text-blue-700">manual</span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-gray tabular-nums flex-shrink-0">
                  {relativeTime(e.sentAt)}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/** "3m ago", "2h ago", "yesterday" — compact timestamps for the feed. */
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
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

type ActionRowRich = {
  key: string;
  type: ActionTypeKey;
  accent: "info" | "warn" | "danger";
  label: string;
  detail: string;
  hoverDetail?: string;
  href: string;
  sortKey: number;
  tenantKey?: string;
  tenantName?: string;
  isNewToday?: boolean;
  actions?: (
    | { kind: "retryRent"; rentPaymentId: string }
    | { kind: "markSent"; rentPaymentId: string; stage: "reminder1" | "mahnung1" | "mahnung2" }
  )[];
};

function ActionBucket({
  title,
  items,
  emptyDone,
  collapsed,
  onToggleCollapse,
}: {
  title: string;
  items: ActionRowRich[];
  emptyDone?: boolean;
  /** Optional collapse support — when provided, renders a toggle chevron
   *  and hides the list until clicked. Used for "Older" bucket. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
            <Sparkles className="w-4 h-4" /> All caught up.
          </div>
        </Card>
      </div>
    );
  }
  const urgent = items.filter((i) => i.accent === "danger").length;
  const groups = groupRowsByTenant(items);
  const canCollapse = typeof onToggleCollapse === "function";
  const isCollapsed = canCollapse && collapsed;

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray font-semibold mb-1.5 px-1 flex items-center gap-1.5">
        {canCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex items-center gap-1 hover:text-black"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>
              {title} · {items.length}
            </span>
          </button>
        ) : (
          <span>
            {title} · {items.length}
          </span>
        )}
        {urgent > 0 && (
          <span className="normal-case tracking-normal text-red-600 font-semibold">
            ({urgent} urgent)
          </span>
        )}
      </div>
      {!isCollapsed && (
        <Card>
          <div className="divide-y divide-lightgray">
            {groups.map((g) =>
              g.rows.length === 1 ? (
                <ActionItemRow key={g.rows[0].key} row={g.rows[0]} />
              ) : (
                <GroupedTenantRows key={g.key} group={g} />
              )
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

/** Group rows by tenantKey. Groups with 2+ rows collapse visually into
 *  one header row per tenant that expands on click. */
function groupRowsByTenant(rows: ActionRowRich[]) {
  const map = new Map<string, ActionRowRich[]>();
  const ordered: string[] = [];
  for (const r of rows) {
    const key = r.tenantKey ?? r.key; // standalone if no tenantKey
    if (!map.has(key)) {
      map.set(key, []);
      ordered.push(key);
    }
    map.get(key)!.push(r);
  }
  return ordered.map((k) => ({
    key: k,
    rows: map.get(k)!,
    tenantName: map.get(k)![0].tenantName,
    // Most severe accent in the group
    worstAccent: map
      .get(k)!
      .reduce<"info" | "warn" | "danger">(
        (a, b) =>
          b.accent === "danger"
            ? "danger"
            : b.accent === "warn" && a !== "danger"
              ? "warn"
              : a,
        "info"
      ),
  }));
}

function GroupedTenantRows({
  group,
}: {
  group: {
    key: string;
    rows: ActionRowRich[];
    tenantName?: string;
    worstAccent: "info" | "warn" | "danger";
  };
}) {
  const [open, setOpen] = useState(false);
  const accent = group.worstAccent;
  const border =
    accent === "danger"
      ? "border-l-red-500"
      : accent === "warn"
        ? "border-l-orange-500"
        : "border-l-blue-400";
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-background-alt border-l-4 ${border}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-black truncate">
              {group.tenantName ?? "—"}
            </div>
            <div className="text-xs text-gray">
              {group.rows.length} issues · {group.rows.map((r) => ACTION_TYPE_META[r.type].label).join(" · ")}
            </div>
          </div>
        </div>
        <span className="text-xs text-gray">Expand</span>
      </button>
      {open && (
        <div className="bg-background-alt/30 divide-y divide-lightgray/60">
          {group.rows.map((r) => (
            <div key={r.key} className="pl-4">
              <ActionItemRow row={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A single action row. Renders icon, label, detail, new-today marker,
 *  inline action buttons, link-to-open arrow. */
function ActionItemRow({ row }: { row: ActionRowRich }) {
  const router = useRouter();
  const meta = ACTION_TYPE_META[row.type];
  const Icon = meta.icon;
  const [busy, setBusy] = useState(false);

  const borderClass =
    row.accent === "danger"
      ? "border-l-red-500"
      : row.accent === "warn"
        ? "border-l-orange-500"
        : "border-l-blue-400";

  async function runAction(
    a: NonNullable<ActionRowRich["actions"]>[number]
  ) {
    if (a.kind === "markSent") {
      const label =
        a.stage === "reminder1"
          ? "Zahlungserinnerung"
          : a.stage === "mahnung1"
            ? "1. Mahnung"
            : "2. Mahnung + Kündigungsandrohung";
      if (
        !confirm(
          `${label} als gesendet markieren? Du musst den Mieter separat informieren (Email / Brief).`
        )
      )
        return;
      setBusy(true);
      try {
        const res = await fetch(
          `/api/admin/rent-payments/${a.rentPaymentId}/dunning`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: a.stage }),
          }
        );
        if (res.ok) router.refresh();
        else {
          const data = await res.json().catch(() => ({}));
          alert(`Failed: ${data.error ?? res.statusText}`);
        }
      } finally {
        setBusy(false);
      }
    } else if (a.kind === "retryRent") {
      if (
        !confirm(
          "SEPA-Einzug erneut versuchen? Das löst eine neue Zahlungsanforderung aus."
        )
      )
        return;
      setBusy(true);
      try {
        const res = await fetch(
          `/api/admin/rent-payments/${a.rentPaymentId}/retry`,
          { method: "POST" }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          alert(data.message ?? "Retry ausgelöst.");
          router.refresh();
        } else {
          alert(`Failed: ${data.error ?? res.statusText}`);
        }
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 hover:bg-background-alt border-l-4 ${borderClass} relative`}
      title={row.hoverDetail}
    >
      <div className={`p-1.5 rounded-[5px] ${meta.accent} flex-shrink-0 mt-0.5`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-black">{row.label}</span>
          {row.isNewToday && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-[5px] bg-pink-100 text-pink-700 font-semibold">
              new
            </span>
          )}
        </div>
        <div className="text-xs text-gray mt-0.5 truncate">{row.detail}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {row.actions?.map((a, i) => {
          const label =
            a.kind === "retryRent" ? "Retry" : "Mark sent";
          const ActionIcon = a.kind === "retryRent" ? RotateCcw : Send;
          return (
            <button
              key={i}
              type="button"
              onClick={() => void runAction(a)}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-[5px] border border-lightgray bg-white hover:border-black disabled:opacity-40"
              title={label}
            >
              <ActionIcon className="w-3 h-3" />
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => router.push(row.href)}
          className="p-1 text-gray hover:text-black"
          aria-label="Open"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Small inline overview of every action type with live counts. Now
 *  clickable — clicking a badge hides items of that type. Hidden state
 *  is indicated with a strikethrough and persisted via localStorage. */
function ActionTypesLegend({
  items,
  hiddenTypes,
  onToggleType,
}: {
  items: Dashboard["actionItems"];
  hiddenTypes: Set<ActionTypeKey>;
  onToggleType: (t: ActionTypeKey) => void;
}) {
  const entries: { key: ActionTypeKey; count: number }[] = [
    { key: "depositDeadline", count: items.depositTimeoutSoon.length },
    { key: "mahnung2", count: items.dunningMahnung2.length },
    { key: "mahnung1", count: items.dunningMahnung1.length },
    { key: "reminder1", count: items.dunningReminder1.length },
    { key: "failedRent", count: items.failedRents.length },
    { key: "missingSepa", count: items.missingSepa.length },
    { key: "settlement", count: items.settlementsPending.length },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {entries.map((e) => {
        const meta = ACTION_TYPE_META[e.key];
        const hidden = hiddenTypes.has(e.key);
        const Icon = meta.icon;
        return (
          <button
            key={e.key}
            type="button"
            onClick={() => onToggleType(e.key)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] font-medium transition-opacity ${
              hidden
                ? "bg-background-alt text-gray line-through opacity-50"
                : e.count > 0
                  ? meta.accent
                  : "bg-background-alt text-gray"
            } hover:ring-1 hover:ring-black/20`}
            title={
              hidden
                ? `${meta.label} versteckt — klicken zum Einblenden`
                : `${meta.label} (${e.count}) — klicken zum Ausblenden`
            }
          >
            <Icon className="w-2.5 h-2.5" />
            {meta.label}
            <span className="tabular-nums">{e.count}</span>
          </button>
        );
      })}
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
