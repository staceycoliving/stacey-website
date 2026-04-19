"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Copy,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

type Entry = {
  id: string;
  at: string;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  path: string | null;
  ip: string | null;
};

type ModuleCount = { name: string; count: number };

type EntityRef = { label: string; tenantId: string | null };

type Filters = {
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  search: string;
  from: string;
  to: string;
};

const MODULE_COLORS: Record<string, string> = {
  tenant: "bg-blue-100 text-blue-800",
  deposit: "bg-purple-100 text-purple-800",
  rooms: "bg-green-100 text-green-800",
  booking: "bg-yellow-100 text-yellow-800",
  rent: "bg-orange-100 text-orange-800",
  finance: "bg-pink-100 text-pink-800",
  housekeeping: "bg-cyan-100 text-cyan-800",
  auth: "bg-red-100 text-red-800",
  email: "bg-indigo-100 text-indigo-800",
};

// Action patterns that indicate destructive operations — highlighted in red.
const DESTRUCTIVE_PATTERNS = [
  /delete/i,
  /remove/i,
  /cancel/i,
  /reset/i,
  /archive\b/i, // not "unarchive"
  /hard_delete/i,
  /purge/i,
  /revoke/i,
];

function isDestructive(action: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((p) => p.test(action));
}

const ENTITY_TYPES = [
  "tenant",
  "booking",
  "rentPayment",
  "defect",
  "note",
  "extraCharge",
  "sentEmail",
  "room",
  "roomTransfer",
  "location",
] as const;

