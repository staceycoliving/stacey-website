"use client";

import { useState } from "react";

function CalendarMonth({
  month,
  year,
  checkIn,
  checkOut,
  onSelect,
  unavailable,
}: {
  month: number;
  year: number;
  checkIn: string | null;
  checkOut: string | null;
  onSelect: (date: string) => void;
  unavailable: Set<string>;
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
          const isUnavailable = !isPast && unavailable.has(dateStr);
          const isCheckIn = dateStr === checkIn;
          const isCheckOut = dateStr === checkOut;
          const isSelected = isCheckIn || isCheckOut;
          const inRange = isInRange(dateStr);

          return (
            <button
              key={day}
              disabled={isPast || isUnavailable}
              aria-label={
                isUnavailable ? `${dateStr} — not available` : dateStr
              }
              onClick={() => onSelect(dateStr)}
              className={`rounded-[3px] py-1.5 text-xs transition-colors ${
                isPast
                  ? "cursor-not-allowed text-[#D9D9D9]"
                  : isUnavailable
                    ? "cursor-not-allowed text-[#D9D9D9] line-through"
                    : isSelected
                      ? "bg-black font-bold text-white"
                      : inRange
                        ? "bg-pink/30 text-black"
                        : "text-black hover:bg-[#F5F5F5]"
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
  unavailableDates,
}: {
  checkIn: string | null;
  checkOut: string | null;
  onSelect: (date: string) => void;
  /** Optional set of YYYY-MM-DD strings that should be rendered as
   *  disabled/strikethrough — fully-booked dates from the live
   *  availability API. */
  unavailableDates?: string[];
}) {
  const unavailable = new Set(unavailableDates ?? []);
  const [baseMonth, setBaseMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const next = baseMonth.month === 11
    ? { month: 0, year: baseMonth.year + 1 }
    : { month: baseMonth.month + 1, year: baseMonth.year };

  const prev = () =>
    setBaseMonth((b) =>
      b.month === 0
        ? { month: 11, year: b.year - 1 }
        : { month: b.month - 1, year: b.year }
    );
  const fwd = () =>
    setBaseMonth((b) =>
      b.month === 11
        ? { month: 0, year: b.year + 1 }
        : { month: b.month + 1, year: b.year }
    );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={prev} className="p-1 text-gray hover:text-black">&larr;</button>
        <button onClick={fwd} className="p-1 text-gray hover:text-black">&rarr;</button>
      </div>
      <div className="grid grid-cols-1 gap-6 min-[420px]:grid-cols-2">
        <CalendarMonth month={baseMonth.month} year={baseMonth.year} checkIn={checkIn} checkOut={checkOut} onSelect={onSelect} unavailable={unavailable} />
        <div className="hidden min-[420px]:block">
          <CalendarMonth month={next.month} year={next.year} checkIn={checkIn} checkOut={checkOut} onSelect={onSelect} unavailable={unavailable} />
        </div>
      </div>
    </div>
  );
}
