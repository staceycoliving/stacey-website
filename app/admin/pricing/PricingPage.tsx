"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { toast, Breadcrumbs } from "@/components/admin/ui";

type CategoryRow = {
  category: string;
  currentPrice: number; // cents
  rooms: number;
  mixed: boolean;
};

type LocationRow = {
  id: string;
  name: string;
  city: string;
  slug: string;
  categories: CategoryRow[];
};

/** Canonical cheap-to-expensive order for column sort. Keeps gaps
 *  aligned across locations even when some categories are missing. */
const CATEGORY_ORDER = [
  "BASIC_PLUS",
  "MIGHTY",
  "PREMIUM",
  "PREMIUM_BALCONY",
  "PREMIUM_PLUS",
  "PREMIUM_PLUS_BALCONY",
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "DUPLEX",
];

/** Hardcoded couples surcharge mirrored from app/api/booking/route.ts.
 *  If we ever move this to a config table, update both sides. */
const COUPLES_SURCHARGE_CENTS = 5000;

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function fmtEur(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Median of a number array (for heatmap baseline). Empty → 0. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export default function PricingPage({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();

  // Column set = union of all categories across locations, in CATEGORY_ORDER.
  const activeCategories = useMemo(
    () =>
      CATEGORY_ORDER.filter((cat) =>
        locations.some((loc) => loc.categories.some((c) => c.category === cat))
      ),
    [locations]
  );

  // Per-category median for heatmap baseline. Only counts cells that exist.
  const categoryMedians = useMemo(() => {
    const m = new Map<string, number>();
    for (const cat of activeCategories) {
      const prices = locations
        .flatMap((loc) => loc.categories.filter((c) => c.category === cat))
        .map((c) => c.currentPrice);
      m.set(cat, median(prices));
    }
    return m;
  }, [locations, activeCategories]);

  // Group locations by city, preserving input order within each group.
  const byCity = useMemo(() => {
    const groups = new Map<string, LocationRow[]>();
    for (const loc of locations) {
      const arr = groups.get(loc.city) ?? [];
      arr.push(loc);
      groups.set(loc.city, arr);
    }
    return Array.from(groups.entries());
  }, [locations]);

  // ── Dirty tracking for "Save all" ─────────────────────────────
  // key = `${locationId}::${category}`, value = { cents, rooms, label }
  const [dirty, setDirty] = useState<
    Map<string, { cents: number; rooms: number; label: string }>
  >(new Map());
  const [saveSignal, setSaveSignal] = useState(0);
  const [bulkSaving, setBulkSaving] = useState(false);

  const onDirtyChange = useCallback(
    (
      key: string,
      payload: { cents: number; rooms: number; label: string } | null
    ) => {
      setDirty((prev) => {
        const next = new Map(prev);
        if (payload) next.set(key, payload);
        else next.delete(key);
        return next;
      });
    },
    []
  );

  async function saveAll() {
    if (dirty.size === 0) return;
    const summary = Array.from(dirty.values())
      .map((d) => `• ${d.label}: €${fmtEur(d.cents)} (${d.rooms} Zimmer)`)
      .join("\n");
    if (
      !confirm(
        `${dirty.size} Preisänderung${dirty.size === 1 ? "" : "en"} speichern?\n\n${summary}\n\nWirkt sofort für alle neuen Buchungen.`
      )
    ) {
      return;
    }
    setBulkSaving(true);
    setSaveSignal((s) => s + 1); // cells pick this up and save without their own confirm
    // Each cell's POST completes independently; wait a beat then refresh.
    // (A cleaner approach would be to lift the fetch itself, but the
    // per-cell dispatch keeps the save logic colocated with the input.)
    setTimeout(() => {
      setBulkSaving(false);
      router.refresh();
    }, 600);
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <Breadcrumbs items={[{ label: "Pricing" }]} />
                    <h1 className="text-2xl font-bold text-black">Pricing</h1>
          <p className="text-sm text-gray mt-1">
            Preise gelten ab sofort für alle <strong>neuen</strong> Buchungen
            dieser Kategorie an der Location. Bestehende Mieter behalten den
            beim Vertragsabschluss vereinbarten Preis — ihre laufende Miete
            ist davon nicht betroffen.
          </p>
        </div>
        <div className="text-xs text-gray bg-background-alt border border-lightgray rounded-[5px] px-3 py-2">
          Zuschlag 2 Personen:{" "}
          <strong className="text-black">
            €{fmtEur(COUPLES_SURCHARGE_CENTS)}
          </strong>
          /Monat
          <span className="block text-[10px] text-gray/70 mt-0.5">
            (hardcoded in booking route)
          </span>
        </div>
      </div>

      {dirty.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-[5px] px-4 py-2">
          <span className="text-sm text-yellow-900">
            <strong>{dirty.size}</strong> unsaved change
            {dirty.size === 1 ? "" : "s"}
          </span>
          <button
            onClick={saveAll}
            disabled={bulkSaving}
            className="px-3 py-1.5 text-sm rounded-[5px] bg-black text-white hover:bg-black/90 disabled:opacity-40"
          >
            {bulkSaving ? "Saving…" : "Save all"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="border-b border-lightgray bg-background-alt">
                <th className="sticky left-0 bg-background-alt px-4 py-3 text-left text-xs text-gray uppercase tracking-wide z-10 min-w-[200px]">
                  Location
                </th>
                {activeCategories.map((cat) => (
                  <th
                    key={cat}
                    className="px-3 py-3 text-left text-xs text-gray uppercase tracking-wide whitespace-nowrap"
                  >
                    {formatCategory(cat)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byCity.map(([city, cityLocs]) => (
                <CityGroup
                  key={city}
                  city={city}
                  locations={cityLocs}
                  activeCategories={activeCategories}
                  categoryMedians={categoryMedians}
                  onDirtyChange={onDirtyChange}
                  saveSignal={saveSignal}
                  colCount={activeCategories.length + 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CityGroup({
  city,
  locations,
  activeCategories,
  categoryMedians,
  onDirtyChange,
  saveSignal,
  colCount,
}: {
  city: string;
  locations: LocationRow[];
  activeCategories: string[];
  categoryMedians: Map<string, number>;
  onDirtyChange: (
    key: string,
    payload: { cents: number; rooms: number; label: string } | null
  ) => void;
  saveSignal: number;
  colCount: number;
}) {
  return (
    <>
      <tr className="bg-background-alt/60">
        <td
          colSpan={colCount}
          className="sticky left-0 px-4 py-1.5 text-[11px] uppercase tracking-wider text-gray font-semibold border-b border-lightgray/50"
        >
          {city} · {locations.length} location{locations.length === 1 ? "" : "s"}
        </td>
      </tr>
      {locations.map((loc) => (
        <tr
          key={loc.id}
          className="border-b border-lightgray/50 hover:bg-background-alt/40"
        >
          <td className="sticky left-0 bg-white px-4 py-3 align-top z-10 border-r border-lightgray/50">
            <div className="font-medium text-black">{loc.name}</div>
            <Link
              href={`/admin/rooms?location=${loc.id}`}
              className="text-[11px] text-gray hover:text-black inline-flex items-center gap-0.5 mt-0.5"
            >
              {loc.categories.reduce((s, c) => s + c.rooms, 0)} rooms
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </td>
          {activeCategories.map((cat) => {
            const row = loc.categories.find((c) => c.category === cat);
            return (
              <td key={cat} className="px-2 py-2 align-top">
                {row ? (
                  <CategoryCellEditor
                    locationId={loc.id}
                    locationName={loc.name}
                    row={row}
                    categoryMedian={categoryMedians.get(cat) ?? 0}
                    onDirtyChange={onDirtyChange}
                    saveSignal={saveSignal}
                  />
                ) : (
                  <div className="text-xs text-lightgray px-1 py-2">—</div>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function CategoryCellEditor({
  locationId,
  locationName,
  row,
  categoryMedian,
  onDirtyChange,
  saveSignal,
}: {
  locationId: string;
  locationName: string;
  row: CategoryRow;
  categoryMedian: number;
  onDirtyChange: (
    key: string,
    payload: { cents: number; rooms: number; label: string } | null
  ) => void;
  saveSignal: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(fmtEur(row.currentPrice));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const key = `${locationId}::${row.category}`;
  const parsedCents = Math.round(parseFloat(value.replace(",", ".")) * 100);
  const valid = Number.isFinite(parsedCents) && parsedCents >= 0;
  const dirty = valid && parsedCents !== row.currentPrice;
  const delta = dirty ? parsedCents - row.currentPrice : 0;

  // Resync when the server snapshot changes (after refresh post-save).
  useEffect(() => {
    setValue(fmtEur(row.currentPrice));
  }, [row.currentPrice]);

  // Flash "Saved" badge briefly.
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  // Report dirty state to parent so the "Save all" banner can reflect it.
  useEffect(() => {
    onDirtyChange(
      key,
      dirty
        ? {
            cents: parsedCents,
            rooms: row.rooms,
            label: `${locationName} ${formatCategory(row.category)}`,
          }
        : null
    );
  }, [
    key,
    dirty,
    parsedCents,
    row.rooms,
    row.category,
    locationName,
    onDirtyChange,
  ]);

  // Cleanup on unmount so stale entries don't linger.
  useEffect(() => {
    return () => onDirtyChange(key, null);
  }, [key, onDirtyChange]);

  const saveInner = useCallback(
    async (skipConfirm: boolean) => {
      if (!dirty || !valid) return;
      if (
        !skipConfirm &&
        !confirm(
          `Preis für ${formatCategory(row.category)} auf €${fmtEur(
            parsedCents
          )} ändern? Wirkt sofort für alle neuen Buchungen (${row.rooms} Zimmer).`
        )
      ) {
        return;
      }
      setSaving(true);
      try {
        const res = await fetch("/api/admin/rooms/batch-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId,
            category: row.category,
            monthlyRent: parsedCents,
          }),
        });
        if (res.ok) {
          setJustSaved(true);
          if (!skipConfirm) router.refresh(); // parent handles refresh in bulk mode
        } else {
          const data = await res.json().catch(() => ({}));
          if (!skipConfirm) toast.error("Save failed", { description: data.error ?? res.statusText });
        }
      } finally {
        setSaving(false);
      }
    },
    [dirty, valid, parsedCents, row.rooms, row.category, locationId, router]
  );

  // Bulk save: parent bumps saveSignal → cell saves silently if dirty.
  useEffect(() => {
    if (saveSignal === 0) return; // initial
    if (dirty && valid) void saveInner(true);
    // intentionally not depending on dirty/valid — only react to saveSignal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  // ── Heatmap baseline (within category, across locations) ──
  // Tint only for non-dirty cells so the user isn't misled while editing.
  let tintClass = "";
  if (!dirty && categoryMedian > 0) {
    const pctFromMedian =
      (row.currentPrice - categoryMedian) / categoryMedian;
    if (pctFromMedian > 0.05) tintClass = "bg-red-50";
    else if (pctFromMedian < -0.05) tintClass = "bg-green-50";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void saveInner(false);
    if (e.key === "Escape") setValue(fmtEur(row.currentPrice));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray pointer-events-none">
            €
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-24 pl-5 pr-2 py-1.5 border rounded-[5px] text-sm tabular-nums text-right ${
              !valid
                ? "border-red-400"
                : dirty
                  ? "border-black bg-yellow-50"
                  : `border-lightgray ${tintClass}`
            }`}
            aria-label={`${formatCategory(row.category)} monthly rent`}
          />
        </div>
        {dirty && valid && (
          <button
            onClick={() => void saveInner(false)}
            disabled={saving}
            className="px-2 py-1 text-xs rounded-[5px] bg-black text-white hover:bg-black/90 disabled:opacity-40"
            title="Save (or press Enter)"
          >
            {saving ? "…" : "✓"}
          </button>
        )}
        {justSaved && !dirty && (
          <Check className="w-3.5 h-3.5 text-green-700" aria-label="Saved" />
        )}
      </div>
      {((dirty && valid) || row.mixed) && (
        <div className="flex items-center gap-1 text-[10px] text-gray px-1">
          {dirty && valid && (
            <span
              className={`tabular-nums ${
                delta > 0 ? "text-green-700" : "text-red-600"
              }`}
            >
              {delta > 0 ? "+" : ""}€{fmtEur(Math.abs(delta))}
            </span>
          )}
          {row.mixed && (
            <span
              className="inline-flex items-center gap-0.5 text-orange-600"
              title="Zimmer dieser Kategorie haben unterschiedliche Preise in der DB. Beim Speichern werden alle auf den neuen Wert gesetzt."
            >
              <AlertTriangle className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
