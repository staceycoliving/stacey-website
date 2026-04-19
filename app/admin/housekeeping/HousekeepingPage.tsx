"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  LayoutGrid,
  CalendarDays,
  LogIn,
  LogOut,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  StickyNote,
  ExternalLink,
  CalendarCheck,
} from "lucide-react";
import { Breadcrumbs, EmptyState } from "@/components/admin/ui";

type InspectionResult = "CLEAN" | "ISSUE";

type Task = {
  id: string | null;
  taskKey: string;
  taskType: "MOVE_IN" | "MOVE_OUT";
  date: string; // YYYY-MM-DD
  locationName: string;
  locationSlug: string | null;
  roomLabel: string;
  guestName: string;
  source: "LONG" | "SHORT";
  time: string | null; // HH:MM
  tenantId: string | null;
  apaleoReservationId: string | null;
  roomId: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  assignedTo: string | null;
  notes: string | null;
  inspectionResult: InspectionResult | null;
  inspectionNotes: string | null;
};

type Location = { id: string; slug: string; name: string };

const STATUS_LABEL: Record<Task["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

const STATUS_COLOR: Record<Task["status"], string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
};

function fmtDateLong(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function roomDeepLink(t: Task): string | null {
  if (t.source !== "LONG" || !t.roomId) return null;
  return `/admin/rooms?highlight=${t.roomId}`;
}

function guestDeepLink(t: Task): string | null {
  if (t.source === "LONG" && t.tenantId) return `/admin/tenants/${t.tenantId}`;
  return null;
}

export default function HousekeepingPage({
  date,
  view,
  tasks,
  locations,
  locationFilter,
  apaleoError,
}: {
  date: string;
  view: "day" | "week";
  tasks: Task[];
  locations: Location[];
  locationFilter: string;
  apaleoError: string | null;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const filtered = tasks.filter(
    (t) => !locationFilter || t.locationSlug === locationFilter
  );

  function navigate(next: {
    date?: string;
    location?: string;
    view?: "day" | "week";
  }) {
    const params = new URLSearchParams();
    params.set("date", next.date ?? date);
    const loc = next.location !== undefined ? next.location : locationFilter;
    if (loc) params.set("location", loc);
    const v = next.view ?? view;
    if (v === "week") params.set("view", "week");
    router.push(`/admin/housekeeping?${params.toString()}`);
  }

  return (
    <div>
      {/* Header + controls — hidden in print */}
      <div className="print:hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <Breadcrumbs items={[{ label: "Housekeeping" }]} />
                        <h1 className="text-2xl font-bold text-black">Housekeeping</h1>
            <p className="text-sm text-gray mt-1">
              {view === "day" ? fmtDateLong(date) : "Week starting " + fmtDateLong(date)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center border border-lightgray rounded-[5px] overflow-hidden">
              <button
                onClick={() => navigate({ view: "day" })}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                  view === "day" ? "bg-black text-white" : "hover:bg-background-alt"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Day
              </button>
              <button
                onClick={() => navigate({ view: "week" })}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                  view === "week" ? "bg-black text-white" : "hover:bg-background-alt"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Week
              </button>
            </div>
            {/* Date navigation */}
            <button
              onClick={() =>
                navigate({ date: shiftDate(date, view === "week" ? -7 : -1) })
              }
              className="p-1.5 border border-lightgray rounded-[5px] hover:bg-background-alt"
              aria-label={view === "week" ? "Previous week" : "Previous day"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => navigate({ date: e.target.value })}
              className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
            />
            {date !== today && (
              <button
                onClick={() => navigate({ date: today })}
                className="px-3 py-1 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
              >
                Today
              </button>
            )}
            <button
              onClick={() =>
                navigate({ date: shiftDate(date, view === "week" ? 7 : 1) })
              }
              className="p-1.5 border border-lightgray rounded-[5px] hover:bg-background-alt"
              aria-label={view === "week" ? "Next week" : "Next day"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <select
              value={locationFilter}
              onChange={(e) => navigate({ location: e.target.value })}
              className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="p-1.5 border border-lightgray rounded-[5px] hover:bg-background-alt"
              aria-label="Print"
              title="Print this view"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {apaleoError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-[5px] text-xs text-yellow-900">
            ⚠️ Could not load SHORT stay (apaleo) reservations: {apaleoError}
          </div>
        )}
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">
          Housekeeping —{" "}
          {view === "day" ? fmtDateLong(date) : "Week of " + fmtDateLong(date)}
        </h1>
      </div>

      {view === "week" ? (
        <WeekView
          date={date}
          tasks={filtered}
          onDayClick={(d) => navigate({ date: d, view: "day" })}
          onCellClick={(d, locSlug) =>
            navigate({ date: d, view: "day", location: locSlug })
          }
        />
      ) : (
        <DayView date={date} tasks={filtered} router={router} />
      )}
    </div>
  );
}

/* ─── Day view ─────────────────────────────────────────── */

function DayView({
  date,
  tasks,
  router,
}: {
  date: string;
  tasks: Task[];
  router: ReturnType<typeof useRouter>;
}) {
  const [working, setWorking] = useState<string | null>(null);

  // Group into (location, roomLabel) — each group renders as either a
  // Turnaround block (if same-day out+in on the same room) or single task.
  type Group = {
    key: string;
    locationName: string;
    locationSlug: string | null;
    roomLabel: string;
    moveOut: Task | null;
    moveIn: Task | null;
  };

  const groups = new Map<string, Group>();
  for (const t of tasks) {
    const key = `${t.locationSlug ?? t.locationName}::${t.roomLabel}`;
    const prev = groups.get(key) ?? {
      key,
      locationName: t.locationName,
      locationSlug: t.locationSlug,
      roomLabel: t.roomLabel,
      moveOut: null,
      moveIn: null,
    };
    if (t.taskType === "MOVE_OUT") prev.moveOut = t;
    else prev.moveIn = t;
    groups.set(key, prev);
  }

  // Filter groups: in day view we only want groups that have at least one
  // task on the current date.
  const groupList = Array.from(groups.values()).filter(
    (g) =>
      (g.moveOut && g.moveOut.date === date) ||
      (g.moveIn && g.moveIn.date === date)
  );

  // Group by location
  const byLocation = new Map<string, Group[]>();
  for (const g of groupList) {
    const arr = byLocation.get(g.locationName) ?? [];
    arr.push(g);
    byLocation.set(g.locationName, arr);
  }
  for (const arr of byLocation.values()) {
    // Turnarounds first (most operationally important), then singletons
    arr.sort((a, b) => {
      const aT = a.moveOut && a.moveIn ? 0 : 1;
      const bT = b.moveOut && b.moveIn ? 0 : 1;
      if (aT !== bT) return aT - bT;
      return a.roomLabel.localeCompare(b.roomLabel);
    });
  }

  // Stats across the day
  const allDayTasks = groupList.flatMap((g) =>
    [g.moveOut, g.moveIn].filter(Boolean) as Task[]
  );
  const counts = {
    total: allDayTasks.length,
    open: allDayTasks.filter((t) => t.status === "OPEN").length,
    inProgress: allDayTasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: allDayTasks.filter((t) => t.status === "DONE").length,
    turnarounds: groupList.filter((g) => g.moveOut && g.moveIn).length,
  };

  async function update(
    task: Task,
    patch: Partial<
      Pick<Task, "status" | "assignedTo" | "notes" | "inspectionResult" | "inspectionNotes">
    >
  ) {
    setWorking(task.taskKey);
    try {
      await fetch("/api/admin/housekeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskKey: task.taskKey,
          taskType: task.taskType,
          date: task.date,
          locationSlug: task.locationSlug,
          roomLabel: task.roomLabel,
          guestName: task.guestName,
          ...patch,
        }),
      });
      router.refresh();
    } finally {
      setWorking(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 print:hidden">
        <Stat label="Total" value={counts.total} />
        <Stat label="Turnarounds" value={counts.turnarounds} />
        <Stat label="Open" value={counts.open} tone={counts.open > 0 ? "warn" : "ok"} />
        <Stat label="In progress" value={counts.inProgress} />
        <Stat label="Done" value={counts.done} tone="ok" />
      </div>

      {groupList.length === 0 ? (
        <div className="bg-white rounded-[5px] border border-lightgray">
          <EmptyState
            icon={<CalendarCheck className="w-5 h-5" />}
            title="Nothing scheduled"
            description="No move-ins or move-outs on this day."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(byLocation.entries()).map(([locationName, items]) => (
            <div
              key={locationName}
              className="bg-white rounded-[5px] border border-lightgray overflow-hidden print:border-black"
            >
              <div className="px-4 py-2 bg-background-alt border-b border-lightgray text-sm font-semibold flex items-center justify-between">
                <span>{locationName}</span>
                <span className="text-xs text-gray font-normal">
                  {items.length} {items.length === 1 ? "room" : "rooms"}
                </span>
              </div>
              <div className="divide-y divide-lightgray">
                {items.map((g) => (
                  <GroupRow
                    key={g.key}
                    group={g}
                    busy={(k) => working === k}
                    onUpdate={update}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Single group row (turnaround or singleton) ───────── */

function GroupRow({
  group,
  busy,
  onUpdate,
}: {
  group: {
    key: string;
    locationName: string;
    locationSlug: string | null;
    roomLabel: string;
    moveOut: Task | null;
    moveIn: Task | null;
  };
  busy: (taskKey: string) => boolean;
  onUpdate: (
    task: Task,
    patch: Partial<
      Pick<Task, "status" | "assignedTo" | "notes" | "inspectionResult" | "inspectionNotes">
    >
  ) => Promise<void>;
}) {
  const isTurnaround = Boolean(group.moveOut && group.moveIn);

  return (
    <div
      className={`px-4 py-3 ${
        isTurnaround ? "bg-pink/5 border-l-4 border-l-pink" : ""
      } print:bg-white print:border-l-0`}
    >
      {/* Header row: room number + turnaround badge + time window */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <RoomLabel group={group} />
          {isTurnaround && (
            <span className="inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] uppercase tracking-wide bg-pink text-black font-semibold">
              Turnaround
            </span>
          )}
          {isTurnaround && group.moveOut!.time && group.moveIn!.time && (
            <span className="text-xs text-gray tabular-nums">
              out by {group.moveOut!.time} → in from {group.moveIn!.time}
            </span>
          )}
        </div>
      </div>

      {/* Stacked sub-rows */}
      <div className="space-y-2">
        {group.moveOut && (
          <TaskRow
            task={group.moveOut}
            kind="out"
            busy={busy(group.moveOut.taskKey)}
            onUpdate={onUpdate}
          />
        )}
        {group.moveIn && (
          <TaskRow
            task={group.moveIn}
            kind="in"
            busy={busy(group.moveIn.taskKey)}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
}

function RoomLabel({
  group,
}: {
  group: {
    locationName: string;
    locationSlug: string | null;
    roomLabel: string;
    moveOut: Task | null;
    moveIn: Task | null;
  };
}) {
  const sample = (group.moveOut ?? group.moveIn)!;
  const href = roomDeepLink(sample);
  if (href) {
    return (
      <Link
        href={href}
        className="font-semibold hover:underline flex items-center gap-1"
      >
        {group.roomLabel}
        <ExternalLink className="w-3 h-3 text-gray" />
      </Link>
    );
  }
  return <span className="font-semibold">{group.roomLabel}</span>;
}

/* ─── Individual task row ──────────────────────────────── */

function TaskRow({
  task,
  kind,
  busy,
  onUpdate,
}: {
  task: Task;
  kind: "in" | "out";
  busy: boolean;
  onUpdate: (
    task: Task,
    patch: Partial<
      Pick<Task, "status" | "assignedTo" | "notes" | "inspectionResult" | "inspectionNotes">
    >
  ) => Promise<void>;
}) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [inspectionNotes, setInspectionNotes] = useState(task.inspectionNotes ?? "");
  const [showNotes, setShowNotes] = useState(Boolean(task.notes));
  const isOut = kind === "out";

  const guestHref = guestDeepLink(task);

  function cycleStatus() {
    // Open → InProgress → Done. Going from Done back requires explicit reset.
    const next =
      task.status === "OPEN"
        ? "IN_PROGRESS"
        : task.status === "IN_PROGRESS"
        ? "DONE"
        : null;
    if (!next) return;
    onUpdate(task, { status: next });
  }

  function resetStatus() {
    if (
      window.confirm(
        `Re-open ${task.taskType === "MOVE_OUT" ? "move-out" : "move-in"} for ${task.guestName}?`
      )
    ) {
      onUpdate(task, { status: "OPEN" });
    }
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-start text-sm print:items-center">
      {/* Type icon + label */}
      <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
        {isOut ? (
          <LogOut className="w-4 h-4 text-orange-600 flex-shrink-0" />
        ) : (
          <LogIn className="w-4 h-4 text-green-600 flex-shrink-0" />
        )}
        <div>
          <div className="text-xs font-semibold uppercase">
            {isOut ? "Move out" : "Move in"}
          </div>
          <div className="text-xs text-gray tabular-nums">
            {task.time ? (isOut ? `by ${task.time}` : `from ${task.time}`) : ""} ·{" "}
            {task.source}
          </div>
        </div>
      </div>

      {/* Guest name (+ deep link) */}
      <div className="col-span-12 sm:col-span-3">
        {guestHref ? (
          <Link
            href={guestHref}
            className="font-medium hover:underline flex items-center gap-1"
          >
            {task.guestName || "—"}
            <ExternalLink className="w-3 h-3 text-gray flex-shrink-0" />
          </Link>
        ) : (
          <span className="font-medium">{task.guestName || "—"}</span>
        )}
      </div>

      {/* Inspection (move-out only) */}
      <div className="col-span-12 sm:col-span-4">
        {isOut ? (
          <InspectionControl
            task={task}
            inspectionNotes={inspectionNotes}
            setInspectionNotes={setInspectionNotes}
            onUpdate={onUpdate}
          />
        ) : (
          <div className="text-xs text-gray italic">Prep room for arrival</div>
        )}
      </div>

      {/* Notes toggle */}
      <div className="col-span-8 sm:col-span-2">
        {!showNotes && !notes ? (
          <button
            onClick={() => setShowNotes(true)}
            className="text-xs text-gray hover:text-black flex items-center gap-1 print:hidden"
          >
            <StickyNote className="w-3 h-3" /> Add note
          </button>
        ) : (
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() =>
              notes !== (task.notes ?? "") && onUpdate(task, { notes })
            }
            placeholder="Notes..."
            className="w-full px-2 py-1 border border-lightgray rounded-[5px] text-xs"
          />
        )}
      </div>

      {/* Status button */}
      <div className="col-span-4 sm:col-span-1 flex justify-end items-center gap-1 print:hidden">
        {task.status === "DONE" ? (
          <button
            onClick={resetStatus}
            disabled={busy}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-[5px] text-xs font-semibold disabled:opacity-50 ${STATUS_COLOR[task.status]}`}
            title="Click to re-open"
          >
            {STATUS_LABEL[task.status]}
            <RotateCcw className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={cycleStatus}
            disabled={busy}
            className={`inline-block px-2 py-1 rounded-[5px] text-xs font-semibold disabled:opacity-50 ${STATUS_COLOR[task.status]}`}
            title="Click to advance status"
          >
            {STATUS_LABEL[task.status]}
          </button>
        )}
      </div>

      {/* Print-only status label */}
      <div className="col-span-4 hidden print:block">
        <span className="text-xs">☐ {STATUS_LABEL[task.status]}</span>
      </div>
    </div>
  );
}

/* ─── Inspection control (move-out only) ───────────────── */

function InspectionControl({
  task,
  inspectionNotes,
  setInspectionNotes,
  onUpdate,
}: {
  task: Task;
  inspectionNotes: string;
  setInspectionNotes: (v: string) => void;
  onUpdate: (
    task: Task,
    patch: Partial<
      Pick<Task, "status" | "assignedTo" | "notes" | "inspectionResult" | "inspectionNotes">
    >
  ) => Promise<void>;
}) {
  const result = task.inspectionResult;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() =>
            onUpdate(task, {
              inspectionResult: result === "CLEAN" ? null : "CLEAN",
            })
          }
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-[5px] text-xs font-semibold border ${
            result === "CLEAN"
              ? "bg-green-100 text-green-800 border-green-300"
              : "bg-white text-gray border-lightgray hover:bg-background-alt"
          }`}
        >
          <Sparkles className="w-3 h-3" /> Clean
        </button>
        <button
          onClick={() =>
            onUpdate(task, {
              inspectionResult: result === "ISSUE" ? null : "ISSUE",
            })
          }
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-[5px] text-xs font-semibold border ${
            result === "ISSUE"
              ? "bg-red-100 text-red-800 border-red-300"
              : "bg-white text-gray border-lightgray hover:bg-background-alt"
          }`}
        >
          <AlertTriangle className="w-3 h-3" /> Issue
        </button>
        {result === "ISSUE" && task.tenantId && (
          <Link
            href={`/admin/tenants/${task.tenantId}?tab=settlement`}
            className="ml-1 text-xs text-black underline hover:no-underline"
            title="Create Defect in folio"
          >
            → Defect
          </Link>
        )}
      </div>
      {result === "ISSUE" && (
        <input
          type="text"
          value={inspectionNotes}
          onChange={(e) => setInspectionNotes(e.target.value)}
          onBlur={() =>
            inspectionNotes !== (task.inspectionNotes ?? "") &&
            onUpdate(task, { inspectionNotes })
          }
          placeholder="What's the issue? (stain, damage, missing...)"
          className="w-full px-2 py-1 border border-red-200 bg-red-50 rounded-[5px] text-xs"
        />
      )}
    </div>
  );
}

/* ─── Week view ────────────────────────────────────────── */

function WeekView({
  date,
  tasks,
  onDayClick,
  onCellClick,
}: {
  date: string;
  tasks: Task[];
  onDayClick: (d: string) => void;
  onCellClick: (d: string, locSlug: string) => void;
}) {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(shiftDate(date, i));

  // Unique locations present in the week's tasks, sorted
  const locationMap = new Map<string, string>(); // slug → name
  for (const t of tasks) {
    if (t.locationSlug) locationMap.set(t.locationSlug, t.locationName);
  }
  const locs = Array.from(locationMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1])
  );

  // Count moves per (day, loc) + classify turnarounds
  function cellStats(day: string, locSlug: string) {
    const dayTasks = tasks.filter(
      (t) => t.date === day && t.locationSlug === locSlug
    );
    // Group by roomLabel to detect turnarounds
    const roomMap = new Map<string, { out: boolean; in: boolean }>();
    for (const t of dayTasks) {
      const prev = roomMap.get(t.roomLabel) ?? { out: false, in: false };
      if (t.taskType === "MOVE_OUT") prev.out = true;
      else prev.in = true;
      roomMap.set(t.roomLabel, prev);
    }
    let turnarounds = 0;
    let outsOnly = 0;
    let insOnly = 0;
    for (const v of roomMap.values()) {
      if (v.out && v.in) turnarounds++;
      else if (v.out) outsOnly++;
      else insOnly++;
    }
    const done = dayTasks.filter((t) => t.status === "DONE").length;
    return {
      total: dayTasks.length,
      turnarounds,
      outsOnly,
      insOnly,
      done,
    };
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 bg-background-alt border border-lightgray font-semibold min-w-[140px]">
              Location
            </th>
            {days.map((d) => (
              <th
                key={d}
                className="p-2 bg-background-alt border border-lightgray font-semibold text-xs"
              >
                <button
                  onClick={() => onDayClick(d)}
                  className="hover:underline"
                  title="Open day view"
                >
                  {fmtDateShort(d)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {locs.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="p-6 text-center text-sm text-gray bg-white border border-lightgray"
              >
                No moves scheduled for this week.
              </td>
            </tr>
          ) : (
            locs.map(([slug, name]) => (
              <tr key={slug}>
                <td className="p-2 border border-lightgray font-medium bg-white">
                  {name}
                </td>
                {days.map((d) => {
                  const s = cellStats(d, slug);
                  if (s.total === 0)
                    return (
                      <td
                        key={d}
                        className="p-2 border border-lightgray bg-white text-center text-xs text-gray"
                      >
                        —
                      </td>
                    );
                  return (
                    <td
                      key={d}
                      className="p-0 border border-lightgray bg-white"
                    >
                      <button
                        onClick={() => onCellClick(d, slug)}
                        className="w-full h-full p-2 text-left hover:bg-background-alt"
                      >
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {s.turnarounds > 0 && (
                            <span className="px-1.5 py-0.5 rounded-[3px] bg-pink text-black font-semibold">
                              {s.turnarounds}T
                            </span>
                          )}
                          {s.outsOnly > 0 && (
                            <span className="px-1.5 py-0.5 rounded-[3px] bg-orange-100 text-orange-800 font-semibold">
                              {s.outsOnly} out
                            </span>
                          )}
                          {s.insOnly > 0 && (
                            <span className="px-1.5 py-0.5 rounded-[3px] bg-green-100 text-green-800 font-semibold">
                              {s.insOnly} in
                            </span>
                          )}
                        </div>
                        {s.done > 0 && (
                          <div className="text-[10px] text-gray mt-1 tabular-nums">
                            {s.done}/{s.total} done
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="text-xs text-gray mt-3">
        <span className="font-semibold">T</span> = turnaround (same-day out + in)
        · click a cell to open the day view for that location.
      </p>
    </div>
  );
}

/* ─── Stat card ────────────────────────────────────────── */

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "ok" ? "text-green-600" : tone === "warn" ? "text-orange-600" : "text-black";
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-3">
      <p className="text-[10px] text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}
