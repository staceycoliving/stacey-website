"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Task = {
  id: string | null;
  taskKey: string;
  taskType: "MOVE_IN" | "MOVE_OUT";
  locationName: string;
  locationSlug: string | null;
  roomLabel: string;
  guestName: string;
  source: "LONG" | "SHORT";
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  assignedTo: string | null;
  notes: string | null;
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

const NEXT_STATUS: Record<Task["status"], Task["status"]> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "OPEN",
};

function fmtDateLong(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function HousekeepingPage({
  date,
  tasks,
  locations,
  locationFilter,
  apaleoError,
}: {
  date: string;
  tasks: Task[];
  locations: Location[];
  locationFilter: string;
  apaleoError: string | null;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [working, setWorking] = useState<string | null>(null);

  const filtered = tasks.filter(
    (t) => !locationFilter || t.locationSlug === locationFilter
  );

  // Group by location for cleaner reading
  const byLocation = new Map<string, Task[]>();
  for (const t of filtered) {
    const key = t.locationName;
    const arr = byLocation.get(key) ?? [];
    arr.push(t);
    byLocation.set(key, arr);
  }
  // Sort: MOVE_OUT before MOVE_IN within a location (turnaround flow)
  for (const arr of byLocation.values()) {
    arr.sort((a, b) => {
      if (a.taskType !== b.taskType) return a.taskType === "MOVE_OUT" ? -1 : 1;
      return a.roomLabel.localeCompare(b.roomLabel);
    });
  }

  const counts = {
    total: filtered.length,
    open: filtered.filter((t) => t.status === "OPEN").length,
    inProgress: filtered.filter((t) => t.status === "IN_PROGRESS").length,
    done: filtered.filter((t) => t.status === "DONE").length,
  };

  function navigate(newDate: string, newLocation?: string) {
    const params = new URLSearchParams();
    params.set("date", newDate);
    if (newLocation !== undefined ? newLocation : locationFilter) {
      params.set("location", newLocation ?? locationFilter);
    }
    router.push(`/admin/housekeeping?${params.toString()}`);
  }

  async function update(task: Task, patch: Partial<Pick<Task, "status" | "assignedTo" | "notes">>) {
    setWorking(task.taskKey);
    try {
      await fetch("/api/admin/housekeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskKey: task.taskKey,
          taskType: task.taskType,
          date,
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Housekeeping</h1>
          <p className="text-sm text-gray mt-1">{fmtDateLong(date)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate(shiftDate(date, -1))}
            className="p-1.5 border border-lightgray rounded-[5px] hover:bg-background-alt"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => navigate(e.target.value)}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
          />
          {date !== today && (
            <button
              onClick={() => navigate(today)}
              className="px-3 py-1 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
            >
              Today
            </button>
          )}
          <button
            onClick={() => navigate(shiftDate(date, 1))}
            className="p-1.5 border border-lightgray rounded-[5px] hover:bg-background-alt"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <select
            value={locationFilter}
            onChange={(e) => navigate(date, e.target.value)}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
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

      {apaleoError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-[5px] text-xs text-yellow-900">
          ⚠️ Could not load SHORT stay (apaleo) reservations: {apaleoError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Total" value={counts.total} />
        <Stat label="Open" value={counts.open} tone={counts.open > 0 ? "warn" : "ok"} />
        <Stat label="In progress" value={counts.inProgress} />
        <Stat label="Done" value={counts.done} tone="ok" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[5px] border border-lightgray p-6 text-center text-sm text-gray">
          No move-ins or move-outs on this day.
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(byLocation.entries()).map(([locationName, items]) => (
            <div
              key={locationName}
              className="bg-white rounded-[5px] border border-lightgray overflow-hidden"
            >
              <div className="px-4 py-2 bg-background-alt border-b border-lightgray text-sm font-semibold">
                {locationName} · {items.length} task{items.length === 1 ? "" : "s"}
              </div>
              <div className="divide-y divide-lightgray">
                {items.map((t) => (
                  <TaskRow
                    key={t.taskKey}
                    task={t}
                    busy={working === t.taskKey}
                    onCycleStatus={() => update(t, { status: NEXT_STATUS[t.status] })}
                    onAssignChange={(v) => update(t, { assignedTo: v })}
                    onNotesChange={(v) => update(t, { notes: v })}
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

function TaskRow({
  task,
  busy,
  onCycleStatus,
  onAssignChange,
  onNotesChange,
}: {
  task: Task;
  busy: boolean;
  onCycleStatus: () => void;
  onAssignChange: (v: string) => void;
  onNotesChange: (v: string) => void;
}) {
  const [assigned, setAssigned] = useState(task.assignedTo ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");

  return (
    <div className="px-4 py-3 grid grid-cols-12 gap-3 items-start text-sm">
      <div className="col-span-12 sm:col-span-2">
        <div className="text-xs text-gray uppercase">{task.taskType.replace("_", " ")}</div>
        <div className="text-xs text-gray">{task.source}</div>
      </div>
      <div className="col-span-12 sm:col-span-2">
        <div className="font-semibold">{task.roomLabel}</div>
      </div>
      <div className="col-span-12 sm:col-span-3">
        <div className="font-medium">{task.guestName || "—"}</div>
      </div>
      <div className="col-span-6 sm:col-span-2">
        <input
          type="text"
          value={assigned}
          onChange={(e) => setAssigned(e.target.value)}
          onBlur={() => assigned !== (task.assignedTo ?? "") && onAssignChange(assigned)}
          placeholder="Assigned to..."
          className="w-full px-2 py-1 border border-lightgray rounded-[5px] text-xs"
        />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (task.notes ?? "") && onNotesChange(notes)}
          placeholder="Notes..."
          className="w-full px-2 py-1 border border-lightgray rounded-[5px] text-xs"
        />
      </div>
      <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
        <button
          onClick={onCycleStatus}
          disabled={busy}
          className={`inline-block px-2 py-1 rounded-[5px] text-xs font-semibold disabled:opacity-50 ${STATUS_COLOR[task.status]}`}
          title="Click to advance status"
        >
          {STATUS_LABEL[task.status]}
        </button>
      </div>
    </div>
  );
}

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
    <div className="bg-white rounded-[5px] border border-lightgray p-4">
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}
