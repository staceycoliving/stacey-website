"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import DualCalendar from "@/components/ui/DualCalendar";
import type { StayType } from "@/lib/data";

// ─── Shared search fields (full = 100vh intro, compact = above results) ───
export default function SearchFields({
  stayType, onStayType,
  persons, onPersons,
  city, onCity,
  checkIn, checkOut, onCalendarSelect, onCalendarClear,
  moveInDate, onMoveInDate,
  moveInOptions, loadingDates,
  nightCount, tooShort,
  variant,
  tone = "light",
  calendarOpenExternal,
  setCalendarOpenExternal,
  onSubmit,
}: {
  stayType: StayType | null; onStayType: (t: StayType) => void;
  persons: 1 | 2; onPersons: (p: 1 | 2) => void;
  city: string; onCity: (c: string) => void;
  checkIn: string | null; checkOut: string | null; onCalendarSelect: (d: string) => void;
  onCalendarClear?: () => void;
  moveInDate: string | null; onMoveInDate: (d: string | null) => void;
  moveInOptions: { value: string; label: string }[]; loadingDates: boolean;
  nightCount: number; tooShort: boolean;
  variant: "full" | "compact";
  // "dark" = pills repaint for dark-glass surfaces (used inside the
  // navbar's slide-down editor panel on /move-in). Default "light"
  // keeps the existing on-white treatment everywhere else.
  tone?: "light" | "dark";
  calendarOpenExternal?: boolean;
  setCalendarOpenExternal?: (open: boolean) => void;
  onSubmit?: () => void;
}) {
  const isCompact = variant === "compact";
  const [calendarOpenInternal, setCalendarOpenInternal] = useState(false);
  const calendarOpen = calendarOpenExternal ?? calendarOpenInternal;
  const setCalendarOpen = setCalendarOpenExternal ?? setCalendarOpenInternal;

  // Submit-button feedback after a date selection commits the form.
  //   LONG: smooth-scroll + auto-focus, because the day-pill grid is
  //         inline and the button might be off-screen.
  //   SHORT: auto-focus only (no scroll), because the calendar pops up
  //         as a panel right above the form and the button is already
  //         in view when the user closes the calendar.
  // We track the previous date values and re-trigger the scroll/focus
  // every time the user picks a different date while the form is
  // ready, not just on the initial transition. Otherwise repicking a
  // move-in date (or check-in/out for SHORT) would fail to re-scroll
  // the user back to the submit button.
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevMoveInRef = useRef<string | null>(null);
  const prevCheckInRef = useRef<string | null>(null);
  const prevCheckOutRef = useRef<string | null>(null);
  useEffect(() => {
    // Snapshot what changed since the last run before updating refs,
    // otherwise the comparison would always evaluate false.
    const moveInChanged = prevMoveInRef.current !== moveInDate;
    const checkInChanged = prevCheckInRef.current !== checkIn;
    const checkOutChanged = prevCheckOutRef.current !== checkOut;
    prevMoveInRef.current = moveInDate;
    prevCheckInRef.current = checkIn;
    prevCheckOutRef.current = checkOut;

    const ready =
      (stayType === "SHORT" && !!checkIn && !!checkOut && !tooShort) ||
      (stayType === "LONG" && !!city && !!moveInDate);
    if (!ready) return;

    const dateChanged =
      (stayType === "LONG" && moveInChanged) ||
      (stayType === "SHORT" && (checkInChanged || checkOutChanged));
    if (!dateChanged) return;

    const btn = submitButtonRef.current;
    if (!btn) return;
    if (stayType === "LONG") {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => btn.focus({ preventScroll: true }), 600);
    } else {
      window.setTimeout(() => btn.focus({ preventScroll: true }), 200);
    }
  }, [stayType, checkIn, checkOut, tooShort, city, moveInDate]);

  // Fetch per-date slot availability across all SHORT properties so the
  // calendar can do Airbnb-style dynamic greying, check-in valid iff a
  // 5-night run is possible from that date; after pick, check-out valid
  // iff every night in the candidate range has a consistent free slot.
  // Re-fetches when `persons` changes because availability differs for
  // couples (fewer categories qualify).
  const [availableSlotsPerDate, setAvailableSlotsPerDate] = useState<
    Record<string, string[]> | undefined
  >(undefined);
  // min/max stay come live from apaleo, changing them in apaleo reflects
  // here within the 30-min edge cache window.
  const [apaleoMinNights, setApaleoMinNights] = useState<number | undefined>(undefined);
  const [apaleoMaxNights, setApaleoMaxNights] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (stayType !== "SHORT") return;
    let cancelled = false;
    fetch(`/api/short-availability-calendar?persons=${persons}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) {
          setAvailableSlotsPerDate(data.data.availableSlotsPerDate ?? {});
          if (typeof data.data.minNights === "number") setApaleoMinNights(data.data.minNights);
          if (typeof data.data.maxNights === "number") setApaleoMaxNights(data.data.maxNights);
        }
      })
      .catch(() => {
        /* silently ignore, calendar falls back to accepting any date */
      });
    return () => {
      cancelled = true;
    };
  }, [stayType, persons]);

  const formatDateShort = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (isCompact) {
    // ─── Compact: iOS-style segmented pill groups ───
    // Each filter is a segmented control (group of pills sharing a rounded
    // track). Stay-type buttons surface the page-wide colour identity
    // when active (LONG = pink, SHORT = black) so the filter bar reads
    // the same language as the badges on Locations / Map / FAQ. Other
    // filters keep the neutral white-on-grey active treatment.
    const isDark = tone === "dark";
    const segmentTrack = clsx(
      "flex shrink-0 gap-1 rounded-[5px] p-1",
      isDark ? "bg-white/10 ring-1 ring-white/10" : "bg-[#F5F5F5]",
    );
    const segmentBtn = (active: boolean, accent: "neutral" | "pink" | "black" = "neutral") =>
      clsx(
        "rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-all duration-150",
        active
          ? accent === "pink"
            ? "bg-pink text-black shadow-sm"
            : accent === "black"
              ? isDark
                ? "bg-white text-black shadow-sm"
                : "bg-black text-white shadow-sm"
              : isDark
                ? "bg-white text-black shadow-sm"
                : "bg-white text-black shadow-sm"
          : isDark
            ? "text-white/70 hover:text-white"
            : "text-gray hover:text-black",
      );

    const labelCls = clsx(
      "block text-[10px] font-bold uppercase tracking-[0.18em]",
      isDark ? "text-white/50" : "text-gray",
    );

    return (
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {/* Stay length */}
        <div>
          <p className={clsx(labelCls, "mb-1.5")}>Stay length</p>
          <div role="radiogroup" aria-label="Stay type" className={segmentTrack}>
            {(["SHORT", "LONG"] as StayType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={stayType === t}
                onClick={() => onStayType(t)}
                className={clsx(segmentBtn(stayType === t, t === "SHORT" ? "black" : "pink"), "flex-1")}
              >
                {t === "SHORT" ? "Short" : "Long"}
              </button>
            ))}
          </div>
        </div>

        {/* Who */}
        <div>
          <p className={clsx(labelCls, "mb-1.5")}>Who</p>
          <div role="radiogroup" aria-label="Persons" className={segmentTrack}>
            {([1, 2] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={persons === p}
                onClick={() => onPersons(p)}
                className={clsx(segmentBtn(persons === p), "flex-1")}
              >
                {p} {p === 1 ? "person" : "persons"}
              </button>
            ))}
          </div>
        </div>

        {/* City (LONG only) */}
        {stayType === "LONG" && (
          <div>
            <p className={clsx(labelCls, "mb-1.5")}>Where</p>
            <div role="radiogroup" aria-label="City" className={segmentTrack}>
              {[
                { value: "hamburg", label: "Hamburg" },
                { value: "berlin", label: "Berlin" },
                { value: "vallendar", label: "Vallendar" },
              ].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={city === c.value}
                  onClick={() => onCity(c.value)}
                  className={clsx(segmentBtn(city === c.value), "flex-1")}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* When */}
        <div className="relative">
          <p className={clsx(labelCls, "mb-1.5")}>{stayType === "SHORT" ? "Dates" : "Move-in"}</p>
          {stayType === "SHORT" ? (
            <>
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-[5px] px-3 py-2 text-xs font-semibold transition-colors",
                  checkIn && checkOut
                    ? isDark
                      ? "bg-white text-black"
                      : "bg-black text-white"
                    : isDark
                      ? "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/15"
                      : "bg-[#F5F5F5] text-black hover:bg-[#E8E6E0]",
                )}
              >
                {checkIn && checkOut
                  ? `${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}`
                  : "Pick dates"}
              </button>
              {/* Fullscreen portal modal. Necessary because the compact
                  variant lives inside the navbar's slide-down editor
                  panel, which has overflow-hidden ancestors that would
                  clip an inline absolute popover. Portal renders into
                  document.body so the modal escapes both the clipping
                  and the navbar's stacking context. */}
              {calendarOpen && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[100] flex flex-col bg-white">
                  <div className="flex flex-shrink-0 items-center gap-3 border-b border-[#E8E6E0] px-5 py-4">
                    <p className="flex-1 truncate text-base font-bold text-black">
                      {!checkIn
                        ? "Pick your check-in"
                        : !checkOut
                          ? "Pick your check-out"
                          : `${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}`}
                    </p>
                    {onCalendarClear && (checkIn || checkOut) && (
                      <button
                        type="button"
                        onClick={onCalendarClear}
                        aria-label="Clear selected dates"
                        className="group inline-flex flex-shrink-0 items-center gap-1.5 rounded-[5px] bg-black px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-sm transition-all duration-200 active:scale-95"
                      >
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 transition-transform duration-200 group-active:rotate-90" aria-hidden>
                          <path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setCalendarOpen(false)}
                      className="group inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black text-white transition-all duration-200 active:scale-95"
                    >
                      <svg viewBox="0 0 12 12" className="h-3 w-3 transition-transform duration-200 group-active:rotate-90" aria-hidden>
                        <path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-5">
                    <div className="mx-auto max-w-md">
                      <DualCalendar
                        checkIn={checkIn}
                        checkOut={checkOut}
                        onSelect={onCalendarSelect}
                        availableSlotsPerDate={availableSlotsPerDate}
                        minNights={apaleoMinNights}
                        maxNights={apaleoMaxNights}
                        scrollMonths
                      />
                    </div>
                  </div>

                  {checkIn && checkOut && (
                    <div className="flex-shrink-0 border-t border-[#E8E6E0] bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                      <div className="flex items-center justify-between gap-3">
                        {tooShort ? (
                          <>
                            <p className="text-base font-bold">{nightCount} nights</p>
                            <p className="text-sm font-semibold text-pink">
                              Stay is too short
                              {apaleoMinNights ? ` (min ${apaleoMinNights})` : ""}
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-2">
                              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-pink">
                                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              </span>
                              <p className="text-sm font-bold text-black">
                                {formatDateShort(checkIn)} <span className="text-pink">&rarr;</span> {formatDateShort(checkOut)}
                              </p>
                            </span>
                            <p className="text-sm font-medium text-gray">{nightCount} nights</p>
                          </>
                        )}
                      </div>
                      {!tooShort && (
                        <button
                          type="button"
                          onClick={() => setCalendarOpen(false)}
                          className="mt-4 block w-full rounded-[5px] bg-black py-3.5 text-center text-base font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] active:opacity-90"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  )}
                </div>,
                document.body,
              )}
            </>
          ) : (
            <select
              value={moveInDate || ""}
              onChange={(e) => onMoveInDate(e.target.value || null)}
              disabled={loadingDates}
              className={clsx(
                "block w-full appearance-none rounded-[5px] px-3 py-2 text-xs font-semibold outline-none transition-colors disabled:opacity-50",
                moveInDate
                  ? "bg-pink text-black"
                  : isDark
                    ? "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/15"
                    : "bg-[#F5F5F5] text-black hover:bg-[#E8E6E0]",
              )}
            >
              <option value="" className="bg-white text-black">
                {loadingDates ? "Loading…" : "Pick move-in"}
              </option>
              {moveInOptions.map((d) => (
                <option key={d.value} value={d.value} className="bg-white text-black">
                  {d.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  // ─── Full: progressive vertical fields (hero overlay) ───
  return (
    <>
      <fieldset className="mt-10 text-center sm:mt-12">
        <legend className="mb-5 block w-full text-base font-semibold text-white sm:text-lg">
          How long do you want to stay?
        </legend>
        <div
          role="radiogroup"
          aria-label="Stay type"
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
        >
          {(["SHORT", "LONG"] as StayType[]).map((t) => {
            // Visual smart-default: LONG looks pre-selected on first
            // load (matches the Booking/Airbnb pattern of pre-selecting
            // the primary path), but the real `stayType` state stays
            // null until the user explicitly clicks. That keeps the
            // booking flow from auto-opening on page load.
            const isCommitted = stayType === t;
            const isVisualDefault = stayType === null && t === "LONG";
            const active = isCommitted || isVisualDefault;
            // Stay-type color identity. Matches the SHORT/LONG badge
            // convention used everywhere else on the page (Map, Locations
            // cards, FAQ splits, scope badges): SHORT is black, LONG is
            // pink. Active state surfaces this colour so the hero teaches
            // the visual language for the rest of the journey.
            const isShort = t === "SHORT";
            const activeStyle = isShort
              ? "bg-black text-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              : "bg-pink text-black shadow-[0_4px_18px_rgba(252,176,192,0.35)] hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(252,176,192,0.50)]";
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={isCommitted}
                onClick={() => onStayType(t)}
                className={clsx(
                  // border-2 border-transparent on active matches the
                  // border-2 on inactive so both buttons keep the exact
                  // same box geometry (no size pop on selection).
                  "flex w-full flex-col items-center gap-1 rounded-[5px] border-2 px-6 py-3.5 text-sm font-extrabold tracking-wide transition-all duration-200 sm:flex-1 sm:px-8 sm:py-4 sm:text-base",
                  active
                    ? `border-transparent ${activeStyle}`
                    : "border-white bg-white/10 text-white backdrop-blur-sm hover:scale-[1.02] hover:bg-white/20",
                )}
              >
                <span>{t === "SHORT" ? "Short stay" : "Long stay"}</span>
                <span
                  className={clsx(
                    "text-xs font-medium sm:text-sm",
                    active
                      ? isShort
                        ? "text-white/75"
                        : "text-black/75"
                      : "text-white/70",
                  )}
                >
                  {t === "SHORT" ? "Up to 3 months" : "From 3 months"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <AnimatePresence>
        {stayType && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="text-center overflow-hidden">
            <div className="mt-8">
              <p id="persons-label" className="mb-5 text-base font-semibold text-white sm:text-lg">Moving in alone or as a couple?</p>
              <div
                role="radiogroup"
                aria-labelledby="persons-label"
                className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={persons === 1}
                  onClick={() => onPersons(1)}
                  className={clsx(
                    "w-full rounded-[5px] px-6 py-3.5 text-sm font-bold transition-all duration-200 sm:w-auto sm:px-8 sm:py-4 sm:text-base",
                    persons === 1
                      ? "bg-white text-black shadow-lg hover:opacity-80"
                      : "border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
                  )}
                >
                  1 person
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={persons === 2}
                  onClick={() => onPersons(2)}
                  className={clsx(
                    "w-full rounded-[5px] px-6 py-3.5 text-sm font-bold transition-all duration-200 sm:w-auto sm:px-8 sm:py-4 sm:text-base",
                    persons === 2
                      ? "bg-white text-black shadow-lg hover:opacity-80"
                      : "border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
                  )}
                >
                  2 persons
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stayType === "LONG" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="text-center overflow-hidden">
            <div className="mt-8">
              <p id="city-label" className="mb-5 text-base font-semibold text-white sm:text-lg">Where do you want to live?</p>
              <div
                role="radiogroup"
                aria-labelledby="city-label"
                className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
              >
                {[{ value: "hamburg", label: "Hamburg" }, { value: "berlin", label: "Berlin" }, { value: "vallendar", label: "Vallendar" }].map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={city === c.value}
                    onClick={() => onCity(c.value)}
                    className={clsx(
                      "w-full rounded-[5px] px-6 py-3.5 text-sm font-bold transition-all duration-200 sm:px-6 sm:py-4 sm:text-base",
                      city === c.value
                        ? "bg-white text-black shadow-lg hover:opacity-80"
                        : "border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {((stayType === "SHORT") || (stayType === "LONG" && city)) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="text-center overflow-hidden">
            <div className="mt-8">
              {stayType === "SHORT" ? (
                <>
                  {/* Single dynamic label, hidden once both dates are
                      committed so the calendar + confirmation row carry
                      the moment without a redundant header. */}
                  {(!checkIn || !checkOut) && (
                    <p className="mb-5 text-base font-semibold text-white sm:text-lg">
                      {!checkIn ? "Pick your check-in" : "Pick your check-out"}
                    </p>
                  )}

                  {/* Mobile: a summary button that opens a full-screen
                      bottom-sheet modal. Saves ~400px of scroll for the
                      inline calendar which otherwise dominates the hero. */}
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(true)}
                    className="block w-full rounded-[5px] bg-white px-5 py-4 text-left shadow-lg sm:hidden"
                  >
                    {checkIn && checkOut ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-black">
                          {formatDateShort(checkIn)} → {formatDateShort(checkOut)}
                        </span>
                        <span className="text-xs text-gray">{nightCount} nights</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray">Tap to pick your dates</span>
                    )}
                  </button>

                  {/* Desktop: inline white card. The Hero form wrapper
                      grows from max-w-xl to max-w-2xl on lg+, so the
                      calendar gets Booking-/Airbnb-style breathing room
                      without needing negative margins (which collided
                      with the hero section's overflow-hidden clip). */}
                  <div className="hidden rounded-[5px] bg-white p-5 text-left shadow-lg sm:block">
                    <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={onCalendarSelect} onClear={onCalendarClear} availableSlotsPerDate={availableSlotsPerDate} minNights={apaleoMinNights} maxNights={apaleoMaxNights} />
                    {availableSlotsPerDate && (
                      <p className="mt-3 text-[11px] text-gray">
                        {checkIn && !checkOut
                          ? "Only check-out dates that keep your room available are selectable."
                          : "Greyed-out dates can't start a valid stay."}
                      </p>
                    )}
                    {checkIn && checkOut && (
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E8E6E0] pt-4">
                        {tooShort ? (
                          <>
                            <p className="text-base font-bold">{nightCount} nights</p>
                            <p className="text-sm font-semibold text-pink">
                              Stay is too short
                              {apaleoMinNights ? ` (min ${apaleoMinNights})` : ""}
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-2">
                              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-pink">
                                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              </span>
                              <p className="text-sm font-bold text-black">
                                {formatDateShort(checkIn)} <span className="text-pink">&rarr;</span> {formatDateShort(checkOut)}
                              </p>
                            </span>
                            <p className="text-sm font-medium text-gray">{nightCount} nights</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mobile-only full-screen modal. Rendered via portal
                      directly into document.body so it escapes the
                      hero's z-30 stacking context, otherwise the global
                      navbar (z-50 at root) would draw over the modal's
                      sticky header. The whole viewport is the calendar
                      surface, scrollable list of months in the middle
                      (Airbnb pattern). Sticky header + footer keep the
                      title, close badge, and confirmation/CTA visible
                      while the user scrolls through months. */}
                  {calendarOpen && typeof document !== "undefined" && createPortal(
                    <div className="fixed inset-0 z-[100] flex flex-col bg-white sm:hidden">
                      {/* Sticky header. Clear-badge sits between the
                          title and the close X so the user can reset
                          from anywhere in the calendar scroll without
                          having to scroll back to the top. */}
                      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[#E8E6E0] px-5 py-4">
                        <p className="flex-1 truncate text-base font-bold text-black">
                          {!checkIn
                            ? "Pick your check-in"
                            : !checkOut
                              ? "Pick your check-out"
                              : `${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}`}
                        </p>
                        {onCalendarClear && (checkIn || checkOut) && (
                          <button
                            type="button"
                            onClick={onCalendarClear}
                            aria-label="Clear selected dates"
                            className="group inline-flex flex-shrink-0 items-center gap-1.5 rounded-[5px] bg-black px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-sm transition-all duration-200 active:scale-95"
                          >
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 transition-transform duration-200 group-active:rotate-90" aria-hidden>
                              <path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                            Clear
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Close"
                          onClick={() => setCalendarOpen(false)}
                          className="group inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black text-white transition-all duration-200 active:scale-95"
                        >
                          <svg viewBox="0 0 12 12" className="h-3 w-3 transition-transform duration-200 group-active:rotate-90" aria-hidden>
                            <path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>

                      {/* Scrollable calendar middle. onClear is omitted
                          here so DualCalendar doesn't render its own
                          inline Clear-badge, the sticky header above
                          owns that action. */}
                      <div className="flex-1 overflow-y-auto px-5 py-5">
                        <DualCalendar
                          checkIn={checkIn}
                          checkOut={checkOut}
                          onSelect={onCalendarSelect}
                          availableSlotsPerDate={availableSlotsPerDate}
                          minNights={apaleoMinNights}
                          maxNights={apaleoMaxNights}
                          scrollMonths
                        />
                      </div>

                      {/* Sticky footer with confirmation row + Done CTA */}
                      {checkIn && checkOut && (
                        <div className="flex-shrink-0 border-t border-[#E8E6E0] bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                          <div className="flex items-center justify-between gap-3">
                            {tooShort ? (
                              <>
                                <p className="text-base font-bold">{nightCount} nights</p>
                                <p className="text-sm font-semibold text-pink">
                                  Stay is too short
                                  {apaleoMinNights ? ` (min ${apaleoMinNights})` : ""}
                                </p>
                              </>
                            ) : (
                              <>
                                <span className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-pink">
                                    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                                      <path d="M2.5 6.5L5 9L9.5 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    </svg>
                                  </span>
                                  <p className="text-sm font-bold text-black">
                                    {formatDateShort(checkIn)} <span className="text-pink">&rarr;</span> {formatDateShort(checkOut)}
                                  </p>
                                </span>
                                <p className="text-sm font-medium text-gray">{nightCount} nights</p>
                              </>
                            )}
                          </div>
                          {!tooShort && (
                            <button
                              type="button"
                              onClick={() => setCalendarOpen(false)}
                              className="mt-4 block w-full rounded-[5px] bg-black py-3.5 text-center text-base font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] active:opacity-90"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      )}
                    </div>,
                    document.body,
                  )}
                </>
              ) : (
                <>
                  <p id="movein-label" className="text-base font-semibold text-white sm:text-lg">When do you want to move in?</p>
                  <p className="mb-5 mt-1 text-xs text-white/65 sm:text-sm">
                    Long stays don&rsquo;t have a fixed move-out. Just pick your move-in day.
                  </p>
                  <div className="rounded-[5px] bg-white p-5 text-left shadow-lg">
                    {loadingDates ? (
                      <p className="py-3 text-center text-sm text-gray">Checking availability…</p>
                    ) : moveInOptions.length === 0 ? (
                      <p className="py-3 text-center text-sm text-gray">No move-in dates available.</p>
                    ) : (
                      <div
                        role="radiogroup"
                        aria-labelledby="movein-label"
                        className="space-y-4"
                      >
                        {groupMoveInOptionsByMonth(moveInOptions).map((group) => (
                          <div key={group.key}>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray">
                              {group.label}
                            </p>
                            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                              {group.days.map((d) => {
                                const isSelected = moveInDate === d.value;
                                // When a date is picked, fade the
                                // unselected days so the user knows
                                // they're done picking. Hover restores
                                // them so a switch is still possible.
                                const isMuted = moveInDate !== null && !isSelected;
                                return (
                                  <button
                                    key={d.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    onClick={() => onMoveInDate(d.value)}
                                    className={clsx(
                                      "rounded-[3px] py-2 text-center text-sm font-semibold transition-all duration-200",
                                      isSelected
                                        ? "bg-black text-white"
                                        : isMuted
                                          ? "bg-[#F5F5F5] text-black/30 hover:bg-[#EDEDED] hover:text-black"
                                          : "bg-[#F5F5F5] text-black hover:bg-[#EDEDED]",
                                    )}
                                  >
                                    {d.day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {moveInDate && (
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E8E6E0] pt-4">
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink">
                            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                              <path d="M2.5 6.5L5 9L9.5 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </span>
                          <p className="text-sm font-semibold text-black">Move-in set</p>
                        </span>
                        <p className="text-sm font-bold">
                          {moveInOptions.find((d) => d.value === moveInDate)?.label ?? moveInDate}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit CTA, shared between homepage hero and /move-in intro so
          behaviour is identical on both surfaces. Always visible once a
          stay-type is picked; disabled state shows a hint of what's still
          needed. Action-oriented label adapts to readiness. */}
      {onSubmit && stayType && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-10"
        >
          {(() => {
            const ready =
              (stayType === "SHORT" && !!checkIn && !!checkOut && !tooShort) ||
              (stayType === "LONG" && !!city && !!moveInDate);
            const missingHint = (() => {
              if (ready) return null;
              if (stayType === "SHORT") {
                if (!checkIn) return "Pick your check-in date to continue.";
                if (!checkOut) return "Now pick check-out.";
                if (tooShort) return "Minimum stay is 5 nights.";
              }
              if (stayType === "LONG") {
                if (!city) return "Pick a city to continue.";
                if (!moveInDate) return "Pick a move-in date to continue.";
              }
              return null;
            })();
            return (
              <>
                <motion.button
                  ref={submitButtonRef}
                  onClick={onSubmit}
                  disabled={!ready}
                  // Once ready, run a one-time pop (key change retriggers
                  // animate) to draw attention as the button lights up,
                  // followed by an infinite gentle pulse so the user
                  // notices it across the auto-scroll. Disabled state
                  // sits still so it doesn't compete with the form fields
                  // above it.
                  key={ready ? "ready" : "idle"}
                  initial={ready ? { scale: 0.96 } : false}
                  animate={
                    ready
                      ? {
                          scale: [1, 1.04, 1],
                          transition: {
                            duration: 1.4,
                            repeat: Infinity,
                            repeatDelay: 1.6,
                            ease: "easeInOut",
                          },
                        }
                      : { scale: 1 }
                  }
                  className={clsx(
                    "inline-flex w-full items-center justify-center gap-2 rounded-[5px] px-10 py-4 text-base font-bold transition-colors duration-200 sm:text-lg",
                    ready
                      ? "bg-black text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)] hover:opacity-90"
                      : "cursor-not-allowed border-2 border-white/40 bg-white/10 text-white/60 backdrop-blur-sm",
                  )}
                >
                  {ready ? "See available rooms" : "Find my room"} {ready && <ArrowRight size={16} />}
                </motion.button>
                {!ready && missingHint && (
                  <p className="mt-3 text-xs text-white/60">{missingHint}</p>
                )}
              </>
            );
          })()}
        </motion.div>
      )}
    </>
  );
}

// Group flat moveInOptions (["2026-04-24", "2026-05-01", …]) into month
// buckets with a header label ("April 2026") and bare day-number pills
// (24, 1, …). Long-stay users scan by month → day, so surfacing the
// month header removes cognitive load when many dates span 3-4 months.
function groupMoveInOptionsByMonth(
  options: { value: string; label: string }[],
): { key: string; label: string; days: { value: string; day: number }[] }[] {
  const buckets = new Map<
    string,
    { key: string; label: string; days: { value: string; day: number }[] }
  >();
  for (const opt of options) {
    const d = new Date(opt.value + "T12:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        days: [],
      });
    }
    buckets.get(key)!.days.push({ value: opt.value, day: d.getDate() });
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}
