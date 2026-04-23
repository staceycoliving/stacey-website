"use client";

import { Users, ArrowRight } from "lucide-react";
import DualCalendar from "@/components/ui/DualCalendar";
import type { Location } from "@/lib/data";

// Booking Card Content (shared between desktop sticky + mobile inline render)
export default function BookingCard({
  location,
  isShort,
  persons,
  setPersons,
  moveInDate,
  handleGlobalDateChange,
  checkIn,
  checkOut,
  nights,
  calendarOpen,
  setCalendarOpen,
  handleCalendarSelect,
  handleCalendarClear,
  tooShort,
  availableDates,
  availableRoomCount,
  loadingAvail,
  lowestNightlyPrice,
  lowestMonthlyPrice,
  availableSlotsPerDate,
  apaleoMinNights,
  apaleoMaxNights,
  variant,
}: {
  location: Location;
  isShort: boolean;
  persons: 1 | 2;
  setPersons: (p: 1 | 2) => void;
  moveInDate: string;
  handleGlobalDateChange: (date: string) => void;
  checkIn: string;
  checkOut: string;
  nights: number;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  handleCalendarSelect: (date: string) => void;
  handleCalendarClear?: () => void;
  tooShort: boolean;
  availableDates: { value: string; label: string }[];
  availableRoomCount: number;
  loadingAvail: boolean;
  lowestNightlyPrice: number | null;
  lowestMonthlyPrice: number | null;
  availableSlotsPerDate?: Record<string, string[]>;
  apaleoMinNights?: number;
  apaleoMaxNights?: number;
  variant: "desktop" | "mobile";
}) {
  return (
    <div className="rounded-[5px] bg-black p-6 text-white">
      <p className="text-base text-white/60">Starting from</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight">
        &euro;{isShort
          ? (lowestNightlyPrice || location.priceFrom)
          : (lowestMonthlyPrice || location.priceFrom)
        }<span className="text-lg font-normal text-white/60">{isShort ? "/night" : "/mo"}</span>
      </p>
      <p className="mt-2 text-sm text-white/50">
        {location.stayType === "LONG"
          ? "Minimum stay: 3 months · open-end lease"
          : "Minimum stay: 5 nights · up to 6 months"}
      </p>

      <div className="mt-4 flex items-center gap-2 text-sm text-white/60">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
        </span>
        {loadingAvail ? "Checking..." : `${availableRoomCount} rooms available`}
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-white/50">
        <Users size={16} /> {location.roomiesPerApartment} roommates per apartment
      </div>

      {/* Persons toggle */}
      <div className="mt-6">
        <label className="mb-2 block text-sm font-semibold text-white">Persons</label>
        <div className="flex gap-2">
          <button
            onClick={() => setPersons(1)}
            className={`flex-1 rounded-[5px] py-2.5 text-sm font-bold transition-all duration-200 ${
              persons === 1 ? "bg-white text-black hover:opacity-80" : "border border-white/20 text-white/60 hover:bg-white/20"
            }`}
          >
            1 person
          </button>
          <button
            onClick={() => setPersons(2)}
            className={`flex-1 rounded-[5px] py-2.5 text-sm font-bold transition-all duration-200 ${
              persons === 2 ? "bg-white text-black hover:opacity-80" : "border border-white/20 text-white/60 hover:bg-white/20"
            }`}
          >
            2 persons
          </button>
        </div>
      </div>

      {/* Dates */}
      {isShort ? (
        variant === "desktop" ? (
          <div className="relative mt-4">
            <button
              onClick={() => setCalendarOpen(!calendarOpen)}
              className="w-full rounded-[5px] bg-white px-4 py-3 text-center text-sm text-black transition-all duration-200 hover:opacity-80"
            >
              {checkIn && checkOut && nights >= 5
                ? `${new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${new Date(checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${nights} nights`
                : "Select dates"}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-white">
              {!checkIn ? "Select check-in date" : !checkOut ? "Select check-out date" : "Your dates"}
            </label>
            <div className="rounded-[5px] bg-white p-3">
              <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={handleCalendarSelect} onClear={handleCalendarClear} availableSlotsPerDate={availableSlotsPerDate} minNights={apaleoMinNights} maxNights={apaleoMaxNights} />
            </div>
            {tooShort && <p className="mt-2 text-sm text-[#FF6B6B]">Minimum stay is 5 nights.</p>}
            {nights >= 5 && (
              <p className="mt-2 text-sm text-white/50">
                {new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" → "}
                {new Date(checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" · "}{nights} nights
              </p>
            )}
          </div>
        )
      ) : (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-white">Move-in date</label>
          <select
            value={moveInDate}
            onChange={(e) => handleGlobalDateChange(e.target.value)}
            className="w-full appearance-none rounded-[5px] border border-white/20 bg-white/10 px-4 py-3 text-center text-base text-white outline-none sm:text-sm"
          >
            <option value="" className="text-black">Select a date</option>
            {availableDates.map((d) => (
              <option key={d.value} value={d.value} className="text-black">{d.label}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() => document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[5px] bg-pink px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
      >
        See available rooms <ArrowRight size={14} />
      </button>
    </div>
  );
}
