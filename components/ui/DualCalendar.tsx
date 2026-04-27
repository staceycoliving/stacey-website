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
  hoveredDate,
  onHoverDate,
  onSelect,
  isDateDisabled,
  isDateInSelectableRange,
}: {
  month: number;
  year: number;
  checkIn: string | null;
  checkOut: string | null;
  /** Date currently hovered while in pick-checkout mode, used to draw
   *  a Stacey-pink range preview. Null when nothing is hovered. */
  hoveredDate: string | null;
  onHoverDate: (date: string | null) => void;
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

  // Preview range while picking check-out: between selected check-in
  // and currently hovered date. Lights up days in stacey-pink so the
  // user sees their proposed stay before committing.
  const isInHoverRange = (dateStr: string) => {
    if (!checkIn || checkOut || !hoveredDate) return false;
    if (hoveredDate <= checkIn) return false;
    return dateStr > checkIn && dateStr <= hoveredDate;
  };

  return (
    <div>
      <p className="mb-2 text-center text-sm font-semibold">{monthName}</p>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="py-1 text-[11px] font-medium text-gray">{d}</span>
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

          const inHoverRange = isInHoverRange(dateStr);
          return (
            <button
              key={day}
              disabled={disabled}
              aria-label={disabled ? `${dateStr}, not available` : dateStr}
              onClick={() => onSelect(dateStr)}
              onMouseEnter={() => !disabled && onHoverDate(dateStr)}
              onMouseLeave={() => onHoverDate(null)}
              className={`rounded-[3px] py-2.5 text-sm transition-colors ${
                isPast
                  ? "cursor-not-allowed text-[#D9D9D9]"
                  : isSelected
                    ? "bg-black font-bold text-white"
                    : // Range-fills override the disabled grey-out:
                      // those days are part of the user's stay (they're
                      // sleeping there), so they need to read as
                      // "yours" even if the slot itself is sold-out
                      // for new check-ins.
                      inRange
                      ? "bg-pink/30 text-black"
                      : inHoverRange
                        ? "bg-pink/20 text-black"
                        : disabled
                          ? "cursor-not-allowed text-[#D9D9D9] line-through"
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
  scrollMonths = false,
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
  /** Minimum stay length in nights, check-outs closer than this to the
   *  selected check-in are disabled. Defaults to 5 for SHORT stays, but
   *  callers should override with the apaleo-sourced value. */
  minNights?: number;
  /** Maximum stay length in nights, check-outs further away than this
   *  are disabled. Undefined = unlimited. */
  maxNights?: number;
  /** Mobile-style multi-month scroll mode: renders 6 months stacked
   *  vertically with no prev/next arrow navigation. The parent container
   *  handles the scroll. Best inside a full-screen modal. */
  scrollMonths?: boolean;
}) {
  const [baseMonth, setBaseMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  // Hover state for the range preview while picking check-out. Lives
  // on the parent so both rendered months share the same tracked
  // date and a hover from one month previews into the next.
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

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
    const currentSlots = new Set(startSlots);
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
      // If the next day's data isn't in the map, stop, beyond our
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
      const slots = new Set(availableSlotsPerDate[D] ?? []);
      if (slots.size === 0) continue;
      let ok = true;
      for (let n = 1; n < minNights; n++) {
        const next = addDaysISO(D, n);
        const nextSlots = availableSlotsPerDate[next];
        if (nextSlots === undefined) {
          // Beyond data horizon, treat as blocked for safety.
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

  // Reusable Clear-badge so both layouts (paged + scrollMonths) share
  // the exact same control.
  const clearBadge = onClear && (checkIn || checkOut) ? (
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear selected dates"
      className="group inline-flex items-center gap-1.5 rounded-[5px] bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-sm transition-all duration-200 hover:scale-[1.04] hover:bg-black/85 hover:shadow-md"
    >
      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5 transition-transform duration-200 group-hover:rotate-90"
        aria-hidden
      >
        <path
          d="M3 3 L9 9 M9 3 L3 9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      Clear
    </button>
  ) : null;

  // Mobile-style multi-month scroll: render 6 months stacked vertically
  // with no prev/next nav. Parent controls the overall scroll container.
  if (scrollMonths) {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const m = (baseMonth.month + i) % 12;
      const y = baseMonth.year + Math.floor((baseMonth.month + i) / 12);
      return { month: m, year: y };
    });
    return (
      <div>
        {clearBadge && (
          <div className="mb-3 flex justify-end">{clearBadge}</div>
        )}
        <div className="space-y-8">
          {months.map(({ month: m, year: y }) => (
            <CalendarMonth
              key={`${y}-${m}`}
              month={m}
              year={y}
              checkIn={checkIn}
              checkOut={checkOut}
              hoveredDate={hoveredDate}
              onHoverDate={setHoveredDate}
              onSelect={onSelect}
              isDateDisabled={isDateDisabled}
              isDateInSelectableRange={isDateInSelectableRange}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={prev} className="p-1 text-gray hover:text-black" aria-label="Previous month">&larr;</button>
        {clearBadge}
        <button onClick={fwd} className="p-1 text-gray hover:text-black" aria-label="Next month">&rarr;</button>
      </div>
      <div className="grid grid-cols-1 gap-6 min-[420px]:grid-cols-2">
        <CalendarMonth
          month={baseMonth.month}
          year={baseMonth.year}
          checkIn={checkIn}
          checkOut={checkOut}
          hoveredDate={hoveredDate}
          onHoverDate={setHoveredDate}
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
            hoveredDate={hoveredDate}
            onHoverDate={setHoveredDate}
            onSelect={onSelect}
            isDateDisabled={isDateDisabled}
            isDateInSelectableRange={isDateInSelectableRange}
          />
        </div>
      </div>
    </div>
  );
}
