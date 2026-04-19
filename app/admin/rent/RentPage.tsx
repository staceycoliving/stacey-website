"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/admin/ui";

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
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    room: {
      roomNumber: string;
      apartment: {
        location: {
          name: string;
        };
      };
    };
  };
};

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
  PARTIAL: "bg-orange-100 text-orange-800",
};

function formatMonth(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function RentPage({ rentPayments }: { rentPayments: RentPayment[] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Get unique months
  const months = [...new Set(rentPayments.map((rp) => rp.month))].sort().reverse();
  const [selectedMonth, setSelectedMonth] = useState(months[0] || "");

  const filtered = rentPayments.filter((rp) => rp.month === selectedMonth);

  const stats = {
    expected: filtered.reduce((sum, rp) => sum + rp.amount, 0),
    received: filtered.reduce((sum, rp) => sum + rp.paidAmount, 0),
    outstanding: filtered.reduce((sum, rp) =>
      rp.status !== "PAID" ? sum + (rp.amount - rp.paidAmount) : sum, 0
    ),
    count: filtered.length,
  };

  async function runMonthlyRent() {
    if (!confirm("Run monthly rent collection now?\n\nThis will create RentPayment records for the current month and charge all tenants with a payment method set up.")) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/run-monthly-rent", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Rent run complete · ${data.month}`, {
          description: `${data.charged} charged · ${data.created} created · ${data.skipped} skipped${
            data.errors.length > 0 ? `\n\n${data.errors.join("\n")}` : ""
          }`,
        });
        router.refresh();
      } else {
        toast.error("Failed", { description: data.error });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to run rent collection");
    }
    setRunning(false);
  }

  async function markPaid(rentPaymentId: string) {
    setUpdating(rentPaymentId);
    try {
      await fetch("/api/admin/rent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentPaymentId, action: "mark_paid" }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed:", err);
    }
    setUpdating(null);
  }

  function mahnungLabel(rp: RentPayment) {
    if (rp.mahnung2SentAt) return "2. Mahnung";
    if (rp.mahnung1SentAt) return "1. Mahnung";
    if (rp.reminder1SentAt) return "Reminded";
    return "—";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Rent Overview</h1>
        <button
          onClick={runMonthlyRent}
          disabled={running}
          className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
        >
          {running ? "Running..." : "Run rent collection now"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Tenants</p>
          <p className="text-2xl font-bold mt-1">{stats.count}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Expected</p>
          <p className="text-2xl font-bold mt-1">{formatEur(stats.expected)}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Received</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatEur(stats.received)}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{formatEur(stats.outstanding)}</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="mb-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          {months.length === 0 && <option value="">No rent data yet</option>}
          {months.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lightgray bg-background-alt">
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Tenant</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Room</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Paid</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Mahnung</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray">
                    No rent payments for this month
                  </td>
                </tr>
              ) : (
                filtered.map((rp) => (
                  <tr key={rp.id} className="border-b border-lightgray/50 hover:bg-background-alt">
                    <td className="px-4 py-3 font-medium">
                      {rp.tenant.firstName} {rp.tenant.lastName}
                    </td>
                    <td className="px-4 py-3">{rp.tenant.room.apartment.location.name}</td>
                    <td className="px-4 py-3">#{rp.tenant.room.roomNumber}</td>
                    <td className="px-4 py-3">{formatEur(rp.amount)}</td>
                    <td className="px-4 py-3">{formatEur(rp.paidAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${STATUS_COLORS[rp.status] || ""}`}>
                        {rp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={rp.mahnung2SentAt ? "text-red-600 font-medium" : rp.mahnung1SentAt ? "text-orange-600" : "text-gray"}>
                        {mahnungLabel(rp)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rp.status !== "PAID" && (
                        <button
                          onClick={() => markPaid(rp.id)}
                          disabled={updating === rp.id}
                          className="px-3 py-1 rounded-[5px] text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          {updating === rp.id ? "..." : "Mark paid"}
                        </button>
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
