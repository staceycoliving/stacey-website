"use client";

import { useState } from "react";

interface WithdrawModalProps {
  tenantId: string;
  tenantName: string;
  /** ISO timestamp when the deposit was paid — null if no deposit on file. */
  depositPaidAt: string | null;
  /** ISO timestamp when the tenant moved in. Used for pro-rata calc. */
  moveIn: string;
  /** Monthly rent in cents — for pro-rata calculation. */
  monthlyRent: number;
  /** Deposit amount in cents — what was actually paid as deposit. */
  depositAmount: number;
  /** Sum of all PAID RentPayments in cents — already collected from the tenant. */
  paidRentsCents: number;
  onClose: () => void;
  /** Called after a successful withdraw so caller can refresh / navigate. */
  onSuccess?: (info: {
    refunded: boolean;
    actuallyRefundedCents: number;
    proRataRentRetainedCents: number;
    daysOccupied: number;
    withinDeadline: boolean;
  }) => void;
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Days remaining in the 14-day Widerruf window measured from a given date.
 *  Negative if window has passed. Null if no deposit payment recorded. */
function daysLeftAt(depositPaidAt: string | null, atDate: Date): number | null {
  if (!depositPaidAt) return null;
  const ms = atDate.getTime() - new Date(depositPaidAt).getTime();
  const daysSince = Math.floor(ms / (24 * 60 * 60 * 1000));
  return 14 - daysSince;
}

/** Pro-rata rent retained for the days actually occupied. Days INCLUSIVE
 *  on both ends — move-in day AND cancellation day count as full days
 *  (matches the monthly-rent cron's startDay/endDay logic). */
function calcProRata(args: {
  moveIn: string;
  cancellationDate: Date;
  monthlyRentCents: number;
}): { daysOccupied: number; proRataCents: number } {
  const moveIn = new Date(args.moveIn);
  moveIn.setHours(0, 0, 0, 0);
  if (moveIn > args.cancellationDate) {
    return { daysOccupied: 0, proRataCents: 0 };
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysOccupied =
    Math.max(0, Math.floor((args.cancellationDate.getTime() - moveIn.getTime()) / msPerDay)) + 1;
  if (daysOccupied === 0 || args.monthlyRentCents <= 0) {
    return { daysOccupied: 0, proRataCents: 0 };
  }
  const daysInMoveInMonth = new Date(
    moveIn.getFullYear(),
    moveIn.getMonth() + 1,
    0
  ).getDate();
  const proRataCents = Math.round(
    (args.monthlyRentCents * daysOccupied) / daysInMoveInMonth
  );
  return { daysOccupied, proRataCents };
}

/**
 * Two-step Widerruf flow:
 *  - within 14 days → standard confirm
 *  - past deadline   → big red warning, then admin-override confirm
 *  - no deposit yet  → "not applicable" message
 */
export default function WithdrawModal({
  tenantId,
  tenantName,
  depositPaidAt,
  moveIn,
  monthlyRent,
  depositAmount,
  paidRentsCents,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const [working, setWorking] = useState(false);
  const [expiredAcknowledged, setExpiredAcknowledged] = useState(false);
  const [cancellationDateStr, setCancellationDateStr] = useState(todayLocalISO());

  // No deposit on file → can't refund anything via this flow
  const noDeposit = !depositPaidAt;

  // Parse the chosen cancellation date (start-of-day local)
  const cancellationDate = new Date(cancellationDateStr + "T00:00:00");

  const daysLeft = daysLeftAt(depositPaidAt, cancellationDate);
  const expired = daysLeft !== null && daysLeft < 0;

  // Pro-rata calculation for live preview
  const { daysOccupied, proRataCents } = calcProRata({
    moveIn,
    cancellationDate,
    monthlyRentCents: monthlyRent,
  });
  const totalCollectedCents = depositAmount + paidRentsCents;
  const refundCents = Math.max(0, totalCollectedCents - proRataCents);

  async function execute(confirmExpired: boolean) {
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmExpired,
          cancellationDate: cancellationDateStr,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const days = data.daysOccupied ?? 0;
        alert(
          [
            `Widerruf processed${data.withinDeadline ? "" : " (admin override after deadline)"}.`,
            "",
            `Refund: ${fmtEur(data.actuallyRefundedCents)} across ${data.refunds?.length ?? 0} Stripe payment(s).`,
            days > 0
              ? `Pro-rata retained for ${days} day${days === 1 ? "" : "s"}: ${fmtEur(data.proRataRentRetainedCents)}.`
              : "Tenant had not moved in — no rent retained.",
            "Booking Fee €195 retained (non-refundable).",
          ].join("\n")
        );
        onSuccess?.({
          refunded: Boolean(data.refunded),
          actuallyRefundedCents: data.actuallyRefundedCents ?? 0,
          proRataRentRetainedCents: data.proRataRentRetainedCents ?? 0,
          daysOccupied: data.daysOccupied ?? 0,
          withinDeadline: Boolean(data.withinDeadline),
        });
        onClose();
      } else {
        alert(`Widerruf failed: ${data.error ?? res.statusText}`);
      }
    } finally {
      setWorking(false);
    }
  }

  // ─── No deposit at all ─────────────────────────────────────
  if (noDeposit) {
    return (
      <Shell>
        <h3 className="font-bold text-black">Kein Widerruf möglich</h3>
        <p className="text-sm text-gray mt-2">
          Es liegt keine Kautionszahlung für{" "}
          <strong className="text-black">{tenantName}</strong> vor — Widerruf
          nicht anwendbar.
        </p>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            OK
          </button>
        </div>
      </Shell>
    );
  }

  // ─── Past deadline, not yet acknowledged ──────────────────
  if (expired && !expiredAcknowledged) {
    return (
      <Shell border="border-2 border-red-400">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">⚠️</span>
          <h3 className="font-bold text-red-700 text-lg">
            Widerrufsfrist ist bereits abgelaufen
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <DateInput
            label="Widerruf erhalten am"
            value={cancellationDateStr}
            onChange={setCancellationDateStr}
          />
          <p className="text-black">
            Die 14-tägige Widerrufsfrist (ab Kautionszahlung) für{" "}
            <strong>{tenantName}</strong> ist seit{" "}
            <strong>{Math.abs(daysLeft!)} Tagen</strong> abgelaufen.
          </p>
          <p className="text-gray">
            Ein Widerruf ist <strong>rechtlich nicht mehr möglich</strong>.
            Falls du trotzdem fortfahren willst:
          </p>
          <ul className="list-disc list-inside text-gray text-xs space-y-1 ml-2">
            <li>Refund läuft per Stripe (mit Pro-rata-Abzug falls eingezogen)</li>
            <li>Booking → CANCELLED, Reason: &quot;admin override after deadline&quot;</li>
            <li>Tenant aus der DB gelöscht</li>
            <li>Audit-Log: <code>withdraw_after_deadline</code></li>
          </ul>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Abbrechen
          </button>
          <button
            onClick={() => setExpiredAcknowledged(true)}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-[5px] hover:bg-red-700"
          >
            Trotzdem fortfahren →
          </button>
        </div>
      </Shell>
    );
  }

  // ─── Standard confirm (within deadline OR expired+acknowledged) ──
  return (
    <Shell>
      <h3 className="font-bold text-black">Widerruf bestätigen</h3>
      {expiredAcknowledged && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-[5px] text-xs text-red-700">
          ⚠️ Außerhalb der Widerrufsfrist — Admin-Override
        </div>
      )}

      <div className="mt-3 space-y-3">
        <DateInput
          label="Widerruf erhalten am"
          value={cancellationDateStr}
          onChange={setCancellationDateStr}
        />

        {!expiredAcknowledged && daysLeft !== null && (
          <p className="text-xs text-gray">
            Innerhalb der 14-Tage-Frist —{" "}
            <strong className="text-black">
              {daysLeft} Tag{daysLeft === 1 ? "" : "e"} verbleibend
            </strong>{" "}
            ab Kautionszahlung.
          </p>
        )}

        {/* Calculation breakdown */}
        <div className="border border-lightgray rounded-[5px] divide-y divide-lightgray text-sm">
          <Row label="Kaution gezahlt" value={fmtEur(depositAmount)} muted />
          {paidRentsCents > 0 && (
            <Row
              label="Bezahlte Mieten (bereits eingezogen)"
              value={`+${fmtEur(paidRentsCents)}`}
              muted
            />
          )}
          {daysOccupied > 0 ? (
            <Row
              label={`Pro-rata Miete (${daysOccupied} Tag${daysOccupied === 1 ? "" : "e"} gewohnt, einbehalten)`}
              value={`-${fmtEur(proRataCents)}`}
              muted
            />
          ) : (
            <Row label="Mieter noch nicht eingezogen — keine Miete einbehalten" value="—" muted />
          )}
          <Row label="Refund an Kunde" value={fmtEur(refundCents)} highlight />
        </div>

        <p className="text-xs text-gray">
          Refund wird auf die Stripe-Zahlungen verteilt (Kaution zuerst, dann
          Mieten in chronologischer Reihenfolge). <strong className="text-black">{tenantName}</strong> wird gelöscht,
          Booking als CANCELLED archiviert. Booking Fee €195 wurde bereits
          vereinnahmt und bleibt unverändert.
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
        >
          Abbrechen
        </button>
        <button
          onClick={() => execute(expiredAcknowledged)}
          disabled={working}
          className={`px-3 py-1.5 text-sm rounded-[5px] disabled:opacity-50 ${
            expiredAcknowledged
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-black text-white hover:bg-black/90"
          }`}
        >
          {working ? "..." : "Widerruf durchführen"}
        </button>
      </div>
    </Shell>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray mb-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={todayLocalISO()}
        className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
      />
    </label>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 ${
        highlight ? "bg-green-50 font-bold text-black" : muted ? "text-gray" : ""
      }`}
    >
      <span className="text-xs">{label}</span>
      <span className="tabular-nums text-sm">{value}</span>
    </div>
  );
}

function Shell({
  children,
  border = "border border-lightgray",
}: {
  children: React.ReactNode;
  border?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-[5px] ${border} p-6 max-w-lg w-full`}>
        {children}
      </div>
    </div>
  );
}
