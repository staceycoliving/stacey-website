"use client";

import { useMemo, useState } from "react";

// Airbnb-style calendar: availability is expressed per-day as the set of
// concrete (property, category) slots that still have sellableCount ≥ 1
// on that day. Passed in via `availableSlotsPerDate`.
//
//   Check-in valid  ⇔  at least one slot stays free for minNights
//                       consecutive days starting from this date.
//   Check-out valid ⇔  at least one slot stays free for EVERY night
//                       between the selected check-in and this date.
//
// If `availableSlotsPerDate` is undefined, the calendar falls back to
// the old "all non-past dates clickable" behaviour.

type CalendarMode = "pick-checkin" | "pick-checkout";

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarMonth({
  month,
  year,
  checkIn,
  checkOut,
  onSelect,
  isDateDisabled,
  isDateInSelectableRange,
}: {
  month: number;
  year: number;
  checkIn: string | null;
  checkOut: string | null;
  onSelect: (date: string) => void;
  isDateDisabled: (date: string) => boolean;
  isDateInSelectableRange: (date: string) => boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const isInRange = (dateStr: string) => {
    if (!checkIn || !checkOut) return false;
    return dateStr > checkIn && dateStr < checkOut;
  };

  return (
    <div>
      <p className="mb-2 text-center text-sm font-semibold">{monthName}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="py-1 font-medium text-gray">{d}</span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const dateStr = fmt(date);
          const isPast = date < today;
          const isCheckIn = dateStr === checkIn;
          const isCheckOut = dateStr === checkOut;
          const isSelected = isCheckIn || isCheckOut;
          const inRange = isInRange(dateStr);
          // Out-of-range is still clickable for check-in re-pick,
          // but non-selectable dates get the grey/strike treatment.
          const disabled = isPast || (!isSelected && isDateDisabled(dateStr));
          const isSelectable = !isPast && !disabled && isDateInSelectableRange(dateStr);

          return (
            <button
              key={day}
              disabled={disabled}
              aria-label={disabled ? `${dateStr} — not available` : dateStr}
              onClick={() => onSelect(dateStr)}
              className={`rounded-[3px] py-1.5 text-xs transition-colors ${
                isPast
                  ? "cursor-not-allowed text-[#D9D9D9]"
                  : disabled
                    ? "cursor-not-allowed text-[#D9D9D9] line-through"
                    : isSelected
                      ? "bg-black font-bold text-white"
                      : inRange
                        ? "bg-pink/30 text-black"
                        : isSelectable
                          ? "text-black hover:bg-[#F5F5F5]"
                          : "text-black/60 hover:bg-[#F5F5F5]"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DualCalendar({
  checkIn,
  checkOut,
  onSelect,
  onClear,
  availableSlotsPerDate,
  minNights = 5,
  maxNights,
}: {
  checkIn: string | null;
  checkOut: string | null;
  onSelect: (date: string) => void;
  /** If provided, a "Clear" link appears in the header whenever any date
   *  is picked, letting the user reset and start over. */
  onClear?: () => void;
  /** Per-date list of "slug:CATEGORY" slots that still have a free unit
   *  on that date. When provided, the calendar runs in Airbnb mode:
   *  check-in greying + dynamic check-out greying from the selected
   *  check-in onward. */
  availableSlotsPerDate?: Record<string, string[]>;
  /** Minimum stay length in nights — check-outs closer than this to the
   *  selected check-in are disabled. Defaults to 5 for SHORT stays, but
   *  callers should override with the apaleo-sourced value. */
  minNights?: number;
  /** Maximum stay length in nights — check-outs further away than this
   *  are disabled. Undefined = unlimited. */
  maxNights?: number;
}) {
  const [baseMonth, setBaseMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const next =
    baseMonth.month === 11
      ? { month: 0, year: baseMonth.year + 1 }
      : { month: baseMonth.month + 1, year: baseMonth.year };

  const prev = () =>
    setBaseMonth((b) =>
      b.month === 0 ? { month: 11, year: b.year - 1 } : { month: b.month - 1, year: b.year },
    );
  const fwd = () =>
    setBaseMonth((b) =>
      b.month === 11 ? { month: 0, year: b.year + 1 } : { month: b.month + 1, year: b.year },
    );

  // Determine mode: we're picking a check-out iff check-in is set and
  // check-out isn't.
  const mode: CalendarMode =
    checkIn && !checkOut ? "pick-checkout" : "pick-checkin";

  // Pre-compute, per potential check-in D, the set of check-out dates E
  // that produce a bookable range [D..E-1]. We only bother computing
  // this for the CURRENTLY selected check-in in check-out mode.
  const validCheckOutSet = useMemo(() => {
    if (mode !== "pick-checkout" || !availableSlotsPerDate || !checkIn) return null;
    const validSet = new Set<string>();
    // Start with the full set of slots free on the check-in day.
    const startSlots = availableSlotsPerDate[checkIn];
    if (!startSlots || startSlots.length === 0) return validSet;
    let currentSlots = new Set(startSlots);
    // E is the check-out date; the range covered is [checkIn..E-1],
    // so E=checkIn+1 means a 1-night stay (checkIn is the one covered).
    // We require E-checkIn ≥ minNights nights booked.
    let cursor = checkIn;
    // Walk forward, intersecting daily slot sets. As soon as the
    // running intersection becomes empty, no further E's are valid.
    const hardMax = maxNights ?? 365;
    for (let n = 1; n <= hardMax; n++) {
      const dayBooked = cursor; // the night ending at E covers the day `cursor` (= E-1)
      // Intersect
      const dayAvail = new Set(availableSlotsPerDate[dayBooked] ?? []);
      for (const s of currentSlots) if (!dayAvail.has(s)) currentSlots.delete(s);
      if (currentSlots.size === 0) break;
      const E = addDaysISO(checkIn, n);
      if (n >= minNights) validSet.add(E);
      cursor = E;
      // If the next day's data isn't in the map, stop — beyond our
      // knowledge window.
      if (availableSlotsPerDate[cursor] === undefined) break;
    }
    return validSet;
  }, [mode, availableSlotsPerDate, checkIn, minNights, maxNights]);

  // Cache for "can this date start a minNights-long stay?" in check-in mode.
  const validCheckInSet = useMemo(() => {
    if (!availableSlotsPerDate) return null;
    const validSet = new Set<string>();
    const dates = Object.keys(availableSlotsPerDate).sort();
    for (const D of dates) {
      let slots = new Set(availableSlotsPerDate[D] ?? []);
      if (slots.size === 0) continue;
      let ok = true;
      for (let n = 1; n < minNights; n++) {
        const next = addDaysISO(D, n);
        const nextSlots = availableSlotsPerDate[next];
        if (nextSlots === undefined) {
          // Beyond data horizon — treat as blocked for safety.
          ok = false;
          break;
        }
        const nextSet = new Set(nextSlots);
        for (const s of slots) if (!nextSet.has(s)) slots.delete(s);
        if (slots.size === 0) {
          ok = false;
          break;
        }
      }
      if (ok) validSet.add(D);
    }
    return validSet;
  }, [availableSlotsPerDate, minNights]);

  function isDateDisabled(dateStr: string): boolean {
    if (!availableSlotsPerDate) return false;
    if (mode === "pick-checkout") {
      if (!checkIn) return false;
      // Allow dates before the current check-in to act as a new check-in.
      if (dateStr <= checkIn) return !(validCheckInSet?.has(dateStr) ?? true);
      // After check-in: only dates in validCheckOutSet are clickable.
      return !(validCheckOutSet?.has(dateStr) ?? false);
    }
    // pick-checkin mode
    return !(validCheckInSet?.has(dateStr) ?? true);
  }

  // "Selectable range" = the range that is live-clickable in current
  // mode. Used only to dim dates that are neither selected nor in the
  // active-selection range so the check-out picker visually focuses.
  function isDateInSelectableRange(dateStr: string): boolean {
    if (!availableSlotsPerDate) return true;
    if (mode === "pick-checkout") {
      return validCheckOutSet?.has(dateStr) ?? false;
    }
    return validCheckInSet?.has(dateStr) ?? true;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={prev} className="p-1 text-gray hover:text-black" aria-label="Previous month">&larr;</button>
        {onClear && (checkIn || checkOut) && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-[3px] px-2 py-1 text-[11px] font-semibold text-gray hover:bg-[#F5F5F5] hover:text-black"
          >
            Clear
          </button>
        )}
        <button onClick={fwd} className="p-1 text-gray hover:text-black" aria-label="Next month">&rarr;</button>
      </div>
      <div className="grid grid-cols-1 gap-6 min-[420px]:grid-cols-2">
        <CalendarMonth
          month={baseMonth.month}
          year={baseMonth.year}
          checkIn={checkIn}
          checkOut={checkOut}
          onSelect={onSelect}
          isDateDisabled={isDateDisabled}
          isDateInSelectableRange={isDateInSelectableRange}
        />
        <div className="hidden min-[420px]:block">
          <CalendarMonth
            month={next.month}
            year={next.year}
            checkIn={checkIn}
            checkOut={checkOut}
            onSelect={onSelect}
            isDateDisabled={isDateDisabled}
            isDateInSelectableRange={isDateInSelectableRange}
          />
        </div>
      </div>
    </div>
  );
}
