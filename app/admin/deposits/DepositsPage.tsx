"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  moveOut: string | null;
  depositAmount: number | null;
  depositStatus: string;
  damagesAmount: number;
  arrearsAmount: number;
  depositRefundAmount: number | null;
  depositRefundIban: string | null;
  depositReturnedAt: string | null;
  room: {
    roomNumber: string;
    apartment: {
      location: { name: string };
    };
  };
  rentPayments: { amount: number; paidAmount: number }[];
};

const DEPOSIT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  RECEIVED: "bg-green-100 text-green-800",
  RETURNED: "bg-blue-100 text-blue-800",
  RETAINED: "bg-red-100 text-red-800",
};

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function DepositsPage({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [damagesInput, setDamagesInput] = useState("");
  const [ibanInput, setIbanInput] = useState("");

  // Filter: show moved-out tenants first, then active
  const sorted = [...tenants].sort((a, b) => {
    if (a.moveOut && !b.moveOut) return -1;
    if (!a.moveOut && b.moveOut) return 1;
    return 0;
  });

  const stats = {
    total: tenants.length,
    received: tenants.filter((t) => t.depositStatus === "RECEIVED").length,
    returned: tenants.filter((t) => t.depositStatus === "RETURNED").length,
    pendingReturn: tenants.filter((t) => t.moveOut && t.depositStatus === "RECEIVED").length,
  };

  async function apiCall(tenantId: string, action: string, extra: Record<string, any> = {}) {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, action, ...extra }),
      });
      if (res.ok) router.refresh();
      else console.error("API error:", await res.text());
    } catch (err) {
      console.error("Failed:", err);
    }
    setUpdating(false);
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Deposit Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Total deposits</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Held</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.received}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Pending return</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{stats.pendingReturn}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Returned</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{stats.returned}</p>
        </div>
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
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Deposit</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Damages</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Arrears</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Refund</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const arrears = t.rentPayments.reduce(
                  (sum, rp) => sum + (rp.amount - rp.paidAmount), 0
                );
                return (
                  <>
                    <tr
                      key={t.id}
                      onClick={() => {
                        setExpandedId(expandedId === t.id ? null : t.id);
                        setDamagesInput(String(t.damagesAmount / 100));
                        setIbanInput(t.depositRefundIban || "");
                      }}
                      className={`border-b border-lightgray/50 hover:bg-background-alt cursor-pointer transition-colors ${
                        t.moveOut ? "bg-yellow-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {t.firstName} {t.lastName}
                        {t.moveOut && <span className="ml-2 text-xs text-yellow-600">moved out</span>}
                      </td>
                      <td className="px-4 py-3">{t.room.apartment.location.name}</td>
                      <td className="px-4 py-3">#{t.room.roomNumber}</td>
                      <td className="px-4 py-3">{formatEur(t.depositAmount || 0)}</td>
                      <td className="px-4 py-3">{t.damagesAmount > 0 ? formatEur(t.damagesAmount) : "—"}</td>
                      <td className="px-4 py-3">{arrears > 0 ? formatEur(arrears) : "—"}</td>
                      <td className="px-4 py-3 font-medium">
                        {t.depositRefundAmount !== null ? formatEur(t.depositRefundAmount) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${DEPOSIT_STATUS_COLORS[t.depositStatus] || ""}`}>
                          {t.depositStatus}
                        </span>
                      </td>
                    </tr>
                    {expandedId === t.id && (
                      <tr key={`${t.id}-detail`} className="border-b border-lightgray/50 bg-background-alt">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Damages */}
                            <div>
                              <p className="text-xs text-gray uppercase tracking-wide mb-2">Damages (EUR)</p>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={damagesInput}
                                  onChange={(e) => setDamagesInput(e.target.value)}
                                  className="px-3 py-1.5 border border-lightgray rounded-[5px] text-sm w-28"
                                  placeholder="0.00"
                                />
                                <button
                                  onClick={() => apiCall(t.id, "set_damages", { damagesAmount: Math.round(parseFloat(damagesInput || "0") * 100) })}
                                  disabled={updating}
                                  className="px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-white transition-colors disabled:opacity-50"
                                >
                                  Save
                                </button>
                              </div>
                            </div>

                            {/* Calculate refund */}
                            <div>
                              <p className="text-xs text-gray uppercase tracking-wide mb-2">Refund calculation</p>
                              <button
                                onClick={() => apiCall(t.id, "calculate_refund")}
                                disabled={updating}
                                className="px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-white transition-colors disabled:opacity-50"
                              >
                                Calculate refund
                              </button>
                              {t.depositRefundAmount !== null && (
                                <p className="mt-2 text-sm">
                                  {formatEur(t.depositAmount || 0)} - {formatEur(t.damagesAmount)} - {formatEur(t.arrearsAmount)} = <strong>{formatEur(t.depositRefundAmount)}</strong>
                                </p>
                              )}
                            </div>

                            {/* IBAN + Transfer */}
                            <div>
                              <p className="text-xs text-gray uppercase tracking-wide mb-2">IBAN for return</p>
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={ibanInput}
                                  onChange={(e) => setIbanInput(e.target.value)}
                                  className="px-3 py-1.5 border border-lightgray rounded-[5px] text-sm flex-1"
                                  placeholder="DE89..."
                                />
                                <button
                                  onClick={() => apiCall(t.id, "set_iban", { iban: ibanInput })}
                                  disabled={updating}
                                  className="px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-white transition-colors disabled:opacity-50"
                                >
                                  Save
                                </button>
                              </div>
                              {t.depositRefundAmount !== null && t.depositRefundIban && t.depositStatus !== "RETURNED" && (
                                <button
                                  onClick={() => apiCall(t.id, "mark_transferred")}
                                  disabled={updating}
                                  className="px-3 py-1.5 rounded-[5px] text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-50"
                                >
                                  Mark as transferred
                                </button>
                              )}
                              {t.depositReturnedAt && (
                                <p className="mt-2 text-xs text-green-600 font-medium">
                                  Transferred on {new Date(t.depositReturnedAt).toLocaleDateString("de-DE")}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
