"use client";

import { useEffect, useState } from "react";
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
  calendarOpenExternal?: boolean;
  setCalendarOpenExternal?: (open: boolean) => void;
  onSubmit?: () => void;
}) {
  const isCompact = variant === "compact";
  const [calendarOpenInternal, setCalendarOpenInternal] = useState(false);
  const calendarOpen = calendarOpenExternal ?? calendarOpenInternal;
  const setCalendarOpen = setCalendarOpenExternal ?? setCalendarOpenInternal;

  // Fetch per-date slot availability across all SHORT properties so the
  // calendar can do Airbnb-style dynamic greying — check-in valid iff a
  // 5-night run is possible from that date; after pick, check-out valid
  // iff every night in the candidate range has a consistent free slot.
  // Re-fetches when `persons` changes because availability differs for
  // couples (fewer categories qualify).
  const [availableSlotsPerDate, setAvailableSlotsPerDate] = useState<
    Record<string, string[]> | undefined
  >(undefined);
  // min/max stay come live from apaleo — changing them in apaleo reflects
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
        /* silently ignore — calendar falls back to accepting any date */
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
    // track). Selected option gets a white pill with subtle shadow; inactive
    // options read as gray text. One-row layout on desktop, horizontal
    // scroll on mobile so height stays constant.
    const segmentTrack =
      "flex shrink-0 gap-1 rounded-[5px] bg-[#F5F5F5] p-1";
    const segmentBtn = (active: boolean) =>
      clsx(
        "rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-all duration-150",
        active
          ? "bg-white text-black shadow-sm"
          : "text-gray hover:text-black",
      );

    return (
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:gap-3 sm:overflow-x-visible sm:pb-0">
        {/* Stay type */}
        <div role="radiogroup" aria-label="Stay type" className={segmentTrack}>
          {(["SHORT", "LONG"] as StayType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={stayType === t}
              onClick={() => onStayType(t)}
              className={segmentBtn(stayType === t)}
            >
              {t === "SHORT" ? "Short" : "Long"}
            </button>
          ))}
        </div>

        {/* Persons */}
        <div role="radiogroup" aria-label="Persons" className={segmentTrack}>
          {([1, 2] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={persons === p}
              onClick={() => onPersons(p)}
              className={segmentBtn(persons === p)}
            >
              {p} {p === 1 ? "person" : "persons"}
            </button>
          ))}
        </div>

        {/* City (LONG only) */}
        {stayType === "LONG" && (
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
                className={segmentBtn(city === c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Date — standalone pill-button */}
        <div className="relative shrink-0">
          {stayType === "SHORT" ? (
            <>
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-[5px] px-3 py-2 text-xs font-semibold transition-colors",
                  checkIn && checkOut
                    ? "bg-black text-white"
                    : "bg-[#F5F5F5] text-black hover:bg-[#E8E6E0]",
                )}
              >
                {checkIn && checkOut
                  ? `${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}`
                  : "Pick dates"}
              </button>
              {calendarOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setCalendarOpen(false)} />
                  <div className="absolute right-0 top-full z-30 mt-2 w-[280px] rounded-[5px] bg-white p-4 shadow-xl ring-1 ring-lightgray min-[420px]:w-[340px]">
                    <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={onCalendarSelect} onClear={onCalendarClear} availableSlotsPerDate={availableSlotsPerDate} minNights={apaleoMinNights} maxNights={apaleoMaxNights} />
                    {checkIn && checkOut && (
                      <div className="mt-3 flex items-center justify-between border-t border-lightgray pt-3">
                        <p className="text-sm font-semibold">{nightCount} nights</p>
                        {tooShort ? (
                          <p className="text-xs font-medium text-pink">Min 5 nights</p>
                        ) : (
                          <button onClick={() => setCalendarOpen(false)} className="text-xs font-semibold hover:opacity-60">
                            Done
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <select
              value={moveInDate || ""}
              onChange={(e) => onMoveInDate(e.target.value || null)}
              disabled={loadingDates}
              className={clsx(
                "appearance-none rounded-[5px] px-3 py-2 text-xs font-semibold outline-none transition-colors disabled:opacity-50",
                moveInDate
                  ? "bg-black text-white"
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
          <button
            type="button"
            role="radio"
            aria-checked={stayType === "SHORT"}
            onClick={() => onStayType("SHORT")}
            className={clsx(
              "w-full rounded-[5px] px-6 py-3.5 text-sm font-extrabold tracking-wide transition-all duration-200 sm:flex sm:w-auto sm:min-w-[210px] sm:flex-col sm:gap-0.5 sm:px-8 sm:py-4 sm:text-base",
              stayType === "SHORT"
                ? "bg-white text-black shadow-lg hover:opacity-80"
                : "border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
            )}
          >
            <span>SHORT</span>
            <span className="text-xs font-medium sm:text-sm">
              <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>up to 3 months
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={stayType === "LONG"}
            onClick={() => onStayType("LONG")}
            className={clsx(
              "w-full rounded-[5px] px-6 py-3.5 text-sm font-extrabold tracking-wide transition-all duration-200 sm:flex sm:w-auto sm:min-w-[210px] sm:flex-col sm:gap-0.5 sm:px-8 sm:py-4 sm:text-base",
              stayType === "LONG"
                ? "bg-white text-black shadow-lg hover:opacity-80"
                : "border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
            )}
          >
            <span>LONG</span>
            <span className="text-xs font-medium sm:text-sm">
              <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>stay 3+ months
            </span>
          </button>
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
                  <p className="mb-5 text-base font-semibold text-white sm:text-lg">
                    {!checkIn ? "Select your check-in date" : !checkOut ? "Now select check-out" : "Your dates"}
                  </p>

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

                  {/* Desktop: inline white card, no modal */}
                  <div className="hidden rounded-[5px] bg-white p-5 text-left shadow-lg sm:block">
                    <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={onCalendarSelect} onClear={onCalendarClear} availableSlotsPerDate={availableSlotsPerDate} minNights={apaleoMinNights} maxNights={apaleoMaxNights} />
                    {availableSlotsPerDate && (
                      <p className="mt-3 text-[11px] text-gray">
                        {checkIn && !checkOut
                          ? "Only check-out dates that keep your room available are selectable."
                          : "Greyed-out dates can't start a 5-night stay."}
                      </p>
                    )}
                    {checkIn && checkOut && (
                      <div className="mt-4 flex items-center justify-between border-t border-[#E8E6E0] pt-4">
                        <p className="text-base font-bold">{nightCount} nights</p>
                        {tooShort && <p className="text-sm font-semibold text-pink">Minimum 5 nights</p>}
                      </div>
                    )}
                  </div>

                  {/* Mobile-only bottom-sheet modal */}
                  {calendarOpen && (
                    <div
                      className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm sm:hidden"
                      onClick={() => setCalendarOpen(false)}
                    >
                      <div
                        className="mt-auto max-h-[90vh] overflow-y-auto rounded-t-[20px] bg-white p-5 pb-8 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-base font-bold">
                            {!checkIn ? "Pick check-in" : !checkOut ? "Pick check-out" : "Your dates"}
                          </p>
                          <button
                            type="button"
                            aria-label="Close"
                            onClick={() => setCalendarOpen(false)}
                            className="-mr-2 rounded-[5px] px-2 py-1 text-sm font-semibold text-gray hover:bg-[#F5F5F5] hover:text-black"
                          >
                            Close
                          </button>
                        </div>
                        <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={onCalendarSelect} onClear={onCalendarClear} availableSlotsPerDate={availableSlotsPerDate} minNights={apaleoMinNights} maxNights={apaleoMaxNights} />
                        {checkIn && checkOut && (
                          <div className="mt-4 flex items-center justify-between border-t border-[#E8E6E0] pt-4">
                            <p className="text-base font-bold">{nightCount} nights</p>
                            {tooShort && <p className="text-sm font-semibold text-pink">Minimum 5 nights</p>}
                          </div>
                        )}
                        {checkIn && checkOut && !tooShort && (
                          <button
                            type="button"
                            onClick={() => setCalendarOpen(false)}
                            className="mt-5 block w-full rounded-[5px] bg-black py-3.5 text-center text-sm font-semibold text-white active:opacity-80"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p id="movein-label" className="mb-5 text-base font-semibold text-white sm:text-lg">When do you want to move in?</p>
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
                              {group.days.map((d) => (
                                <button
                                  key={d.value}
                                  type="button"
                                  role="radio"
                                  aria-checked={moveInDate === d.value}
                                  onClick={() => onMoveInDate(d.value)}
                                  className={clsx(
                                    "rounded-[3px] py-2 text-center text-sm font-semibold transition-colors",
                                    moveInDate === d.value
                                      ? "bg-black text-white"
                                      : "bg-[#F5F5F5] text-black hover:bg-[#EDEDED]",
                                  )}
                                >
                                  {d.day}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {moveInDate && (
                      <div className="mt-4 flex items-center justify-between border-t border-[#E8E6E0] pt-4">
                        <p className="text-sm text-gray">Moving in on</p>
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

      {/* Submit CTA — shared between homepage hero and /move-in intro so
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
                <button
                  onClick={onSubmit}
                  disabled={!ready}
                  className={clsx(
                    "inline-flex w-full items-center justify-center gap-2 rounded-[5px] px-10 py-4 text-base font-bold transition-all duration-200 sm:text-lg",
                    ready
                      ? "bg-white text-black shadow-lg hover:opacity-80"
                      : "cursor-not-allowed border-2 border-white/40 bg-white/10 text-white/60 backdrop-blur-sm",
                  )}
                >
                  {ready ? "See available rooms" : "Find my room"} {ready && <ArrowRight size={16} />}
                </button>
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
