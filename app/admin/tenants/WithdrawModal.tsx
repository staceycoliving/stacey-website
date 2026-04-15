"use client";

import { useState } from "react";

interface WithdrawModalProps {
  tenantId: string;
  tenantName: string;
  /** ISO timestamp when the deposit was paid — null if no deposit on file. */
  depositPaidAt: string | null;
  onClose: () => void;
  /** Called after a successful withdraw so caller can refresh / navigate. */
  onSuccess?: (info: {
    refunded: boolean;
    refundId: string | null;
    withinDeadline: boolean;
  }) => void;
}

/** Days remaining in the 14-day Widerruf window. Negative if window has passed.
 *  Null if no deposit payment recorded. */
export function withdrawDaysLeft(depositPaidAt: string | null): number | null {
  if (!depositPaidAt) return null;
  const ms = Date.now() - new Date(depositPaidAt).getTime();
  const daysSince = Math.floor(ms / (24 * 60 * 60 * 1000));
  return 14 - daysSince;
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
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const [working, setWorking] = useState(false);
  const [expiredAcknowledged, setExpiredAcknowledged] = useState(false);

  const daysLeft = withdrawDaysLeft(depositPaidAt);
  const expired = daysLeft !== null && daysLeft < 0;
  const noDeposit = daysLeft === null;

  async function execute(confirmExpired: boolean) {
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmExpired }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(
          data.withinDeadline
            ? "Widerruf processed. Deposit refunded, booking fee retained."
            : "Widerruf processed (admin override after deadline)."
        );
        onSuccess?.({
          refunded: Boolean(data.refunded),
          refundId: data.refundId ?? null,
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
          <p className="text-black">
            Die 14-tägige Widerrufsfrist (ab Kautionszahlung) für{" "}
            <strong>{tenantName}</strong> ist seit{" "}
            <strong>{Math.abs(daysLeft!)} Tagen</strong> abgelaufen.
          </p>
          <p className="text-gray">
            Ein Widerruf ist <strong>rechtlich nicht mehr möglich</strong>.
            Falls du trotzdem fortfahren willst, wird:
          </p>
          <ul className="list-disc list-inside text-gray text-xs space-y-1 ml-2">
            <li>Die Kaution per Stripe zurücküberwiesen</li>
            <li>
              Das Booking als CANCELLED markiert (Reason: &quot;admin override
              after deadline&quot;)
            </li>
            <li>Der Tenant aus der DB gelöscht</li>
            <li>
              Im Audit-Log als <code>withdraw_after_deadline</code> protokolliert
            </li>
          </ul>
          <p className="text-black mt-3 font-medium">
            Bist du sicher, dass das gewollt ist?
          </p>
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
      <p className="text-sm text-gray mt-2">
        {expiredAcknowledged ? (
          <>
            <strong className="text-red-700">
              ⚠️ Außerhalb der Widerrufsfrist (Admin-Override).
            </strong>
            <br />
            Kaution wird per Stripe rückerstattet, Booking storniert,{" "}
            <strong className="text-black">{tenantName}</strong> aus der DB
            gelöscht.
          </>
        ) : (
          <>
            Innerhalb der 14-Tage-Widerrufsfrist (
            <strong>
              {daysLeft} Tag{daysLeft === 1 ? "" : "e"} verbleibend
            </strong>
            ).
            <br />
            Kaution wird per Stripe rückerstattet, Booking-Fee (€195) bleibt
            einbehalten, <strong className="text-black">{tenantName}</strong>{" "}
            wird gelöscht.
          </>
        )}
      </p>
      <div className="flex justify-end gap-2 mt-6">
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
