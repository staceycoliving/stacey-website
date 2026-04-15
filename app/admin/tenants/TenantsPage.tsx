"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import WithdrawModal from "./WithdrawModal";

type Location = {
  id: string;
  slug: string;
  name: string;
};

type RentPaymentSummary = {
  id: string;
  status: string;
  amount: number;
  paidAmount: number;
  month: string;
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  monthlyRent: number;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
  stripeCustomerId: string | null;
  sepaMandateId: string | null;
  depositStatus: string;
  depositAmount: number | null;
  room: {
    id: string;
    roomNumber: string;
    category: string;
    buildingAddress: string | null;
    floorDescription: string | null;
    apartment: {
      id: string;
      houseNumber: string;
      floor: string;
      label: string | null;
      location: Location;
    };
  };
  rentPayments: RentPaymentSummary[];
  booking: {
    id: string;
    depositPaidAt: string | null;
    bookingFeePaidAt: string | null;
  } | null;
};

type SortColumn =
  | "location"
  | "address"
  | "apartment"
  | "suite"
  | "category"
  | "price"
  | "name"
  | "email"
  | "moveIn"
  | "moveOut"
  | "payment";

type SortDirection = "asc" | "desc";

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

function paymentStatus(t: Tenant): {
  label: string;
  tone: "ok" | "warn" | "danger" | "neutral";
} {
  const hasFailed = t.rentPayments.some((p) => p.status === "FAILED");
  if (hasFailed) return { label: "Overdue", tone: "danger" };
  if (!t.sepaMandateId) return { label: "No SEPA", tone: "warn" };
  const hasOpen = t.rentPayments.some(
    (p) => p.status === "PENDING" || p.status === "PROCESSING" || p.status === "PARTIAL"
  );
  if (hasOpen) return { label: "Pending", tone: "neutral" };
  return { label: "OK", tone: "ok" };
}

