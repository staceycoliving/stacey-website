"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Edit2, X, Download } from "lucide-react";
import WithdrawModal from "../WithdrawModal";
import DangerZone from "../DangerZone";

type Location = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
};

type Room = {
  id: string;
  roomNumber: string;
  category: string;
  monthlyRent: number;
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

type Booking = {
  id: string;
  status: string;
  signatureDocumentId: string | null;
  bookingFeePaidAt: string | null;
  depositAmount: number | null;
  depositPaidAt: string | null;
  cancellationReason: string | null;
} | null;

type RentPayment = {
  id: string;
  month: string;
  amount: number;
  paidAmount: number;
  status: string;
  paidAt: string | null;
  failureReason: string | null;
  reminder1SentAt: string | null;
  mahnung1SentAt: string | null;
  mahnung2SentAt: string | null;
};

type ExtraCharge = {
  id: string;
  description: string;
  amount: number;
  month: string | null;
  paidAt: string | null;
  createdAt: string;
};

type RentAdjustment = {
  id: string;
  month: string | null;
  originalAmount: number;
  adjustedAmount: number;
  reason: string;
  isPermanent: boolean;
  validFrom: string | null;
  createdAt: string;
};

type Defect = {
  id: string;
  description: string;
  deductionAmount: number;
  photos: string[];
  createdAt: string;
};

type Note = {
  id: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
};

export type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  street: string | null;
  zipCode: string | null;
  addressCity: string | null;
  country: string | null;
  monthlyRent: number;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
  stripeCustomerId: string | null;
  sepaMandateId: string | null;
  depositAmount: number | null;
  depositStatus: string;
  damagesAmount: number;
  arrearsAmount: number;
  depositRefundAmount: number | null;
  depositRefundIban: string | null;
  depositReturnedAt: string | null;
  welcomeEmailSentAt: string | null;
  paymentSetupRemindersSent: number;
  paymentFinalWarningSentAt: string | null;
  postStayFeedbackSentAt: string | null;
  room: Room;
  booking: Booking;
  rentPayments: RentPayment[];
  extraCharges: ExtraCharge[];
  rentAdjustments: RentAdjustment[];
  defects: Defect[];
  notes: Note[];
};

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "lease", label: "Lease" },
  { id: "payments", label: "Payments" },
  { id: "deposit", label: "Deposit & defects" },
  { id: "timeline", label: "Timeline" },
  { id: "documents", label: "Documents" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}

