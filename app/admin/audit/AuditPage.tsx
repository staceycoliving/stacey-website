"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const MODULE_COLORS: Record<string, string> = {
  tenant: "bg-blue-100 text-blue-800",
  deposit: "bg-purple-100 text-purple-800",
  rooms: "bg-green-100 text-green-800",
  booking: "bg-yellow-100 text-yellow-800",
  rent: "bg-orange-100 text-orange-800",
  finance: "bg-pink-100 text-pink-800",
  housekeeping: "bg-cyan-100 text-cyan-800",
  auth: "bg-red-100 text-red-800",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditPage({
  entries,
  modules,
  filterModule,
  filterFrom,
  filterTo,
}: {
  entries: Entry[];
  modules: ModuleCount[];
  filterModule: string;
  filterFrom: string;
  filterTo: string;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function navigate(updates: Partial<{ module: string; from: string; to: string }>) {
    const params = new URLSearchParams();
    const m = updates.module !== undefined ? updates.module : filterModule;
    const f = updates.from !== undefined ? updates.from : filterFrom;
    const t = updates.to !== undefined ? updates.to : filterTo;
    if (m) params.set("module", m);
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    router.push(`/admin/audit${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-black">Audit log</h1>
        <p className="text-sm text-gray mt-1">
          Last 500 admin actions. Add{" "}
          <code className="text-xs">audit(request, {`{...}`})</code> to any admin
          API route to capture it here.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block">
          <span className="block text-xs text-gray mb-1">Module</span>
          <select
            value={filterModule}
            onChange={(e) => navigate({ module: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.count})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">From</span>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => navigate({ from: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">To</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => navigate({ to: e.target.value })}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>
        {(filterModule || filterFrom || filterTo) && (
          <button
            onClick={() => router.push("/admin/audit")}
            className="text-xs text-gray hover:text-black underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lightgray bg-background-alt">
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">When</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Module</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Entity</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Summary</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray">
                    No audit entries.
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const tone = MODULE_COLORS[e.module] ?? "bg-gray-100 text-gray-800";
                  return (
                    <Fragment key={e.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(expandedId === e.id ? null : e.id)
                        }
                        className="border-b border-lightgray/50 hover:bg-background-alt cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-xs text-gray tabular-nums whitespace-nowrap">
                          {fmtDateTime(e.at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${tone}`}
                          >
                            {e.module}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {e.action}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {e.entityType && e.entityId ? (
                            e.entityType === "tenant" ? (
                              <Link
                                href={`/admin/tenants/${e.entityId}`}
                                onClick={(ev) => ev.stopPropagation()}
                                className="text-blue-600 hover:underline"
                              >
                                {e.entityType}/{e.entityId.slice(-8)}
                              </Link>
                            ) : (
                              <span className="text-gray">
                                {e.entityType}/{e.entityId.slice(-8)}
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">{e.summary ?? "—"}</td>
                      </tr>
                      {expandedId === e.id && (
                        <tr className="border-b border-lightgray/50 bg-background-alt">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                              <div>
                                <div className="text-gray uppercase mb-1">Path</div>
                                <code className="font-mono">{e.path ?? "—"}</code>
                              </div>
                              <div>
                                <div className="text-gray uppercase mb-1">IP</div>
                                <code className="font-mono">{e.ip ?? "—"}</code>
                              </div>
                              <div>
                                <div className="text-gray uppercase mb-1">Audit ID</div>
                                <code className="font-mono">{e.id}</code>
                              </div>
                            </div>
                            {e.metadata && (
                              <div className="mt-3">
                                <div className="text-xs text-gray uppercase mb-1">Metadata</div>
                                <pre className="bg-white border border-lightgray rounded-[5px] p-2 text-xs overflow-x-auto">
                                  {JSON.stringify(e.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
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