/* ─── Formatters ─────────────────────────────────────── */

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(key: string, todayKey: string, yesterdayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return new Date(key + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAction(action: string): string {
  // Turn "mark_paid" → "Mark paid", "patch_profile" → "Patch profile"
  return action
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/* ─── Entity deep-link helper ────────────────────────── */

function entityHref(
  entityType: string | null,
  entityId: string | null,
  ref: EntityRef | undefined
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "tenant":
      return `/admin/tenants/${entityId}`;
    case "booking":
      return ref?.tenantId
        ? `/admin/tenants/${ref.tenantId}?tab=lease`
        : "/admin/bookings";
    case "rentPayment":
      return ref?.tenantId
        ? `/admin/tenants/${ref.tenantId}?tab=payments`
        : null;
    case "defect":
      return ref?.tenantId
        ? `/admin/tenants/${ref.tenantId}?tab=deposit`
        : null;
    case "note":
      return ref?.tenantId
        ? `/admin/tenants/${ref.tenantId}?tab=timeline`
        : null;
    case "extraCharge":
      return ref?.tenantId
        ? `/admin/tenants/${ref.tenantId}?tab=payments`
        : null;
    case "sentEmail":
      return `/admin/emails`;
    default:
      return null;
  }
}

function entityLabel(
  entityType: string | null,
  entityId: string | null,
  ref: EntityRef | undefined
): string {
  if (!entityType || !entityId) return "—";
  if (ref) return ref.label;
  // Fallback: short id
  return `${entityType}/${entityId.slice(-8)}`;
}

/* ─── Main ───────────────────────────────────────────── */

export default function AuditPage({
  entries,
  entityRefs,
  modules,
  actions,
  stats,
  filters,
  pagination,
}: {
  entries: Entry[];
  entityRefs: Record<string, EntityRef>;
  modules: ModuleCount[];
  actions: string[];
  stats: { total: number; today: number; week: number };
  filters: Filters;
  pagination: { cursor: number; pageSize: number; hasMore: boolean };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [expanded, setExpanded] = useState<string | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Debounce search input — push to URL after user stops typing
  useEffect(() => {
    if (search === filters.search) return;
    const t = setTimeout(() => {
      navigate({ search, cursor: 0 });
    }, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(patch: Partial<Filters> & { cursor?: number }) {
    const next: Record<string, string> = {};
    const merged = { ...filters, ...patch };
    for (const key of [
      "module",
      "action",
      "entityType",
      "entityId",
      "search",
      "from",
      "to",
    ] as const) {
      const v = merged[key];
      if (v) next[key] = v;
    }
    if (patch.cursor && patch.cursor > 0) next.cursor = String(patch.cursor);
    const qs = new URLSearchParams(next).toString();
    router.push(`/admin/audit${qs ? `?${qs}` : ""}`);
  }

  function setDateRange(days: number | "today" | "yesterday" | null) {
    if (days === null) {
      navigate({ from: "", to: "", cursor: 0 });
      return;
    }
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    if (days === "today") {
      navigate({ from: end, to: end, cursor: 0 });
    } else if (days === "yesterday") {
      const y = new Date(now.getTime() - 86_400_000);
      const yIso = y.toISOString().slice(0, 10);
      navigate({ from: yIso, to: yIso, cursor: 0 });
    } else {
      const start = new Date(now.getTime() - days * 86_400_000)
        .toISOString()
        .slice(0, 10);
      navigate({ from: start, to: end, cursor: 0 });
    }
  }

  function clearAll() {
    router.push("/admin/audit");
  }

  function loadMore() {
    navigate({ cursor: pagination.cursor + pagination.pageSize });
  }

  // Export URL (inherits current filters, NO cursor — full filtered set up to 5000)
  function exportUrl() {
    const p = new URLSearchParams();
    for (const key of [
      "module",
      "action",
      "entityType",
      "entityId",
      "search",
      "from",
      "to",
    ] as const) {
      const v = filters[key];
      if (v) p.set(key, v);
    }
    return `/api/admin/audit/export${p.toString() ? `?${p}` : ""}`;
  }

  // Group entries by day
  const grouped = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = dayKey(e.at);
    const arr = grouped.get(k) ?? [];
    arr.push(e);
    grouped.set(k, arr);
  }
  const groupedEntries = Array.from(grouped.entries());
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const yesterdayKey = new Date(now.getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);

  const activeFilterCount =
    (filters.module ? 1 : 0) +
    (filters.action ? 1 : 0) +
    (filters.entityType ? 1 : 0) +
    (filters.entityId ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-black">Audit log</h1>
          <p className="text-sm text-gray mt-1">
            Every admin action tracked by{" "}
            <code className="text-xs">audit()</code>. Filter, search, group by
            day, and export for compliance.
          </p>
        </div>
        <a
          href={exportUrl()}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
          title="Download filtered events as CSV (max 5000 rows)"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Events (total)" value={stats.total.toLocaleString("de-DE")} />
        <Stat label="Today" value={stats.today.toString()} />
        <Stat label="Last 7 days" value={stats.week.toString()} />
        <Stat label="Modules" value={modules.length.toString()} />
      </div>

      {/* Module chips */}
      {modules.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <ModuleChip
            label="All modules"
            count={stats.total}
            active={!filters.module}
            onClick={() => navigate({ module: "", cursor: 0 })}
          />
          {modules.map((m) => (
            <ModuleChip
              key={m.name}
              label={m.name}
              count={m.count}
              active={filters.module === m.name}
              moduleName={m.name}
              onClick={() =>
                navigate({
                  module: filters.module === m.name ? "" : m.name,
                  cursor: 0,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Sticky filter bar */}
      <div
        ref={filterBarRef}
        className="sticky top-14 z-20 bg-white -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-y border-lightgray mb-3"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray pointer-events-none" />
            <input
              type="text"
              placeholder="Search action / summary / entity-ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
            />
          </div>

          {/* Action filter */}
          <select
            value={filters.action}
            onChange={(e) => navigate({ action: e.target.value, cursor: 0 })}
            className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {formatAction(a)}
              </option>
            ))}
          </select>

          {/* Entity-type filter */}
          <select
            value={filters.entityType}
            onChange={(e) =>
              navigate({ entityType: e.target.value, cursor: 0 })
            }
            className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Date inputs */}
          <input
            type="date"
            value={filters.from}
            onChange={(e) => navigate({ from: e.target.value, cursor: 0 })}
            className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
            title="From date"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => navigate({ to: e.target.value, cursor: 0 })}
            className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
            title="To date"
          />

          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
            >
              <X className="w-3 h-3" /> Clear all
              <span className="px-1.5 py-0 rounded-[3px] bg-gray-100 text-gray-700 text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>

        {/* Quick date ranges */}
        <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
          <span className="text-gray">Quick:</span>
          <QuickRange label="Today" onClick={() => setDateRange("today")} />
          <QuickRange
            label="Yesterday"
            onClick={() => setDateRange("yesterday")}
          />
          <QuickRange label="Last 7d" onClick={() => setDateRange(7)} />
          <QuickRange label="Last 30d" onClick={() => setDateRange(30)} />
          <QuickRange label="Last 90d" onClick={() => setDateRange(90)} />
          <QuickRange label="All" onClick={() => setDateRange(null)} />
        </div>

        {filters.entityId && (
          <div className="mt-2 text-xs text-gray inline-flex items-center gap-2 bg-pink/10 border border-pink/30 rounded-[5px] px-2 py-1">
            <span>
              Scoped to entity:{" "}
              <code className="font-mono">{filters.entityId}</code>
            </span>
            <button
              onClick={() => navigate({ entityId: "", cursor: 0 })}
              className="hover:text-black"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Grouped event list */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-[5px] border border-lightgray p-8 text-center text-sm text-gray">
          No audit entries match the current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedEntries.map(([key, dayEntries]) => (
            <DayGroup
              key={key}
              dayKey={key}
              label={dayLabel(key, todayKey, yesterdayKey)}
              entries={dayEntries}
              entityRefs={entityRefs}
              expanded={expanded}
              setExpanded={setExpanded}
              onEntityClick={(et, eid) => navigate({ entityId: eid, entityType: et ?? "", cursor: 0 })}
            />
          ))}

          {pagination.hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                className="px-4 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
              >
                Load more ({Math.max(0, stats.total - pagination.cursor - pagination.pageSize)} left)
              </button>
            </div>
          )}
          {!pagination.hasMore && pagination.cursor > 0 && (
            <div className="text-center text-xs text-gray py-2">
              End of log · {entries.length + pagination.cursor} of{" "}
              {stats.total} events shown
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Day group ──────────────────────────────────────── */

function DayGroup({
  dayKey: _dayKey,
  label,
  entries,
  entityRefs,
  expanded,
  setExpanded,
  onEntityClick,
}: {
  dayKey: string;
  label: string;
  entries: Entry[];
  entityRefs: Record<string, EntityRef>;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onEntityClick: (entityType: string | null, entityId: string) => void;
}) {
  const destructiveCount = entries.filter((e) => isDestructive(e.action)).length;

  return (
    <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
      <div className="px-4 py-2 bg-background-alt border-b border-lightgray text-xs font-semibold flex items-center gap-2">
        <span>{label}</span>
        <span className="text-gray font-normal">· {entries.length} event{entries.length === 1 ? "" : "s"}</span>
        {destructiveCount > 0 && (
          <span className="inline-flex items-center gap-1 text-red-700">
            <AlertTriangle className="w-3 h-3" />
            {destructiveCount} destructive
          </span>
        )}
      </div>
      <div>
        {entries.map((e) => (
          <EventRow
            key={e.id}
            entry={e}
            entityRef={
              e.entityType && e.entityId
                ? entityRefs[`${e.entityType}:${e.entityId}`]
                : undefined
            }
            expanded={expanded === e.id}
            onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
            onEntityClick={onEntityClick}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Event row ──────────────────────────────────────── */

function EventRow({
  entry: e,
  entityRef,
  expanded,
  onToggle,
  onEntityClick,
}: {
  entry: Entry;
  entityRef: EntityRef | undefined;
  expanded: boolean;
  onToggle: () => void;
  onEntityClick: (entityType: string | null, entityId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const destructive = isDestructive(e.action);
  const moduleTone =
    MODULE_COLORS[e.module] ?? "bg-gray-100 text-gray-800";
  const href = entityHref(e.entityType, e.entityId, entityRef);
  const entityText = entityLabel(e.entityType, e.entityId, entityRef);

  function copyEvent() {
    const text = JSON.stringify(
      {
        at: e.at,
        module: e.module,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        summary: e.summary,
        metadata: e.metadata,
      },
      null,
      2
    );
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Fragment>
      <div
        onClick={onToggle}
        className={`group px-4 py-2.5 border-b border-lightgray/50 last:border-b-0 cursor-pointer hover:bg-background-alt/50 flex items-start gap-3 ${
          destructive ? "border-l-4 border-l-red-400" : "border-l-4 border-l-transparent"
        }`}
      >
        <div className="mt-0.5 text-gray flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="text-xs text-gray w-12 flex-shrink-0 tabular-nums pt-0.5">
          {new Date(e.at).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase ${moduleTone}`}
            >
              {e.module}
            </span>
            {destructive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold uppercase bg-red-100 text-red-800">
                <AlertTriangle className="w-2.5 h-2.5" />
                Destructive
              </span>
            )}
            <span className="text-sm font-medium text-black">
              {formatAction(e.action)}
            </span>
            {e.entityType && e.entityId && (
              <>
                <span className="text-gray text-xs">·</span>
                <EntityLink
                  entityType={e.entityType}
                  entityId={e.entityId}
                  href={href}
                  label={entityText}
                  onFilter={(ev) => {
                    ev.stopPropagation();
                    onEntityClick(e.entityType, e.entityId!);
                  }}
                />
              </>
            )}
          </div>
          {e.summary && (
            <div className="text-xs text-gray mt-0.5 truncate">
              {e.summary}
            </div>
          )}
        </div>

        <button
          onClick={(ev) => {
            ev.stopPropagation();
            copyEvent();
          }}
          className="text-gray/60 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          title="Copy event JSON"
        >
          {copied ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-background-alt border-b border-lightgray/50 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Detail label="Audit ID">
              <code className="font-mono">{e.id}</code>
            </Detail>
            <Detail label="Path">
              {e.path ? (
                <code className="font-mono">{e.path}</code>
              ) : (
                <span className="text-gray">—</span>
              )}
            </Detail>
            <Detail label="IP">
              {e.ip ? (
                <code className="font-mono">{e.ip}</code>
              ) : (
                <span className="text-gray">—</span>
              )}
            </Detail>
          </div>

          {e.metadata && Object.keys(e.metadata).length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-gray mb-1 font-semibold">
                Metadata
              </div>
              <MetadataTable data={e.metadata} />
            </div>
          )}
        </div>
      )}
    </Fragment>
  );
}

/* ─── Entity link ────────────────────────────────────── */

function EntityLink({
  entityType,
  entityId,
  href,
  label,
  onFilter,
}: {
  entityType: string;
  entityId: string;
  href: string | null;
  label: string;
  onFilter: (ev: React.MouseEvent) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs min-w-0">
      <span className="text-gray font-mono">{entityType}</span>
      {href ? (
        <Link
          href={href}
          onClick={(ev) => ev.stopPropagation()}
          className="text-blue-700 hover:underline truncate max-w-[220px]"
        >
          {label} <ExternalLink className="inline w-2.5 h-2.5" />
        </Link>
      ) : (
        <span className="text-gray truncate max-w-[220px]">{label}</span>
      )}
      <button
        onClick={onFilter}
        className="text-gray/60 hover:text-black text-[10px]"
        title="Filter log by this entity"
      >
        [only this]
      </button>
    </span>
  );
}

/* ─── Metadata pretty table ──────────────────────────── */

function MetadataTable({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  return (
    <div className="border border-lightgray rounded-[5px] overflow-hidden bg-white">
      <table className="w-full text-xs">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-b border-lightgray/50 last:border-b-0">
              <td className="px-3 py-1.5 text-gray w-40 font-mono align-top">
                {k}
              </td>
              <td className="px-3 py-1.5 align-top">
                <MetadataValue keyName={k} value={v} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetadataValue({
  keyName,
  value,
}: {
  keyName: string;
  value: unknown;
}) {
  if (value === null || value === undefined) {
    return <span className="text-gray">—</span>;
  }
  // Heuristics: format known keys prettily
  if (typeof value === "number") {
    // Money-ish fields
    if (/cents?$|amount(?!Id)|total/i.test(keyName)) {
      return (
        <span className="tabular-nums">
          €{(value / 100).toLocaleString("de-DE", {
            minimumFractionDigits: 2,
          })}
          <span className="text-gray text-[10px] ml-1">({value} cents)</span>
        </span>
      );
    }
    return <span className="tabular-nums">{value}</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-green-700" : "text-red-600"}>
        {value ? "true" : "false"}
      </span>
    );
  }
  if (typeof value === "string") {
    // ISO date-like
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return (
          <span>
            {d.toLocaleString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            <span className="text-gray text-[10px] ml-1">({value})</span>
          </span>
        );
      }
    }
    // Long ID-ish — truncate
    if (value.length > 40) {
      return (
        <code
          className="font-mono break-all"
          title={value}
        >
          {value.slice(0, 40)}…
        </code>
      );
    }
    if (/^(tenantId|bookingId|roomId|rentPaymentId|defectId|noteId)$/i.test(
      keyName
    )) {
      return <code className="font-mono text-blue-700">{value}</code>;
    }
    return <span>{value}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <div className="space-y-1">
        {value.map((v, i) => (
          <div key={i} className="pl-2 border-l border-lightgray">
            <MetadataValue keyName={`${keyName}[${i}]`} value={v} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-0.5">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-gray font-mono">{k}:</span>
            <span className="flex-1 min-w-0">
              <MetadataValue keyName={k} value={v} />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <code className="font-mono">{String(value)}</code>;
}

/* ─── Small pieces ───────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-3">
      <p className="text-[11px] text-gray uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function ModuleChip({
  label,
  count,
  active,
  moduleName,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  moduleName?: string;
  onClick: () => void;
}) {
  const tone =
    moduleName && MODULE_COLORS[moduleName]
      ? MODULE_COLORS[moduleName]
      : "bg-gray-100 text-gray-700";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-xs font-medium ${
        active ? "bg-black text-white" : `${tone} hover:opacity-80`
      }`}
    >
      {label}
      <span
        className={`text-[10px] ${active ? "text-white/70" : "opacity-70"}`}
      >
        {count}
      </span>
    </button>
  );
}

function QuickRange({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
    >
      {label}
    </button>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase text-gray mb-0.5 font-semibold">
        {label}
      </div>
      <div className="text-xs">{children}</div>
    </div>
  );
}