function fmtEuro(cents: number | null, digits: 0 | 2 = 0) {
  if (cents === null) return "—";
  return `€${(cents / 100).toFixed(digits)}`;
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function TenantFolioPage({
  tenant,
  withdrawEligible,
}: {
  tenant: Tenant;
  withdrawEligible: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("profile");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const hasDeposit = Boolean(tenant.booking?.depositPaidAt);

  const openBalance = tenant.rentPayments.reduce(
    (sum, p) => sum + (p.amount - p.paidAmount),
    0
  );
  const extraChargesOpen = tenant.extraCharges
    .filter((c) => !c.paidAt)
    .reduce((sum, c) => sum + c.amount, 0);
  const totalOpen = openBalance + extraChargesOpen;

  const overallStatus: { label: string; tone: string } = (() => {
    if (tenant.rentPayments.some((p) => p.status === "FAILED"))
      return { label: "Overdue", tone: "bg-red-100 text-red-700" };
    if (!tenant.sepaMandateId)
      return { label: "No SEPA", tone: "bg-orange-100 text-orange-700" };
    if (tenant.moveOut && new Date(tenant.moveOut) < new Date())
      return { label: "Moved out", tone: "bg-gray-100 text-gray-700" };
    if (tenant.notice)
      return { label: "Leaving", tone: "bg-yellow-100 text-yellow-700" };
    return { label: "Active", tone: "bg-green-100 text-green-700" };
  })();

  // withdrawEligible is computed in the server component (page.tsx) so the
  // client render stays pure — React Compiler rejects Date.now() calls here.

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-gray hover:text-black"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tenants
      </Link>

      <div className="bg-white rounded-[5px] border border-lightgray p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-black">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <div className="text-sm text-gray mt-1">
              #{tenant.room.roomNumber} · {tenant.room.apartment.location.name} ·{" "}
              {formatCategory(tenant.room.category)}
            </div>
            <div className="text-xs text-gray mt-1">
              Tenant since {fmtDate(tenant.moveIn)}
              {tenant.moveOut && ` · leaves ${fmtDate(tenant.moveOut)}`}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-block px-3 py-1 rounded-[5px] text-xs font-semibold ${overallStatus.tone}`}
            >
              {overallStatus.label}
            </span>
            {totalOpen > 0 && (
              <span className="inline-block px-3 py-1 rounded-[5px] text-xs font-semibold bg-red-100 text-red-700">
                Open balance: {fmtEuro(totalOpen)}
              </span>
            )}
            {withdrawEligible && (
              <span className="inline-block px-3 py-1 rounded-[5px] text-xs font-semibold bg-orange-100 text-orange-700">
                Widerruf period active
              </span>
            )}
            {hasDeposit && (
              <button
                onClick={() => setShowWithdraw(true)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[5px] text-xs font-medium border ${
                  withdrawEligible
                    ? "border-orange-300 text-orange-700 hover:bg-orange-50"
                    : "border-lightgray text-gray hover:bg-background-alt"
                }`}
                title={
                  withdrawEligible
                    ? "Innerhalb der 14-Tage-Frist seit Kautionszahlung"
                    : "Frist abgelaufen — Override mit Warnung möglich"
                }
              >
                Widerruf bearbeiten
              </button>
            )}
          </div>
        </div>
      </div>

      {showWithdraw && (
        <WithdrawModal
          tenantId={tenant.id}
          tenantName={`${tenant.firstName} ${tenant.lastName}`}
          depositPaidAt={tenant.booking?.depositPaidAt ?? null}
          moveIn={tenant.moveIn}
          monthlyRent={tenant.monthlyRent}
          depositAmount={tenant.depositAmount ?? tenant.monthlyRent * 2}
          paidRentsCents={tenant.rentPayments
            .filter((r) => r.status === "PAID")
            .reduce((sum, r) => sum + r.paidAmount, 0)}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => router.push("/admin/tenants")}
        />
      )}

      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="border-b border-lightgray flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-black text-black"
                  : "border-transparent text-gray hover:text-black"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "profile" && <ProfileTab tenant={tenant} />}
          {tab === "lease" && <LeaseTab tenant={tenant} />}
          {tab === "payments" && <PaymentsTab tenant={tenant} />}
          {tab === "deposit" && <DepositTab tenant={tenant} />}
          {tab === "timeline" && <TimelineTab tenant={tenant} />}
          {tab === "documents" && <DocumentsTab tenant={tenant} />}
        </div>
      </div>

      <DangerZone
        tenantId={tenant.id}
        tenantName={`${tenant.firstName} ${tenant.lastName}`}
      />
    </div>
  );
}

// ─── Tab 1: Profile ────────────────────────────────────────

function ProfileTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: tenant.email,
    phone: tenant.phone ?? "",
    street: tenant.street ?? "",
    zipCode: tenant.zipCode ?? "",
    addressCity: tenant.addressCity ?? "",
    country: tenant.country ?? "",
  });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Save failed: ${data.error ?? res.statusText}`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-3 max-w-xl">
        <div className="text-xs text-gray bg-background-alt rounded-[5px] p-3 border border-lightgray">
          Name and date of birth are taken from the signed lease and cannot be edited here.
        </div>
        <Field label="Name (read-only)" value={`${tenant.firstName} ${tenant.lastName}`} />
        <Field label="Date of birth (read-only)" value={fmtDate(tenant.dateOfBirth)} />

        <FormInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <FormInput label="Street" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <FormInput label="ZIP" value={form.zipCode} onChange={(v) => setForm({ ...form, zipCode: v })} />
          <FormInput label="City" value={form.addressCity} onChange={(v) => setForm({ ...form, addressCity: v })} />
        </div>
        <FormInput label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />

        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-medium hover:bg-black/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-2xl">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-sm text-gray hover:text-black"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      <InfoRow label="Name" value={`${tenant.firstName} ${tenant.lastName}`} />
      <InfoRow label="Email" value={tenant.email} />
      <InfoRow label="Phone" value={tenant.phone ?? "—"} />
      <InfoRow label="Date of birth" value={fmtDate(tenant.dateOfBirth)} />
      <InfoRow
        label="Address"
        value={
          tenant.street
            ? `${tenant.street}, ${tenant.zipCode ?? ""} ${tenant.addressCity ?? ""}, ${tenant.country ?? ""}`
            : "—"
        }
      />
    </div>
  );
}

// ─── Tab 2: Lease ──────────────────────────────────────────

function LeaseTab({ tenant }: { tenant: Tenant }) {
  const addr = tenant.room.apartment.location.address;
  return (
    <div className="space-y-2 max-w-2xl">
      <InfoRow label="Location" value={tenant.room.apartment.location.name} />
      <InfoRow label="Address" value={addr} />
      <InfoRow
        label="Apartment"
        value={tenant.room.apartment.label ?? tenant.room.apartment.floor}
      />
      <InfoRow
        label="House number"
        value={tenant.room.buildingAddress ?? tenant.room.apartment.houseNumber}
      />
      <InfoRow
        label="Floor"
        value={tenant.room.floorDescription ?? tenant.room.apartment.floor}
      />
      <InfoRow label="Suite" value={`#${tenant.room.roomNumber}`} />
      <InfoRow label="Category" value={formatCategory(tenant.room.category)} />
      <InfoRow label="Monthly rent" value={fmtEuro(tenant.monthlyRent)} />
      <div className="border-t border-lightgray my-4" />
      <InfoRow label="Move-in" value={fmtDate(tenant.moveIn)} />
      <InfoRow label="Move-out" value={fmtDate(tenant.moveOut)} />
      <InfoRow label="Notice" value={fmtDate(tenant.notice)} />
      {tenant.booking?.bookingFeePaidAt && (
        <InfoRow
          label="Booking fee paid"
          value={fmtDate(tenant.booking.bookingFeePaidAt)}
        />
      )}
    </div>
  );
}

