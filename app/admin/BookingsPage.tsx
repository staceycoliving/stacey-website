"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Location = {
  id: string;
  slug: string;
  name: string;
  city: string;
  stayType: string;
};

type Booking = {
  id: string;
  locationId: string;
  stayType: string;
  category: string;
  persons: number;
  checkIn: string | null;
  checkOut: string | null;
  moveInDate: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  street: string | null;
  zipCode: string | null;
  addressCity: string | null;
  country: string | null;
  monthlyRent: number | null;
  moveInReason: string | null;
  message: string | null;
  status: string;
  depositStatus: string;
  createdAt: string;
  location: Location;
  room: { id: string; roomNumber: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SIGNED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  CONFIRMED: "bg-green-200 text-green-900",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = ["PENDING", "SIGNED", "PAID", "CONFIRMED", "CANCELLED"];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
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

export default function BookingsPage({
  bookings,
  locations,
}: {
  bookings: Booking[];
  locations: Location[];
}) {
  const router = useRouter();
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    if (filterLocation && b.locationId !== filterLocation) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterType && b.stayType !== filterType) return false;
    return true;
  });

  const counts = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
  };

  async function updateStatus(bookingId: string, newStatus: string) {
    setUpdating(bookingId);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
    setUpdating(null);
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold mt-1">{counts.total}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{counts.pending}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Confirmed</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{counts.confirmed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">SHORT & LONG</option>
          <option value="SHORT">SHORT</option>
          <option value="LONG">LONG</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lightgray bg-background-alt">
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Guest</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Dates</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <>
                    <tr
                      key={b.id}
                      onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                      className="border-b border-lightgray/50 hover:bg-background-alt cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray">{formatDate(b.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">
                        {b.firstName} {b.lastName}
                      </td>
                      <td className="px-4 py-3">{b.location.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-medium ${
                          b.stayType === "SHORT" ? "bg-pink/30 text-black" : "bg-blue-100 text-blue-800"
                        }`}>
                          {b.stayType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatCategory(b.category)}</td>
                      <td className="px-4 py-3 text-gray">
                        {b.stayType === "SHORT"
                          ? `${formatDate(b.checkIn)} – ${formatDate(b.checkOut)}`
                          : `Move-in: ${formatDate(b.moveInDate)}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${STATUS_COLORS[b.status] || ""}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                    {expandedId === b.id && (
                      <tr key={`${b.id}-detail`} className="border-b border-lightgray/50 bg-background-alt">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray uppercase tracking-wide mb-1">Contact</p>
                              <p>{b.email}</p>
                              <p>{b.phone || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray uppercase tracking-wide mb-1">Details</p>
                              <p>Persons: {b.persons}</p>
                              {b.monthlyRent && <p>Rent: {(b.monthlyRent / 100).toFixed(0)} EUR/mo</p>}
                              {b.moveInReason && <p>Reason: {b.moveInReason}</p>}
                              {b.message && <p>Message: {b.message}</p>}
                            </div>
                            <div>
                              <p className="text-xs text-gray uppercase tracking-wide mb-1">Change status</p>
                              <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.filter((s) => s !== b.status).map((s) => (
                                  <button
                                    key={s}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus(b.id, s);
                                    }}
                                    disabled={updating === b.id}
                                    className={`px-3 py-1 rounded-[5px] text-xs font-medium border transition-colors ${
                                      s === "CANCELLED"
                                        ? "border-red-300 text-red-600 hover:bg-red-50"
                                        : "border-lightgray hover:bg-white"
                                    } disabled:opacity-50`}
                                  >
                                    {updating === b.id ? "..." : s}
                                  </button>
                                ))}
                              </div>
                              {b.stayType === "LONG" && b.street && (
                                <div className="mt-3">
                                  <p className="text-xs text-gray uppercase tracking-wide mb-1">Address</p>
                                  <p>{b.street}, {b.zipCode} {b.addressCity}</p>
                                  <p>{b.country}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray mt-3">ID: {b.id}</p>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
