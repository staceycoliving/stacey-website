"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Location = {
  id: string;
  slug: string;
  name: string;
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
  room: {
    id: string;
    roomNumber: string;
    category: string;
    apartment: {
      id: string;
      houseNumber: string;
      floor: string;
      location: Location;
    };
  };
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateInput(d: string | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function TenantsPage({
  tenants,
  locations,
}: {
  tenants: Tenant[];
  locations: Location[];
}) {
  const router = useRouter();
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "leaving">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMoveOut, setEditMoveOut] = useState("");
  const [editNotice, setEditNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = tenants.filter((t) => {
    if (filterLocation && t.room.apartment.location.id !== filterLocation) return false;
    if (filterStatus === "active" && t.moveOut) return false;
    if (filterStatus === "leaving" && !t.moveOut) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.room.roomNumber.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const counts = {
    total: tenants.length,
    active: tenants.filter((t) => !t.moveOut).length,
    leaving: tenants.filter((t) => t.moveOut).length,
  };

  function startEdit(t: Tenant) {
    setEditingId(t.id);
    setEditMoveOut(formatDateInput(t.moveOut));
    setEditNotice(formatDateInput(t.notice));
  }

  async function saveEdit(tenantId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          moveOut: editMoveOut || null,
          notice: editNotice || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
    setSaving(false);
  }

  async function deleteTenant(tenantId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        setConfirmDelete(null);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
    setSaving(false);
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Total tenants</p>
          <p className="text-2xl font-bold mt-1">{counts.total}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{counts.active}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Leaving</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{counts.leaving}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, room..."
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white w-64"
        />
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "leaving")}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="all">All</option>
          <option value="active">Active (no end date)</option>
          <option value="leaving">Leaving (end date set)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lightgray bg-background-alt">
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Room</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Move-in</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Move-out</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Notice</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray">
                    No tenants found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-lightgray/50 hover:bg-background-alt transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{t.firstName} {t.lastName}</p>
                      <p className="text-xs text-gray">{t.email}</p>
                    </td>
                    <td className="px-4 py-3">{t.room.apartment.location.name}</td>
                    <td className="px-4 py-3">{t.room.roomNumber}</td>
                    <td className="px-4 py-3">{formatCategory(t.room.category)}</td>
                    <td className="px-4 py-3">{formatDate(t.moveIn)}</td>
                    <td className="px-4 py-3">
                      {editingId === t.id ? (
                        <input
                          type="date"
                          value={editMoveOut}
                          onChange={(e) => setEditMoveOut(e.target.value)}
                          className="px-2 py-1 border border-lightgray rounded-[5px] text-sm w-36"
                        />
                      ) : (
                        <span className={t.moveOut ? "text-yellow-600 font-medium" : ""}>
                          {formatDate(t.moveOut)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === t.id ? (
                        <input
                          type="date"
                          value={editNotice}
                          onChange={(e) => setEditNotice(e.target.value)}
                          className="px-2 py-1 border border-lightgray rounded-[5px] text-sm w-36"
                        />
                      ) : (
                        formatDate(t.notice)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === t.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(t.id)}
                            disabled={saving}
                            className="px-3 py-1 bg-black text-white rounded-[5px] text-xs font-medium hover:bg-black/90 disabled:opacity-50"
                          >
                            {saving ? "..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : confirmDelete === t.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteTenant(t.id)}
                            disabled={saving}
                            className="px-3 py-1 bg-red-500 text-white rounded-[5px] text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                          >
                            {saving ? "..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(t)}
                            className="px-3 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(t.id)}
                            className="px-3 py-1 border border-red-200 text-red-500 rounded-[5px] text-xs hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