// ─── Tab 3: Payments ───────────────────────────────────────

function PaymentsTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [showCharge, setShowCharge] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const totalExpected = tenant.rentPayments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = tenant.rentPayments.reduce((s, p) => s + p.paidAmount, 0);
  const openRent = totalExpected - totalPaid;
  const openExtras = tenant.extraCharges
    .filter((c) => !c.paidAt)
    .reduce((s, c) => s + c.amount, 0);

  async function toggleChargePaid(chargeId: string, paid: boolean) {
    const res = await fetch(
      `/api/admin/tenants/${tenant.id}/extra-charges/${chargeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid }),
      }
    );
    if (res.ok) router.refresh();
  }

  async function deleteCharge(chargeId: string) {
    if (!confirm("Delete this charge?")) return;
    const res = await fetch(
      `/api/admin/tenants/${tenant.id}/extra-charges/${chargeId}`,
      { method: "DELETE" }
    );
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryBox label="Total paid" value={fmtEuro(totalPaid)} />
        <SummaryBox label="Open rent" value={fmtEuro(openRent)} tone={openRent > 0 ? "warn" : "ok"} />
        <SummaryBox label="Deposit" value={fmtEuro(tenant.depositAmount)} sub={tenant.depositStatus} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Rent history</h3>
          <button
            onClick={() => setShowAdjust(true)}
            className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
          >
            <Plus className="w-3.5 h-3.5" /> Adjust rent
          </button>
        </div>
        <div className="overflow-x-auto border border-lightgray rounded-[5px]">
          <table className="w-full text-sm">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Month</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Due</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Paid</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Δ</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenant.rentPayments.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray">No rent records yet</td></tr>
              ) : (
                tenant.rentPayments.map((p) => {
                  const delta = p.amount - p.paidAmount;
                  return (
                    <tr key={p.id} className="border-t border-lightgray/50">
                      <td className="px-3 py-2">{fmtMonth(p.month)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtEuro(p.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtEuro(p.paidAmount)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${delta > 0 ? "text-red-600" : "text-gray"}`}>
                        {delta > 0 ? fmtEuro(delta) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Extra charges</h3>
          <button
            onClick={() => setShowCharge(true)}
            className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
          >
            <Plus className="w-3.5 h-3.5" /> Add charge
          </button>
        </div>
        {tenant.extraCharges.length === 0 ? (
          <p className="text-sm text-gray">None.</p>
        ) : (
          <div className="overflow-x-auto border border-lightgray rounded-[5px]">
            <table className="w-full text-sm">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">Description</th>
                  <th className="px-3 py-2 text-right text-xs text-gray uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {tenant.extraCharges.map((c) => (
                  <tr key={c.id} className="border-t border-lightgray/50">
                    <td className="px-3 py-2">{fmtDate(c.createdAt)}</td>
                    <td className="px-3 py-2">{c.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtEuro(c.amount)}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleChargePaid(c.id, !c.paidAt)}
                        className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${c.paidAt ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                      >
                        {c.paidAt ? "Paid" : "Open"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteCharge(c.id)}
                        className="text-gray hover:text-red-500"
                        aria-label="Delete charge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {openExtras > 0 && (
          <p className="text-xs text-gray mt-2">
            Open extras: {fmtEuro(openExtras)}
          </p>
        )}
      </div>

      {tenant.rentAdjustments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Rent adjustments</h3>
          <div className="space-y-2">
            {tenant.rentAdjustments.map((a) => (
              <div
                key={a.id}
                className="border border-lightgray rounded-[5px] p-3 text-sm"
              >
                <div className="font-medium">
                  {fmtEuro(a.originalAmount)} → {fmtEuro(a.adjustedAmount)}
                  {a.isPermanent ? " (permanent)" : a.month ? ` (${fmtMonth(a.month)})` : ""}
                </div>
                <div className="text-xs text-gray mt-0.5">{a.reason}</div>
                <div className="text-xs text-gray mt-0.5">
                  Created {fmtDate(a.createdAt)}
                  {a.validFrom && ` · valid from ${fmtDate(a.validFrom)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCharge && (
        <ExtraChargeModal
          tenantId={tenant.id}
          onClose={() => setShowCharge(false)}
          onSaved={() => {
            setShowCharge(false);
            router.refresh();
          }}
        />
      )}
      {showAdjust && (
        <RentAdjustmentModal
          tenantId={tenant.id}
          currentRent={tenant.monthlyRent}
          onClose={() => setShowAdjust(false)}
          onSaved={() => {
            setShowAdjust(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab 4: Deposit & defects ──────────────────────────────

function DepositTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [showDefect, setShowDefect] = useState(false);

  const totalDefects = tenant.defects.reduce(
    (s, d) => s + d.deductionAmount,
    0
  );
  const openRent = tenant.rentPayments.reduce(
    (s, p) => s + (p.amount - p.paidAmount),
    0
  );
  const openExtras = tenant.extraCharges
    .filter((c) => !c.paidAt)
    .reduce((s, c) => s + c.amount, 0);
  const settlement = (tenant.depositAmount ?? 0) - totalDefects - openRent - openExtras;

  async function deleteDefect(defectId: string) {
    if (!confirm("Delete this defect entry?")) return;
    const res = await fetch(
      `/api/admin/tenants/${tenant.id}/defects/${defectId}`,
      { method: "DELETE" }
    );
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryBox label="Deposit" value={fmtEuro(tenant.depositAmount)} sub={tenant.depositStatus} />
        <SummaryBox label="Defects" value={`-${fmtEuro(totalDefects)}`} />
        <SummaryBox label="Open rent" value={`-${fmtEuro(openRent + openExtras)}`} />
        <SummaryBox
          label="Settlement"
          value={fmtEuro(settlement)}
          tone={settlement >= 0 ? "ok" : "warn"}
          sub={settlement >= 0 ? "Refund to tenant" : "Outstanding claim"}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Defects</h3>
          <button
            onClick={() => setShowDefect(true)}
            className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
          >
            <Plus className="w-3.5 h-3.5" /> Add defect
          </button>
        </div>
        {tenant.defects.length === 0 ? (
          <p className="text-sm text-gray">None logged yet.</p>
        ) : (
          <div className="space-y-2">
            {tenant.defects.map((d) => (
              <div
                key={d.id}
                className="border border-lightgray rounded-[5px] p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{d.description}</div>
                    <div className="text-xs text-gray mt-0.5">
                      {fmtDate(d.createdAt)}
                      {d.photos.length > 0 && ` · ${d.photos.length} photo${d.photos.length === 1 ? "" : "s"}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="tabular-nums text-red-600 font-medium">
                      -{fmtEuro(d.deductionAmount)}
                    </div>
                    <button
                      onClick={() => deleteDefect(d.id)}
                      className="text-gray hover:text-red-500"
                      aria-label="Delete defect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tenant.depositReturnedAt && (
        <div className="bg-background-alt rounded-[5px] p-3 text-sm">
          <div className="font-medium">Deposit returned</div>
          <div className="text-xs text-gray mt-0.5">
            {fmtDate(tenant.depositReturnedAt)}
            {tenant.depositRefundAmount !== null &&
              ` · ${fmtEuro(tenant.depositRefundAmount)}`}
            {tenant.depositRefundIban && ` · ${tenant.depositRefundIban}`}
          </div>
        </div>
      )}

      {showDefect && (
        <DefectModal
          tenantId={tenant.id}
          onClose={() => setShowDefect(false)}
          onSaved={() => {
            setShowDefect(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab 5: Timeline ───────────────────────────────────────

function TimelineTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      if (res.ok) {
        setNoteText("");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/admin/tenants/${tenant.id}/notes/${noteId}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
  }

  type Event = {
    at: string;
    label: string;
    detail?: string;
    noteId?: string;
  };
  const events: Event[] = [];

  events.push({ at: tenant.moveIn, label: "Move-in" });
  if (tenant.moveOut) events.push({ at: tenant.moveOut, label: "Move-out planned" });
  if (tenant.notice) events.push({ at: tenant.notice, label: "Notice given" });
  if (tenant.welcomeEmailSentAt)
    events.push({ at: tenant.welcomeEmailSentAt, label: "Welcome email sent" });
  if (tenant.paymentFinalWarningSentAt)
    events.push({ at: tenant.paymentFinalWarningSentAt, label: "Payment final warning sent" });
  if (tenant.postStayFeedbackSentAt)
    events.push({ at: tenant.postStayFeedbackSentAt, label: "Post-stay feedback sent" });
  if (tenant.depositReturnedAt)
    events.push({ at: tenant.depositReturnedAt, label: "Deposit returned" });
  if (tenant.booking?.bookingFeePaidAt)
    events.push({ at: tenant.booking.bookingFeePaidAt, label: "Booking fee paid" });
  if (tenant.booking?.depositPaidAt)
    events.push({ at: tenant.booking.depositPaidAt, label: "Deposit paid" });

  tenant.rentPayments.forEach((p) => {
    if (p.paidAt) events.push({ at: p.paidAt, label: `Rent paid`, detail: `${fmtMonth(p.month)} · ${fmtEuro(p.paidAmount)}` });
    if (p.failureReason) events.push({ at: p.month, label: `Rent charge failed`, detail: `${fmtMonth(p.month)} · ${p.failureReason}` });
    if (p.mahnung1SentAt) events.push({ at: p.mahnung1SentAt, label: "Mahnung 1 sent", detail: fmtMonth(p.month) });
    if (p.mahnung2SentAt) events.push({ at: p.mahnung2SentAt, label: "Mahnung 2 sent", detail: fmtMonth(p.month) });
  });

  tenant.notes.forEach((n) => {
    events.push({ at: n.createdAt, label: "Note", detail: n.content, noteId: n.id });
  });

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-6">
      <div className="border border-lightgray rounded-[5px] p-3">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="w-full text-sm resize-none focus:outline-none"
        />
        <div className="flex justify-end">
          <button
            onClick={addNote}
            disabled={saving || !noteText.trim()}
            className="px-3 py-1.5 bg-black text-white rounded-[5px] text-xs font-medium hover:bg-black/90 disabled:opacity-50"
          >
            {saving ? "..." : "Add note"}
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray">No events yet.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={i} className="flex gap-4 text-sm group">
              <div className="text-xs text-gray w-24 flex-shrink-0 tabular-nums">
                {fmtDate(e.at)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-black">{e.label}</div>
                {e.detail && <div className="text-xs text-gray mt-0.5">{e.detail}</div>}
              </div>
              {e.noteId && (
                <button
                  onClick={() => deleteNote(e.noteId!)}
                  className="text-gray hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 6: Documents ──────────────────────────────────────

function DocumentsTab({ tenant }: { tenant: Tenant }) {
  return (
    <div className="space-y-3 max-w-xl">
      <DocRow
        label="Lease (Mietvertrag)"
        available={Boolean(tenant.booking?.signatureDocumentId)}
        detail={
          tenant.booking?.signatureDocumentId
            ? "Signed via Yousign — archived to Google Drive"
            : "Not signed yet"
        }
      />
      <DocRow
        label="SEPA mandate"
        available={Boolean(tenant.sepaMandateId)}
        detail={tenant.sepaMandateId ? tenant.sepaMandateId : "Not set up"}
      />
      <DocRow
        label="Wohnungsgeberbestätigung"
        available
        detail="Generate on demand"
        action={
          <a
            href={`/api/admin/tenants/${tenant.id}/certificate?type=residence_confirmation`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 bg-black text-white rounded-[5px] text-xs font-medium hover:bg-black/90"
          >
            <Download className="w-3 h-3" /> PDF
          </a>
        }
      />
      <DocRow
        label="Mietschuldenfreiheitsbescheinigung"
        available
        detail="Generate on demand (based on current rent status)"
        action={
          <a
            href={`/api/admin/tenants/${tenant.id}/certificate?type=rent_clearance`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 bg-black text-white rounded-[5px] text-xs font-medium hover:bg-black/90"
          >
            <Download className="w-3 h-3" /> PDF
          </a>
        }
      />
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────

function ExtraChargeModal({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents <= 0) {
      alert("Fill in description and a positive amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/extra-charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount: cents }),
      });
      if (res.ok) onSaved();
      else alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add extra charge" onClose={onClose}>
      <FormInput
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="z.B. Schlüsselersatz"
      />
      <FormInput
        label="Amount (€)"
        value={amount}
        onChange={setAmount}
        placeholder="50.00"
        type="number"
      />
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

function RentAdjustmentModal({
  tenantId,
  currentRent,
  onClose,
  onSaved,
}: {
  tenantId: string;
  currentRent: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState((currentRent / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [month, setMonth] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!reason.trim() || !Number.isFinite(cents) || cents <= 0) {
      alert("Fill in reason and a positive amount");
      return;
    }
    if (!isPermanent && !month) {
      alert("Select a month for one-off adjustment");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/rent-adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustedAmount: cents,
          reason,
          isPermanent,
          month: !isPermanent ? month : undefined,
          validFrom: isPermanent ? validFrom || undefined : undefined,
        }),
      });
      if (res.ok) onSaved();
      else alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Adjust rent" onClose={onClose}>
      <div className="text-xs text-gray">
        Current rent: {fmtEuro(currentRent, 2)}
      </div>
      <FormInput
        label="New amount (€)"
        value={amount}
        onChange={setAmount}
        placeholder="950.00"
        type="number"
      />
      <FormInput
        label="Reason"
        value={reason}
        onChange={setReason}
        placeholder="z.B. Preisanpassung, Nebenkosten-Erhöhung"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPermanent}
          onChange={(e) => setIsPermanent(e.target.checked)}
        />
        Permanent change (updates tenant.monthlyRent)
      </label>
      {!isPermanent ? (
        <FormInput
          label="Month (one-off)"
          value={month}
          onChange={setMonth}
          type="month"
        />
      ) : (
        <FormInput
          label="Valid from (optional)"
          value={validFrom}
          onChange={setValidFrom}
          type="date"
        />
      )}
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

function DefectModal({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents < 0) {
      alert("Fill in description and amount (can be 0)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/defects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, deductionAmount: cents }),
      });
      if (res.ok) onSaved();
      else alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add defect" onClose={onClose}>
      <FormInput
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="z.B. Wandfarbe beschädigt"
      />
      <FormInput
        label="Deduction amount (€)"
        value={amount}
        onChange={setAmount}
        placeholder="0"
        type="number"
      />
      <p className="text-xs text-gray">
        Photo upload comes in a future iteration.
      </p>
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

// ─── Shared components ─────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-black">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray hover:text-black"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
      >
        {saving ? "..." : "Save"}
      </button>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm focus:outline-none focus:border-black"
      />
    </label>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <div className="text-xs text-gray mb-0.5">{label}</div>
      <div className="px-3 py-2 bg-background-alt rounded-[5px] border border-lightgray text-black">
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start text-sm">
      <div className="w-40 text-gray flex-shrink-0">{label}</div>
      <div className="flex-1 text-black">{value}</div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  const valueClass =
    tone === "ok" ? "text-green-700" : tone === "warn" ? "text-orange-600" : "text-black";
  return (
    <div className="bg-background-alt rounded-[5px] border border-lightgray p-3">
      <div className="text-xs text-gray uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-gray mt-1">{sub}</div>}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-green-100 text-green-700"
      : status === "FAILED"
        ? "bg-red-100 text-red-700"
        : status === "PROCESSING"
          ? "bg-blue-100 text-blue-700"
          : status === "PARTIAL"
            ? "bg-orange-100 text-orange-700"
            : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

function DocRow({
  label,
  available,
  detail,
  action,
}: {
  label: string;
  available: boolean;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border border-lightgray rounded-[5px] px-3 py-2 text-sm">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-gray mt-0.5">{detail}</div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-[5px] font-semibold ${
            available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {available ? "Available" : "Missing"}
        </span>
        {action}
      </div>
    </div>
  );
}
