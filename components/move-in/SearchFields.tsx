"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import DualCalendar from "@/components/ui/DualCalendar";
import type { StayType } from "@/lib/data";

// ─── Shared search fields (full = 100vh intro, compact = above results) ───
export default function SearchFields({
  stayType, onStayType,
  persons, onPersons,
  city, onCity,
  checkIn, checkOut, onCalendarSelect,
  moveInDate, onMoveInDate,
  moveInOptions, loadingDates,
  nightCount, tooShort,
  variant,
  calendarOpenExternal,
  setCalendarOpenExternal,
}: {
  stayType: StayType | null; onStayType: (t: StayType) => void;
  persons: 1 | 2; onPersons: (p: 1 | 2) => void;
  city: string; onCity: (c: string) => void;
  checkIn: string | null; checkOut: string | null; onCalendarSelect: (d: string) => void;
  moveInDate: string | null; onMoveInDate: (d: string | null) => void;
  moveInOptions: { value: string; label: string }[]; loadingDates: boolean;
  nightCount: number; tooShort: boolean;
  variant: "full" | "compact";
  calendarOpenExternal?: boolean;
  setCalendarOpenExternal?: (open: boolean) => void;
}) {
  const isCompact = variant === "compact";
  const [calendarOpenInternal, setCalendarOpenInternal] = useState(false);
  const calendarOpen = calendarOpenExternal ?? calendarOpenInternal;
  const setCalendarOpen = setCalendarOpenExternal ?? setCalendarOpenInternal;

  const formatDateShort = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (isCompact) {
    // ─── Compact: horizontal row of fields ───
    return (
      <div className="flex flex-wrap items-end gap-4">
        {/* Stay type */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray">Stay</p>
          <div className="flex gap-1.5">
            {(["SHORT", "LONG"] as StayType[]).map((t) => (
              <button
                key={t}
                onClick={() => onStayType(t)}
                className={clsx(
                  "rounded-[5px] px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  stayType === t ? "bg-black text-white" : "bg-[#F5F5F5] hover:bg-[#E8E6E0]"
                )}
              >
                {t === "SHORT" ? "Short" : "Long"}
              </button>
            ))}
          </div>
        </div>

        {/* Persons */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray">Persons</p>
          <div className="flex gap-1.5">
            {([1, 2] as const).map((p) => (
              <button
                key={p}
                onClick={() => onPersons(p)}
                className={clsx(
                  "rounded-[5px] px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  persons === p ? "bg-black text-white" : "bg-[#F5F5F5] hover:bg-[#E8E6E0]"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* City (LONG only) */}
        {stayType === "LONG" && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray">City</p>
            <div className="flex gap-1.5">
              {[
                { value: "hamburg", label: "Hamburg" },
                { value: "berlin", label: "Berlin" },
                { value: "vallendar", label: "Vallendar" },
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => onCity(c.value)}
                  className={clsx(
                    "rounded-[5px] px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    city === c.value ? "bg-black text-white" : "bg-[#F5F5F5] hover:bg-[#E8E6E0]"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="relative">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray">
            {stayType === "SHORT" ? "Dates" : "Move-in"}
          </p>
          {stayType === "SHORT" ? (
            <>
              <button
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="rounded-[5px] bg-[#F5F5F5] px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:bg-[#E8E6E0]"
              >
                {checkIn && checkOut
                  ? `${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}`
                  : "Select dates"}
              </button>
              {calendarOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setCalendarOpen(false)} />
                  <div className="absolute left-0 top-full z-30 mt-2 w-[280px] rounded-[5px] bg-white p-4 shadow-xl ring-1 ring-[#E8E6E0] min-[420px]:w-[340px]">
                    <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={onCalendarSelect} />
                    {checkIn && checkOut && (
                      <div className="mt-3 flex items-center justify-between border-t border-[#E8E6E0] pt-3">
                        <p className="text-sm font-semibold">{nightCount} nights</p>
                        {tooShort ? (
                          <p className="text-xs font-medium text-pink">Min 5 nights</p>
                        ) : (
                          <button onClick={() => setCalendarOpen(false)} className="text-xs font-semibold hover:opacity-60">Done</button>
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
              className="rounded-[5px] border border-[#E8E6E0] bg-white px-3 py-1.5 text-xs font-medium outline-none transition-colors focus:border-black disabled:opacity-50"
            >
              <option value="">{loadingDates ? "Loading..." : "Select"}</option>
              {moveInOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
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
              <p className="mb-5 text-base font-semibold text-white sm:text-lg">Moving in alone or as a couple?</p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <button
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
              <p className="mb-5 text-base font-semibold text-white sm:text-lg">Where do you want to live?</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {[{ value: "hamburg", label: "Hamburg" }, { value: "berlin", label: "Berlin" }, { value: "vallendar", label: "Vallendar" }].map((c) => (
                  <button
                    key={c.value}
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
                  <div className="rounded-[5px] bg-white p-5 text-left shadow-lg">
                    <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={onCalendarSelect} />
                    {checkIn && checkOut && (
                      <div className="mt-4 flex items-center justify-between border-t border-[#E8E6E0] pt-4">
                        <p className="text-base font-bold">{nightCount} nights</p>
                        {tooShort && <p className="text-sm font-semibold text-pink">Minimum 5 nights</p>}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-5 text-base font-semibold text-white sm:text-lg">When do you want to move in?</p>
                  <select
                    value={moveInDate || ""}
                    onChange={(e) => onMoveInDate(e.target.value || null)}
                    disabled={loadingDates}
                    className="w-full rounded-[5px] bg-white px-5 py-4 text-center text-base font-semibold shadow-lg outline-none disabled:opacity-50"
                  >
                    <option value="">{loadingDates ? "Checking availability..." : "Select a date"}</option>
                    {moveInOptions.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
