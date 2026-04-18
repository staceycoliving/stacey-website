"use client";

import { useState } from "react";

interface PaidRent {
  /** ISO timestamp of month-start, exactly as Prisma returns it. */
  month: string;
  paidAmount: number;
}

interface MoveOutAdjustModalProps {
  tenantId: string;
  tenantName: string;
  monthlyRentCents: number;
  moveIn: string;
  /** Current moveOut, may be null. */
  currentMoveOut: string | null;
  /** All PAID/PARTIAL rent payments — modal picks the one matching the
   *  newly chosen move-out month for the live preview. The server does
   *  the authoritative reconcile on save. */
  paidRents: PaidRent[];
  onClose: () => void;
  onSuccess: () => void;
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Pro-rata for a (start, end) range using actual days of the start-month.
 *  Same logic as monthly-rent cron — endDay − startDay + 1, both inclusive. */
function calcMonthAmount(args: {
  fullRentCents: number;
  monthStart: Date;
  monthEnd: Date;
  moveIn: Date;
  moveOut: Date;
}): { rentDays: number; amount: number } {
  const daysInMonth = args.monthEnd.getDate();
  let startDay = 1;
  if (
    args.moveIn.getFullYear() === args.monthStart.getFullYear() &&
    args.moveIn.getMonth() === args.monthStart.getMonth()
  ) {
    startDay = args.moveIn.getDate();
  }
  let endDay = daysInMonth;
  if (
    args.moveOut.getFullYear() === args.monthStart.getFullYear() &&
    args.moveOut.getMonth() === args.monthStart.getMonth()
  ) {
    endDay = args.moveOut.getDate();
  }
  const rentDays = Math.max(0, endDay - startDay + 1);
  const amount =
    rentDays >= daysInMonth
      ? args.fullRentCents
      : Math.round((args.fullRentCents * rentDays) / daysInMonth);
  return { rentDays, amount };
}

export default function MoveOutAdjustModal({
  tenantId,
  tenantName,
  monthlyRentCents,
  moveIn,
  currentMoveOut,
  paidRents,
  onClose,
  onSuccess,
}: MoveOutAdjustModalProps) {
  const [working, setWorking] = useState(false);
  const [moveOutStr, setMoveOutStr] = useState(
    currentMoveOut ? currentMoveOut.slice(0, 10) : todayLocalISO()
  );

  const moveInDate = new Date(moveIn);
  moveInDate.setHours(0, 0, 0, 0);
  const newMoveOut = new Date(moveOutStr + "T00:00:00");

  const valid = newMoveOut >= moveInDate;
  const monthStart = new Date(newMoveOut.getFullYear(), newMoveOut.getMonth(), 1);
  const monthEnd = new Date(newMoveOut.getFullYear(), newMoveOut.getMonth() + 1, 0);

  // Warnings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeMonthsOut = new Date(today);
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
  const lastDayOfMoveOutMonth = monthEnd.getDate();
  const isShortNotice = valid && newMoveOut < threeMonthsOut;
  const isNotMonthEnd = valid && newMoveOut.getDate() !== lastDayOfMoveOutMonth;

  // Find a PAID rent for the same month as the new move-out, by comparing
  // year/month components (avoids timezone pitfalls when the DB stores
  // 2026-04-01T00:00:00Z but local Date construction yields the prior
  // day's 22:00 UTC in CET).
  const matchingPaid = paidRents.find((r) => {
    const d = new Date(r.month);
    return (
      d.getUTCFullYear() === newMoveOut.getFullYear() &&
      d.getUTCMonth() === newMoveOut.getMonth()
    );
  });
  const paidThisMonthCents = matchingPaid?.paidAmount ?? 0;

  const { rentDays: newRentDays, amount: newAmount } = calcMonthAmount({
    fullRentCents: monthlyRentCents,
    monthStart,
    monthEnd,
    moveIn: moveInDate,
    moveOut: newMoveOut,
  });

  const diffCents = paidThisMonthCents - newAmount;
  const isOverpaid = paidThisMonthCents > 0 && diffCents > 0;
  const isUnderpaid = paidThisMonthCents > 0 && diffCents < 0;

  async function save() {
    if (!valid) return;
    setWorking(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, moveOut: moveOutStr }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Save failed: ${data.error ?? res.statusText}`);
        return;
      }
      const r = data.reconcile;
      if (r?.adjusted) {
        alert(
          `Move-out updated. €${(r.overpaymentCents / 100).toFixed(2)} Mietüberzahlung wird bei der Kautionsauszahlung verrechnet.`
        );
      } else if (r?.warnings?.length) {
        alert(`Move-out updated.\n\nWarnings:\n${r.warnings.join("\n")}`);
      } else {
        alert("Move-out updated.");
      }
      onSuccess();
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-lg w-full space-y-3">
        <h3 className="font-bold text-black">Move-out anpassen</h3>
        <p className="text-sm text-gray">
          <strong className="text-black">{tenantName}</strong> — neuer Auszugstag.
          Falls die Miete für den Monat schon eingezogen wurde, wird die
          Differenz bei der Kautionsauszahlung verrechnet (kein automatischer
          Stripe-Refund mehr).
        </p>
        <label className="block">
          <span className="block text-xs text-gray mb-1">Neuer Move-out</span>
          <input
            type="date"
            value={moveOutStr}
            min={moveIn.slice(0, 10)}
            onChange={(e) => setMoveOutStr(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>
        {!valid && (
          <p className="text-xs text-red-600">Move-out muss am oder nach Move-in liegen.</p>
        )}
        {valid && (
          <div className="border border-lightgray rounded-[5px] divide-y divide-lightgray text-sm">
            <Row
              label={`Bisher gezahlt (${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")})`}
              value={paidThisMonthCents > 0 ? fmtEur(paidThisMonthCents) : "—"}
              muted
            />
            <Row
              label={`Neue Soll-Miete (${newRentDays} Tag${newRentDays === 1 ? "" : "e"})`}
              value={fmtEur(newAmount)}
              muted
            />
            {paidThisMonthCents === 0 && (
              <Row
                label="Noch keine Miete für diesen Monat eingezogen"
                value="—"
                muted
              />
            )}
            {isOverpaid && (
              <Row
                label="Überzahlung → Endabrechnung"
                value={`+${fmtEur(diffCents)}`}
                highlight
              />
            )}
            {isUnderpaid && (
              <Row
                label="Mieter unterzahlt — separat abrechnen"
                value={`+${fmtEur(-diffCents)}`}
                tone="warn"
              />
            )}
            {paidThisMonthCents > 0 && diffCents === 0 && (
              <Row label="Keine Differenz" value="—" muted />
            )}
          </div>
        )}

        {isOverpaid && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-[5px] text-xs text-blue-900">
            <strong>ℹ Verrechnung bei Endabrechnung</strong>
            <br />
            Die Überzahlung von <strong>€{(diffCents / 100).toFixed(2)}</strong>{" "}
            wird beim Schließen des Vertrags automatisch mit der Kaution,
            offenen Forderungen und Mängeln verrechnet. Kein separater
            Stripe-Refund — der Mieter sieht alles in einem Schritt unter
            Deposits → Settlement.
          </div>
        )}
        {(isShortNotice || isNotMonthEnd) && (
          <div className="space-y-1.5">
            {isShortNotice && (
              <div className="p-2 bg-orange-50 border border-orange-200 rounded-[5px] text-xs text-orange-900">
                ⚠ Kündigungsfrist unter 3 Monaten (ab heute gerechnet).
              </div>
            )}
            {isNotMonthEnd && (
              <div className="p-2 bg-orange-50 border border-orange-200 rounded-[5px] text-xs text-orange-900">
                ⚠ Kein Monatsende — der {lastDayOfMoveOutMonth}. wäre das Monatsende.
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={!valid || working}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
          >
            {working ? "..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
  tone?: "warn";
}) {
  const cls = highlight
    ? "bg-green-50 font-bold text-black"
    : tone === "warn"
      ? "bg-orange-50 text-orange-700"
      : muted
        ? "text-gray"
        : "";
  return (
    <div className={`flex items-center justify-between px-3 py-2 ${cls}`}>
      <span className="text-xs">{label}</span>
      <span className="tabular-nums text-sm">{value}</span>
    </div>
  );
}
