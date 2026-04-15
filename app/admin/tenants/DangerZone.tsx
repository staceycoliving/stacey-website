"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DELETE_REASONS = [
  "DSGVO-Löschanfrage",
  "Test-/Dummy-Daten",
  "Doppelter Eintrag (Datenbereinigung)",
  "Sonstige (bitte notieren)",
];

interface DangerZoneProps {
  tenantId: string;
  tenantName: string;
}

/**
 * Permanent hard-delete for cleanup scenarios. Lives at the bottom of the
 * tenant folio in a clearly-marked danger area. NOT for normal business
 * workflows — those are Terminate (3-month notice) or Widerruf (refund).
 *
 * Type-to-confirm is intentional friction: the user must type the tenant's
 * full name before the delete button enables. Reason is mandatory and goes
 * to the audit log.
 */
export default function DangerZone({ tenantId, tenantName }: DangerZoneProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [reason, setReason] = useState(DELETE_REASONS[0]);
  const [reasonNote, setReasonNote] = useState("");
  const [working, setWorking] = useState(false);

  const isOtherReason = reason === DELETE_REASONS[3];
  const nameMatches = typedName.trim() === tenantName;
  const noteOk = !isOtherReason || reasonNote.trim().length > 0;
  const canDelete = nameMatches && noteOk && !working;

  async function execute() {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, reason, reasonNote: reasonNote || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/admin/tenants");
      } else {
        alert(`Delete failed: ${data.error ?? res.statusText}`);
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="bg-white rounded-[5px] border-2 border-red-200 overflow-hidden">
      <div className="px-4 py-3 bg-red-50 border-b border-red-200">
        <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
          <span>⚠️</span> Danger Zone
        </h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm">
          <p className="text-black">
            <strong>Permanent hard-delete</strong> — only for data cleanup.
          </p>
          <p className="text-xs text-gray mt-1">
            For real tenants use{" "}
            <strong>Terminate</strong> (3-month notice) oder{" "}
            <strong>Widerruf</strong> (within 14 days). Hard-delete macht{" "}
            <strong>keinen Stripe-Refund</strong>, keinen Vertragsabschluss,
            und löscht alle Mietzahlungen + Notizen + Mängel cascade.
          </p>
        </div>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-[5px] hover:bg-red-50"
          >
            Delete tenant permanently…
          </button>
        ) : (
          <div className="space-y-3 border-t border-lightgray pt-3">
            <label className="block">
              <span className="block text-xs text-gray mb-1">Reason</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
              >
                {DELETE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-gray mb-1">
                Notiz {isOtherReason ? "(Pflicht)" : "(optional)"}
              </span>
              <input
                type="text"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
                placeholder="z.B. Migration aus alt-system, Test im Februar"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray mb-1">
                Type <strong className="text-red-700">{tenantName}</strong> to
                confirm
              </span>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-[5px] text-sm ${
                  typedName && !nameMatches
                    ? "border-red-300 bg-red-50"
                    : "border-lightgray"
                }`}
                placeholder={tenantName}
                autoComplete="off"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setOpen(false);
                  setTypedName("");
                  setReasonNote("");
                  setReason(DELETE_REASONS[0]);
                }}
                disabled={working}
                className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={execute}
                disabled={!canDelete}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-[5px] hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {working ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