function withdrawAvailable(t: Tenant): boolean {
  // Always show the action when there's a linked booking with a paid deposit —
  // expired window is handled by an extra warning step in the modal.
  return Boolean(t.booking?.depositPaidAt);
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
  const [sortCol, setSortCol] = useState<SortColumn>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sendingSetupId, setSendingSetupId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { type: "terminate"; tenantId: string }
    | null
  >(null);
  const [withdrawTenantId, setWithdrawTenantId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenuId]);

  const filtered = useMemo(() => {
    let rows = tenants.filter((t) => {
      if (filterLocation && t.room.apartment.location.id !== filterLocation) return false;
      if (filterStatus === "active" && t.moveOut) return false;
      if (filterStatus === "leaving" && !t.moveOut) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          t.firstName.toLowerCase().includes(q) ||
          t.lastName.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.room.roomNumber.toLowerCase().includes(q) ||
          t.room.apartment.houseNumber.toLowerCase().includes(q) ||
          (t.room.apartment.label ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const get = (t: Tenant): string | number => {
        switch (sortCol) {
          case "location":
            return t.room.apartment.location.name;
          case "address":
            return t.room.apartment.houseNumber;
          case "apartment":
            return t.room.apartment.label ?? t.room.apartment.floor;
          case "suite":
            return t.room.roomNumber;
          case "category":
            return t.room.category;
          case "price":
            return t.monthlyRent;
          case "name":
            return `${t.lastName} ${t.firstName}`.toLowerCase();
          case "email":
            return t.email.toLowerCase();
          case "moveIn":
            return t.moveIn;
          case "moveOut":
            return t.moveOut ?? "";
          case "payment":
            return paymentStatus(t).label;
          default:
            return "";
        }
      };
      const av = get(a);
      const bv = get(b);
      if (av === bv) return 0;
      return av < bv ? -dir : dir;
    });

    return rows;
  }, [tenants, filterLocation, filterStatus, search, sortCol, sortDir]);

  const counts = {
    total: tenants.length,
    active: tenants.filter((t) => !t.moveOut).length,
    leaving: tenants.filter((t) => t.moveOut).length,
  };

  function toggleSort(col: SortColumn) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  async function sendSetupLink(tenantId: string) {
    setSendingSetupId(tenantId);
    try {
      const res = await fetch("/api/admin/tenants/sepa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        alert("Payment setup link sent to tenant.");
      } else {
        const data = await res.json();
        alert(`Failed: ${data.details || data.error}`);
      }
    } catch (err) {
      console.error("Send setup link failed:", err);
      alert("Failed to send setup link");
    }
    setSendingSetupId(null);
    setOpenMenuId(null);
  }

  async function terminateTenant(tenantId: string) {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/tenants/terminate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) router.refresh();
      else alert("Termination failed");
    } finally {
      setWorking(false);
      setConfirmAction(null);
    }
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
          placeholder="Search name, email, address, room..."
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white w-72"
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
                <SortableTh label="Location" col="location" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Address" col="address" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Apartment" col="apartment" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Suite" col="suite" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Category" col="category" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Price" col="price" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Email" col="email" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Start" col="moveIn" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="End" col="moveOut" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Payment" col="payment" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray">
                    No tenants found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const status = paymentStatus(t);
                  const toneClass =
                    status.tone === "danger"
                      ? "bg-red-100 text-red-700"
                      : status.tone === "warn"
                        ? "bg-orange-100 text-orange-700"
                        : status.tone === "ok"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600";
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/admin/tenants/${t.id}`)}
                      className="border-b border-lightgray/50 hover:bg-background-alt cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">{t.room.apartment.location.name}</td>
                      <td className="px-4 py-3">
                        {t.room.buildingAddress ?? t.room.apartment.houseNumber}
                      </td>
                      <td className="px-4 py-3">
                        {t.room.apartment.label ?? t.room.apartment.floor}
                      </td>
                      <td className="px-4 py-3">#{t.room.roomNumber}</td>
                      <td className="px-4 py-3">{formatCategory(t.room.category)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        €{(t.monthlyRent / 100).toFixed(0)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {t.firstName} {t.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray">{t.email}</td>
                      <td className="px-4 py-3">{formatDate(t.moveIn)}</td>
                      <td className="px-4 py-3">
                        <span className={t.moveOut ? "text-yellow-600 font-medium" : "text-gray"}>
                          {formatDate(t.moveOut)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${toneClass}`}>
                          {status.label}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === t.id ? null : t.id)
                          }
                          className="p-1.5 rounded-[5px] hover:bg-background-alt"
                          aria-label="Open actions menu"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenuId === t.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-4 top-10 z-20 bg-white border border-lightgray rounded-[5px] shadow-md w-56 py-1"
                          >
                            <MenuItem onClick={() => router.push(`/admin/tenants/${t.id}`)}>
                              Open folio
                            </MenuItem>
                            <MenuItem
                              onClick={() => sendSetupLink(t.id)}
                              disabled={sendingSetupId === t.id}
                            >
                              {sendingSetupId === t.id
                                ? "Sending..."
                                : t.sepaMandateId
                                  ? "Resend payment setup link"
                                  : "Send payment setup link"}
                            </MenuItem>
                            {!t.notice && (
                              <MenuItem
                                onClick={() =>
                                  setConfirmAction({ type: "terminate", tenantId: t.id })
                                }
                              >
                                Terminate (3-month notice)
                              </MenuItem>
                            )}
                            {withdrawAvailable(t) && (
                              <MenuItem
                                onClick={() => {
                                  setWithdrawTenantId(t.id);
                                  setOpenMenuId(null);
                                }}
                                tone="warn"
                              >
                                Widerruf (14-day cancellation)
                              </MenuItem>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm modal — terminate / remove only */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          working={working}
          onConfirm={() => {
            if (confirmAction.type === "terminate")
              return terminateTenant(confirmAction.tenantId);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Widerruf modal */}
      {withdrawTenantId &&
        (() => {
          const t = tenants.find((x) => x.id === withdrawTenantId);
          if (!t) return null;
          return (
            <WithdrawModal
              tenantId={t.id}
              tenantName={`${t.firstName} ${t.lastName}`}
              depositPaidAt={t.booking?.depositPaidAt ?? null}
              moveIn={t.moveIn}
              monthlyRent={t.monthlyRent}
              depositAmount={t.depositAmount ?? t.monthlyRent * 2}
              onClose={() => setWithdrawTenantId(null)}
              onSuccess={() => router.refresh()}
            />
          );
        })()}
    </div>
  );
}

function SortableTh({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  col: SortColumn;
  sortCol: SortColumn;
  sortDir: SortDirection;
  onSort: (c: SortColumn) => void;
  align?: "left" | "right";
}) {
  const active = sortCol === col;
  return (
    <th
      className={`px-4 py-3 font-semibold text-xs text-gray uppercase tracking-wide cursor-pointer select-none hover:text-black ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (sortDir === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          ))}
      </span>
    </th>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger" | "warn";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 hover:bg-red-50"
      : tone === "warn"
        ? "text-orange-600 hover:bg-orange-50"
        : "text-black hover:bg-background-alt";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-sm ${toneClass} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function ConfirmModal({
  working,
  onConfirm,
  onCancel,
}: {
  action: { type: "terminate"; tenantId: string };
  working: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const title = "Terminate tenant?";
  const body =
    "This sets notice today and moveOut 3 months from today (end of month).";
  const cta = "Terminate";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full">
        <h3 className="font-bold text-black">{title}</h3>
        <p className="text-sm text-gray mt-2">{body}</p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm()}
            disabled={working}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
          >
            {working ? "..." : cta}
          </button>
        </div>
      </div>
    </div>
  );
}
