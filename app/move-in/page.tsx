"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Pencil,
  Check,
  Mail,
  MapPin,
} from "lucide-react";
import { clsx } from "clsx";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DualCalendar from "@/components/ui/DualCalendar";
import Badge from "@/components/ui/Badge";
import StepAboutYou from "@/components/move-in/StepAboutYou";
import StepLease from "@/components/move-in/StepLease";
import {
  locations,
  getLocationByRoomId,
  getRoomById,
  ROOM_NAME_TO_CATEGORY,
} from "@/lib/data";
import type { Location, Room, StayType } from "@/lib/data";

// ─── Reveal animation ───
function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section header with big number ───
function SectionHeader({ number, title, titleItalic }: { number: string; title: string; titleItalic: string }) {
  return (
    <div className="mb-8 flex items-baseline gap-4">
      <span className="text-5xl font-extralight text-[#E8E6E0] sm:text-6xl">{number}</span>
      <h2 className="text-2xl font-bold sm:text-3xl">
        {title} <em className="font-bold italic">{titleItalic}</em>
      </h2>
    </div>
  );
}

// ─── Collapsed section ───
function CollapsedSection({ label, summary, onEdit }: { label: string; summary: string; onEdit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between rounded-[5px] border border-[#E8E6E0] px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
          <Check size={13} strokeWidth={3} />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray">{label}</p>
          <p className="text-sm font-semibold">{summary}</p>
        </div>
      </div>
      <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-medium text-gray transition-colors hover:text-black">
        <Pencil size={11} /> Edit
      </button>
    </motion.div>
  );
}

// ─── Shared search fields (full = 100vh intro, compact = above results) ───
function SearchFields({
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
      <div className="mt-10 text-left sm:mt-12">
        <p className="mb-3 text-sm font-semibold text-white/60">How long do you want to stay?</p>
        <div className="flex gap-3">
          <button
            onClick={() => onStayType("SHORT")}
            className={clsx(
              "flex-1 rounded-[5px] px-6 py-4 text-left transition-all duration-200",
              stayType === "SHORT"
                ? "bg-white text-black shadow-lg"
                : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            )}
          >
            <p className="text-base font-extrabold tracking-wide sm:text-lg">SHORT</p>
            <p className={clsx("mt-1 text-sm", stayType === "SHORT" ? "text-black/50" : "text-white/50")}>Less than 3 months</p>
          </button>
          <button
            onClick={() => onStayType("LONG")}
            className={clsx(
              "flex-1 rounded-[5px] px-6 py-4 text-left transition-all duration-200",
              stayType === "LONG"
                ? "bg-white text-black shadow-lg"
                : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            )}
          >
            <p className="text-base font-extrabold tracking-wide sm:text-lg">LONG</p>
            <p className={clsx("mt-1 text-sm", stayType === "LONG" ? "text-black/50" : "text-white/50")}>3+ months · open-end</p>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {stayType && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="text-left overflow-hidden">
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-white/60">Moving in alone or as a couple?</p>
              <div className="flex gap-3">
                <button onClick={() => onPersons(1)} className={clsx("flex-1 rounded-[5px] px-6 py-4 text-base font-bold transition-all duration-200 sm:text-lg", persons === 1 ? "bg-white text-black shadow-lg" : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20")}>1 person</button>
                <button onClick={() => onPersons(2)} className={clsx("flex-1 rounded-[5px] px-6 py-4 text-base font-bold transition-all duration-200 sm:text-lg", persons === 2 ? "bg-white text-black shadow-lg" : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20")}>2 persons</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stayType === "LONG" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="text-left overflow-hidden">
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-white/60">Where do you want to live?</p>
              <div className="flex gap-3">
                {[{ value: "hamburg", label: "Hamburg" }, { value: "berlin", label: "Berlin" }, { value: "vallendar", label: "Vallendar" }].map((c) => (
                  <button key={c.value} onClick={() => onCity(c.value)} className={clsx("flex-1 rounded-[5px] px-5 py-4 text-base font-bold transition-all duration-200 sm:text-lg", city === c.value ? "bg-white text-black shadow-lg" : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20")}>{c.label}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {((stayType === "SHORT") || (stayType === "LONG" && city)) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="text-left overflow-hidden">
            <div className="mt-8">
              {stayType === "SHORT" ? (
                <>
                  <p className="mb-3 text-sm font-semibold text-white/60">{!checkIn ? "Select your check-in date" : !checkOut ? "Now select check-out" : "Your dates"}</p>
                  <div className="rounded-[5px] bg-white p-5 shadow-lg">
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
                  <p className="mb-3 text-sm font-semibold text-white/60">When do you want to move in?</p>
                  <select
                    value={moveInDate || ""}
                    onChange={(e) => onMoveInDate(e.target.value || null)}
                    disabled={loadingDates}
                    className="w-full rounded-[5px] bg-white px-5 py-4 text-base font-semibold shadow-lg outline-none disabled:opacity-50"
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

// ─── Main export ───
export default function MoveInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 size={24} className="animate-spin text-gray" /></div>}>
      <MoveInFlow />
    </Suspense>
  );
}

// ─── The flow ───
function MoveInFlow() {
  const searchParams = useSearchParams();

  // ─── Intro state (progressive fields) ───
  const [stayType, setStayType] = useState<StayType | null>(null);
  const [persons, setPersons] = useState<1 | 2>(1);
  const [city, setCity] = useState<string>("");
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [moveInDate, setMoveInDate] = useState<string | null>(null);

  // ─── Results + booking state ───
  const [showResults, setShowResults] = useState(false);
  const [filterCalendarOpen, setFilterCalendarOpen] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomCollapsed, setRoomCollapsed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  // SHORT only
  const [phone, setPhone] = useState("");
  const [moveInReason, setMoveInReason] = useState("");
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  // LONG only
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Lease signing (LONG only)
  const [showLease, setShowLease] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);
  const [leaseDevMode, setLeaseDevMode] = useState(false);

  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const leaseRef = useRef<HTMLDivElement>(null);

  // ─── Availability from DB ───
  type AvailabilityMap = Record<string, Record<string, { available: number; total: number; moveInDates?: string[] }>>;
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Fetch availability from DB
  const fetchAvailability = useCallback((locs: Location[], opts?: { ci?: string; co?: string }) => {
    setLoadingAvailability(true);
    const fetches = locs.map(async (loc) => {
      const params = new URLSearchParams({ location: loc.slug, persons: String(persons) });
      if (loc.stayType === "SHORT" && opts?.ci && opts?.co) {
        params.set("checkIn", opts.ci);
        params.set("checkOut", opts.co);
      }
      try {
        const res = await fetch(`/api/availability?${params}`);
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    });

    Promise.all(fetches).then((results) => {
      const map: AvailabilityMap = {};
      results.forEach((data) => {
        if (!data) return;
        const catMap: Record<string, { available: number; total: number; moveInDates?: string[] }> = {};
        for (const cat of data.categories) {
          catMap[cat.category] = {
            available: cat.available ?? cat.freeNow ?? 0,
            total: cat.total,
            moveInDates: cat.moveInDates,
          };
        }
        map[data.location] = catMap;
      });
      setAvailability(map);
      setLoadingAvailability(false);
    });
  }, [persons]);

  // SHORT stay: fetch when search results are shown
  useEffect(() => {
    if (stayType !== "SHORT" || !showResults || !checkIn || !checkOut) return;
    const locs = locations.filter((l) => l.stayType === "SHORT");
    fetchAvailability(locs, { ci: checkIn, co: checkOut });
  }, [stayType, persons, checkIn, checkOut, showResults, fetchAvailability]);

  // LONG stay: fetch as soon as city is selected (before showResults)
  useEffect(() => {
    if (stayType !== "LONG" || !city) return;
    const locs = locations.filter((l) => l.stayType === "LONG" && l.city === city);
    if (locs.length > 0) fetchAvailability(locs);
  }, [stayType, persons, city, fetchAvailability]);

  // ─── LONG stay: build move-in options from API data ───
  // Expand earliest-available dates into all bookable days:
  // - Free now (today) → every day from today to today+30
  // - Free within 30 days (e.g. April 21) → every day from April 21 to today+30
  // - Free in >30 days (e.g. June 16) → only June 16
  const moveInOptions: { value: string; label: string }[] = (() => {
    if (stayType !== "LONG" || !city) return [];
    const now = new Date();
    const localDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = localDate(now);
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 30);
    const limitStr = localDate(limit);

    // Collect earliest moveInDates from API
    const earliestDates = new Set<string>();
    for (const locSlug of Object.keys(availability)) {
      const loc = locations.find((l) => l.slug === locSlug);
      if (!loc || loc.stayType !== "LONG" || loc.city !== city) continue;
      for (const catData of Object.values(availability[locSlug])) {
        if (catData.moveInDates) {
          for (const d of catData.moveInDates) earliestDates.add(d);
        }
      }
    }

    // Expand into all bookable days
    const bookableDays = new Set<string>();
    for (const earliest of earliestDates) {
      if (earliest < today) continue; // skip past dates
      if (earliest > limitStr) {
        // >30 days out → only that specific date
        bookableDays.add(earliest);
      } else {
        // Within 30 days (or today) → every day from earliest to today+30
        const start = new Date(earliest + "T12:00:00"); // noon to avoid timezone shifts
        const d = new Date(start);
        while (localDate(d) <= limitStr) {
          bookableDays.add(localDate(d));
          d.setDate(d.getDate() + 1);
        }
      }
    }

    const sorted = [...bookableDays].filter((d) => d >= today).sort();
    return sorted.map((d) => ({
      value: d,
      label: d === today
        ? "Today"
        : new Date(d + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
          }),
    }));
  })();

  // ─── Derived ───
  const selectedRoom = selectedRoomId ? getRoomById(selectedRoomId) ?? null : null;
  const selectedLocation = selectedRoomId ? getLocationByRoomId(selectedRoomId) ?? null : null;

  // Helper: get availability count for a room at a location
  const hasAvailabilityData = Object.keys(availability).length > 0;
  const getRoomAvailability = (locSlug: string, roomName: string): number | null => {
    const cat = ROOM_NAME_TO_CATEGORY[roomName];
    if (!cat) return hasAvailabilityData ? 0 : null;
    if (!availability[locSlug]) return hasAvailabilityData ? 0 : null;
    const catData = availability[locSlug][cat];
    if (!catData) return 0;

    // SHORT stay: just return available count
    if (!catData.moveInDates) return catData.available;

    // LONG stay: check if the selected move-in date is valid for this category
    if (!moveInDate) return catData.available;
    const validDates = catData.moveInDates;
    // A room is available on date X if X >= one of its moveInDates
    const isAvailable = validDates.some((d) => moveInDate >= d);
    return isAvailable ? catData.available : 0;
  };

  const filteredLocations = stayType
    ? locations
        .filter((l) => l.stayType === stayType)
        .filter((l) => stayType === "LONG" && city ? l.city === city : true)
        .map((l) => ({
          ...l,
          rooms: (persons === 2 ? l.rooms.filter((r) => r.forCouples) : l.rooms)
            .filter((r) => {
              const avail = getRoomAvailability(l.slug, r.name);
              return avail === null || avail > 0; // null = still loading, show; 0 = sold out, hide
            }),
        }))
    : [];

  const totalRooms = filteredLocations.reduce((sum, l) => sum + l.rooms.length, 0);

  // ─── Calendar ───
  const handleCalendarSelect = (date: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
    } else {
      if (date > checkIn) {
        setCheckOut(date);
      } else {
        setCheckIn(date);
        setCheckOut(null);
      }
    }
  };

  const nightCount =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 0;
  const tooShort = stayType === "SHORT" && nightCount > 0 && nightCount < 5;

  // ─── Intro handlers (reset downstream when upstream changes) ───
  const handleStayTypeChange = (type: StayType) => {
    setStayType(type);
    setCity("");
    setCheckIn(null);
    setCheckOut(null);
    setMoveInDate(null);
    setShowResults(false);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handlePersonsChange = (p: 1 | 2) => {
    setPersons(p);
    setShowResults(false);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handleCityChange = (c: string) => {
    setCity(c);
    setMoveInDate(null);
    setShowResults(false);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  // ─── Live filter handlers (keep results visible, just update filters) ───
  const handleStayTypeChangeLive = (type: StayType) => {
    setStayType(type);
    setCity("");
    setCheckIn(null);
    setCheckOut(null);
    setMoveInDate(null);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
    // SHORT needs dates first — flag to auto-open calendar in compact filter
    if (type === "SHORT") setFilterCalendarOpen(true);
  };

  const handlePersonsChangeLive = (p: 1 | 2) => {
    setPersons(p);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handleCityChangeLive = (c: string) => {
    setCity(c);
    setMoveInDate(null);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handleSearch = () => {
    setShowResults(true);
    setSelectedRoomId(null);
    setRoomCollapsed(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // ─── Smart skip from URL params ───
  useEffect(() => {
    const paramRoom = searchParams.get("room");
    const paramDate = searchParams.get("date");
    const paramCheckIn = searchParams.get("checkin");
    const paramCheckOut = searchParams.get("checkout");
    const paramPersons = searchParams.get("persons");

    // Handle Stripe redirect
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setSubmitted(true);
      return;
    }

    if (paramRoom) {
      const foundRoom = getRoomById(paramRoom);
      const foundLoc = getLocationByRoomId(paramRoom);
      if (foundRoom && foundLoc) {
        setStayType(foundLoc.stayType);
        setPersons(paramPersons === "2" ? 2 : 1);
        setCity(foundLoc.city);
        setSelectedRoomId(paramRoom);

        if (paramCheckIn && paramCheckOut) {
          setCheckIn(paramCheckIn);
          setCheckOut(paramCheckOut);
        } else if (paramDate) {
          setMoveInDate(paramDate);
        }

        setShowResults(true);
        setRoomCollapsed(true);

        setTimeout(() => aboutRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
      }
    }
  }, [searchParams]);

  // ─── Scroll helper ───
  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  // ─── Room select ───
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setRoomCollapsed(true);
    scrollTo(aboutRef);
  };

  const editRoom = () => {
    setRoomCollapsed(false);
    setShowLease(false);
    setSigningUrl(null);
    setSignatureRequestId(null);
    scrollTo(resultsRef);
  };

  // ─── About complete? ───
  const isAboutComplete = stayType === "LONG"
    ? firstName.trim() !== "" && lastName.trim() !== "" && dateOfBirth !== "" && street.trim() !== "" && zipCode.trim() !== "" && addressCity.trim() !== "" && country.trim() !== "" && email.trim() !== ""
    : firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "" && phone.trim() !== "" && moveInReason !== "";

  // ─── Submit / Next ───
  const handleSubmit = async () => {
    if (!isAboutComplete) return;

    // LONG stay → create booking in DB, then generate lease
    if (stayType === "LONG" && selectedLocation && selectedRoom) {
      setSubmitting(true);
      try {
        // 1. Create booking in DB
        const cat = ROOM_NAME_TO_CATEGORY[selectedRoom.name];
        const bookingRes = await fetch("/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: selectedLocation.slug,
            category: cat,
            persons,
            moveInDate,
            firstName,
            lastName,
            email,
            phone,
            dateOfBirth,
            street,
            zipCode,
            addressCity,
            country,
            moveInReason,
            message,
          }),
        });
        const bookingData = await bookingRes.json();
        if (!bookingRes.ok) {
          if (bookingRes.status === 409) {
            alert("Sorry, this room type is no longer available. Please try a different category.");
            setSubmitting(false);
            return;
          }
          throw new Error(bookingData.error || "Booking failed");
        }

        // 2. Generate lease
        const res = await fetch("/api/lease", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            dateOfBirth,
            street,
            zipCode,
            addressCity,
            country,
            email,
            locationName: selectedLocation.name,
            propertyAddress: selectedLocation.address,
            roomCategory: selectedRoom.name,
            monthlyRent: selectedRoom.priceMonthly,
            moveInDate,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate lease");

        setSigningUrl(data.signingUrl || null);
        setSignatureRequestId(data.signatureRequestId || null);
        setLeaseDevMode(data.devMode || false);
        setShowLease(true);
        setTimeout(() => leaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } catch (err) {
        console.error("Lease generation failed:", err);
        alert("Failed to generate lease. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // SHORT stay → create booking via API
    if (stayType === "SHORT" && !termsAccepted) return;
    if (!selectedLocation || !selectedRoom) return;
    setSubmitting(true);
    try {
      const cat = ROOM_NAME_TO_CATEGORY[selectedRoom.name];
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: selectedLocation.slug,
          category: cat,
          persons,
          checkIn,
          checkOut,
          firstName,
          lastName,
          email,
          phone,
          moveInReason,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          alert("Sorry, this room type is no longer available for your dates. Please try a different category or dates.");
        } else {
          throw new Error(data.error || "Booking failed");
        }
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Booking failed:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Lease signed → redirect to Stripe Checkout ───
  const handleLeaseSigned = async () => {
    if (!selectedLocation || !selectedRoom) return;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: selectedLocation.name,
          roomName: selectedRoom.name,
          monthlyRent: selectedRoom.priceMonthly,
          moveInDate,
          firstName,
          lastName,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect to Stripe hosted checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Payment setup failed. Please try again.");
    }
  };

  // ─── Format ───
  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatDateShort = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Search summary text
  const cityLabel = city ? city.charAt(0).toUpperCase() + city.slice(1) : "";
  const searchSummary = stayType === "SHORT"
    ? `Short stay · ${persons === 2 ? "2 persons" : "1 person"}${checkIn && checkOut ? ` · ${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}` : ""}`
    : `Long stay${cityLabel ? ` · ${cityLabel}` : ""} · ${persons === 2 ? "2 persons" : "1 person"}${moveInDate ? ` · from ${formatDate(moveInDate)}` : ""}`;

  // ════════════════════════════════════════
  //  CONFIRMATION
  // ════════════════════════════════════════
  if (submitted && selectedLocation && selectedRoom) {
    const cm = selectedLocation.communityManager;
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white pt-24 pb-16 sm:pt-28">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <Reveal>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black">
                  <Check size={28} className="text-white" strokeWidth={3} />
                </div>
                <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
                  Welcome to <em className="font-bold italic">STACEY</em>, {firstName}!
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm text-gray leading-relaxed">
                  Your application has been submitted. We&apos;ll review it and get back to you within 48 hours.
                </p>
                <div className="mx-auto mt-8 max-w-sm rounded-[5px] border border-[#E8E6E0] p-5 text-left">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray">Your booking</p>
                  <div className="mt-3 flex gap-3">
                    <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-[5px]">
                      <Image src={selectedRoom.image} alt={selectedRoom.name} fill className="object-cover" sizes="80px" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{selectedLocation.name} · {selectedRoom.name}</p>
                      <p className="mt-0.5 text-xs text-gray">
                        {persons} {persons === 1 ? "person" : "persons"} ·{" "}
                        {moveInDate ? `from ${formatDate(moveInDate)}` : checkIn && checkOut ? `${formatDate(checkIn)} — ${formatDate(checkOut)}` : ""}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">€{selectedRoom.priceMonthly}/mo</p>
                    </div>
                  </div>
                </div>
                <div className="mx-auto mt-8 max-w-sm text-left">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray">What happens next</p>
                  <div className="mt-4 space-y-3">
                    {["We review your application and check availability", "You receive a confirmation email with lease details", "Sign digitally and prepare for your move-in day"].map((text, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-bold">{i + 1}</span>
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mx-auto mt-8 max-w-sm rounded-[5px] bg-black p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
                      <Image src={cm.image} alt={cm.name} fill className="object-cover" sizes="56px" />
                      <div className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-black bg-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{cm.name}</p>
                      <p className="text-xs text-white/60">Your community manager</p>
                    </div>
                  </div>
                  <a href={`mailto:${cm.email}`} className="mt-4 flex items-center justify-center gap-2 rounded-[5px] bg-pink px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:opacity-80">
                    <Mail size={14} /> Say hello
                  </a>
                </div>
                <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray transition-colors hover:text-black">
                  Back to homepage <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          </div>
        </main>
      </>
    );
  }

  // ════════════════════════════════════════
  //  BOOKING FLOW
  // ════════════════════════════════════════
  return (
    <>
      <Navbar transparent={!showResults} />

      <main className="min-h-screen bg-white">
        {/* ── INTRO — hero image background, like homepage ── */}
        {!showResults ? (
          <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
            {/* Hero background */}
            <Image
              src="/images/website-hero.webp"
              alt="STACEY Coliving"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 w-full max-w-md text-center"
            >
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Move in with STACEY</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
                Find your new <em className="font-light italic">home</em>
              </h1>
              <p className="mt-3 text-sm text-white/50">
                All-inclusive · fully furnished · 9 locations · 3 cities
              </p>

              <SearchFields
                stayType={stayType} onStayType={handleStayTypeChange}
                persons={persons} onPersons={handlePersonsChange}
                city={city} onCity={handleCityChange}
                checkIn={checkIn} checkOut={checkOut} onCalendarSelect={handleCalendarSelect}
                moveInDate={moveInDate} onMoveInDate={(d) => { setMoveInDate(d); setShowResults(false); setSelectedRoomId(null); setRoomCollapsed(false); }}
                moveInOptions={moveInOptions} loadingDates={loadingAvailability}
                nightCount={nightCount} tooShort={tooShort}
                variant="full"
              />

              {/* Search CTA */}
              <AnimatePresence>
                {((stayType === "SHORT" && checkIn && checkOut && !tooShort) ||
                  (stayType === "LONG" && city && moveInDate)) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-10">
                    <button
                      onClick={handleSearch}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[5px] bg-white px-10 py-4 text-base font-bold text-black transition-all duration-200 hover:opacity-80 sm:text-lg"
                    >
                      Show available rooms <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trust: Press logos */}
              {!stayType && (
                <div className="mt-12 flex items-center justify-center gap-6 sm:gap-10">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-white/30">As seen in</span>
                  {["hamburger-abendblatt", "handelsblatt", "die-welt"].map((name) => (
                    <img key={name} src={`/images/press/${name}.svg`} alt={name} className="h-3 brightness-0 invert opacity-30 sm:h-3.5" />
                  ))}
                </div>
              )}
            </motion.div>

          </section>
        ) : (
          /* ── STICKY FILTER BAR (after first search, hidden once room is booked) ── */
          <div className={clsx("sticky top-0 z-30 border-b border-[#E8E6E0] bg-white/90 pt-20 pb-4 backdrop-blur-lg sm:pt-24", (roomCollapsed || showLease) && "hidden")}>
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <SearchFields
                stayType={stayType} onStayType={handleStayTypeChangeLive}
                persons={persons} onPersons={handlePersonsChangeLive}
                city={city} onCity={handleCityChangeLive}
                checkIn={checkIn} checkOut={checkOut} onCalendarSelect={handleCalendarSelect}
                moveInDate={moveInDate} onMoveInDate={(d) => { setMoveInDate(d); setSelectedRoomId(null); setExpandedRoomId(null); setRoomCollapsed(false); }}
                moveInOptions={moveInOptions} loadingDates={loadingAvailability}
                nightCount={nightCount} tooShort={tooShort}
                variant="compact"
                calendarOpenExternal={filterCalendarOpen}
                setCalendarOpenExternal={setFilterCalendarOpen}
              />
            </div>
          </div>
        )}

        {/* ── EMPTY STATE: filter incomplete ── */}
        {showResults && !showLease && !filterCalendarOpen && (
          (stayType === "SHORT" && (!checkIn || !checkOut || tooShort)) ||
          (stayType === "LONG" && (!city || !moveInDate))
        ) && (
          <section className="bg-white py-24">
            <div className="mx-auto max-w-md px-4 text-center">
              <p className="text-lg font-bold">Almost there</p>
              <p className="mt-2 text-sm text-gray">
                {stayType === "SHORT" && (!checkIn || !checkOut)
                  ? "Select your check-in and check-out dates to see available rooms."
                  : stayType === "SHORT" && tooShort
                    ? "Minimum stay is 5 nights. Please select a later check-out date."
                    : !city
                      ? "Select a city to see available rooms."
                      : "Select a move-in date to see available rooms."}
              </p>
            </div>
          </section>
        )}

        {/* ── RESULTS (like homepage search results) ── */}
        {showResults && !showLease && !filterCalendarOpen && !(stayType === "SHORT" && (!checkIn || !checkOut || tooShort)) && !(stayType === "LONG" && (!city || !moveInDate)) && (
          <section ref={resultsRef} id="search-results" className="bg-white py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {loadingAvailability ? (
                    <span className="inline-flex items-center gap-3"><Loader2 size={20} className="animate-spin" /> Checking availability...</span>
                  ) : (
                    <>{totalRooms} rooms <span className="italic font-light">available</span></>
                  )}
                </h2>
                <p className="mt-1 text-sm text-gray">{searchSummary}</p>
              </div>

              {/* Room grid grouped by location */}
              {!roomCollapsed && (
                <div className="mt-8 space-y-12">
                  {filteredLocations.map((loc) => (
                    <div key={loc.slug}>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-extrabold">STACEY {loc.name}</h3>
                        <span className="text-xs text-gray">
                          {loc.neighborhood}, {loc.city.charAt(0).toUpperCase() + loc.city.slice(1)}
                        </span>
                        <Link href={`/locations/${loc.slug}`} className="ml-auto text-xs font-semibold text-gray transition-all duration-200 hover:opacity-60">
                          View location →
                        </Link>
                      </div>

                      {loc.rooms.length === 0 && (
                        <p className="mt-3 text-sm text-gray">Sold out for this date</p>
                      )}
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {loc.rooms.map((room) => (
                          <div
                            key={room.id}
                            className="group overflow-hidden rounded-[5px] bg-white ring-1 ring-[#E8E6E0] transition-all duration-200 hover:ring-2 hover:ring-black hover:shadow-lg"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden">
                              <Image src={room.image} alt={room.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                              {room.forCouples && (
                                <span className="absolute right-2 top-2 rounded-[5px] bg-pink px-2 py-0.5 text-[10px] font-bold text-white">
                                  Couples
                                </span>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-bold">{room.name}</p>
                                  <p className="text-[11px] text-gray">STACEY {loc.name}</p>
                                </div>
                                {room.sizeSqm && <p className="text-xs text-gray">{room.sizeSqm} m²</p>}
                              </div>
                              <p className="mt-1 text-xl font-extrabold">
                                €{room.priceMonthly}<span className="text-xs font-normal text-gray">/mo</span>
                              </p>
                              <p className="mt-0.5 text-[11px] text-gray">All-inclusive · fully furnished</p>
                            </div>
                            {/* Details + Book — visible on hover (desktop) / always visible (mobile) */}
                            {!soldOut && (
                            <div className="border-t border-[#E8E6E0] p-4 max-lg:block lg:max-h-0 lg:overflow-hidden lg:border-t-0 lg:p-0 lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover:max-h-60 lg:group-hover:border-t lg:group-hover:p-4 lg:group-hover:opacity-100">
                              <p className="text-sm leading-relaxed text-gray">{room.description}</p>
                              <p className="mt-2 text-xs text-gray">
                                <span className="font-semibold text-black">Includes:</span> {room.interior}
                              </p>
                              <button
                                onClick={() => handleRoomSelect(room.id)}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
                              >
                                Book this room <ArrowRight size={14} />
                              </button>
                            </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {totalRooms === 0 && (
                    <div className="rounded-[5px] border border-[#E8E6E0] p-8 text-center">
                      <p className="text-sm font-semibold">No rooms available</p>
                      <p className="mt-1 text-xs text-gray">Try changing your search criteria.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>
        )}

        {/* ── Collapsed room bar (visible during checkout + lease) ── */}
        {roomCollapsed && selectedRoom && selectedLocation && (
          <div className="border-b border-[#E8E6E0] bg-white pt-20 pb-4 sm:pt-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between rounded-[5px] bg-[#F5F5F5] px-5 py-3">
                <p className="text-sm">
                  <span className="font-bold">{selectedRoom.name}</span>
                  <span className="text-gray"> · STACEY {selectedLocation.name} · €{selectedRoom.priceMonthly}/mo</span>
                </p>
                <button onClick={editRoom} className="flex items-center gap-1.5 text-xs font-medium text-gray transition-colors hover:text-black">
                  <Pencil size={11} /> Change room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CHECKOUT: Two-column layout (form left, booking card right) ── */}
        {roomCollapsed && selectedRoom && selectedLocation && !showLease && (
          <section className="bg-[#FAFAFA] py-16">
            <div ref={aboutRef} className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="lg:grid lg:grid-cols-3 lg:gap-10">
                  {/* Left: Form (2/3) */}
                  <div className="lg:col-span-2">
                      <StepAboutYou
                        stayType={stayType!}
                        firstName={firstName} setFirstName={setFirstName}
                        lastName={lastName} setLastName={setLastName}
                        email={email} setEmail={setEmail}
                        phone={phone} setPhone={setPhone}
                        moveInReason={moveInReason} setMoveInReason={setMoveInReason}
                        message={message} setMessage={setMessage}
                        dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
                        street={street} setStreet={setStreet}
                        zipCode={zipCode} setZipCode={setZipCode}
                        addressCity={addressCity} setAddressCity={setAddressCity}
                        country={country} setCountry={setCountry}
                      />
                  </div>

                  {/* Right: Sticky booking card (1/3) */}
                  <div className="mt-10 lg:mt-0">
                    <div className="lg:sticky lg:top-24">
                      <div className="rounded-[5px] bg-black p-6 text-white">
                        {/* Room image */}
                        <div className="relative aspect-[16/10] overflow-hidden rounded-[5px]">
                          <Image src={selectedRoom.image} alt={selectedRoom.name} fill className="object-cover" sizes="400px" />
                          {selectedRoom.forCouples && (
                            <span className="absolute right-2 top-2 rounded-[5px] bg-pink px-2 py-0.5 text-[10px] font-bold text-white">Couples</span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="mt-4">
                          <p className="text-lg font-bold">{selectedLocation.name} · {selectedRoom.name}</p>
                          <p className="mt-1 text-sm text-white/60">
                            {persons} {persons === 1 ? "person" : "persons"} ·{" "}
                            {moveInDate ? `from ${formatDate(moveInDate)}` : checkIn && checkOut ? `${formatDate(checkIn)} — ${formatDate(checkOut)} · ${nightCount} nights` : ""}
                          </p>
                          {selectedRoom.sizeSqm && <p className="mt-0.5 text-sm text-white/40">{selectedRoom.sizeSqm} m²</p>}
                        </div>

                        <div className="mt-4 border-t border-white/10 pt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-white/60">Starting from</p>
                            <p className="text-2xl font-extrabold">€{selectedRoom.priceMonthly}<span className="text-sm font-normal text-white/60">/mo</span></p>
                          </div>
                        </div>

                        {/* Terms — SHORT only */}
                        {stayType === "SHORT" && (
                          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[5px] border border-white/10 p-4 transition-colors hover:border-white/20">
                            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded-[3px] accent-pink" />
                            <span className="text-sm text-white/60 leading-relaxed">
                              I agree to the <span className="font-medium text-white underline">Terms & Conditions</span> and{" "}
                              <span className="font-medium text-white underline">Privacy Policy</span>.
                            </span>
                          </label>
                        )}

                        {/* CTA */}
                        <button
                          onClick={handleSubmit}
                          disabled={!isAboutComplete || (stayType === "SHORT" && !termsAccepted) || submitting}
                          className={clsx(
                            "mt-4 flex w-full items-center justify-center gap-2 rounded-[5px] py-3.5 text-base font-bold transition-all duration-200",
                            isAboutComplete && (stayType === "LONG" || termsAccepted) && !submitting
                              ? "bg-pink text-black hover:opacity-80"
                              : "cursor-not-allowed bg-white/10 text-white/30"
                          )}
                        >
                          {submitting ? (
                            <><Loader2 size={14} className="animate-spin" /> {stayType === "LONG" ? "Generating..." : "Submitting..."}</>
                          ) : stayType === "LONG" ? (
                            <>Next <ArrowRight size={14} /></>
                          ) : (
                            <>Submit application <ArrowRight size={14} /></>
                          )}
                        </button>
                      </div>

                      {/* Change room link */}
                      <button onClick={editRoom} className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-gray transition-colors hover:text-black">
                        <Pencil size={11} /> Change room
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ── LEASE SIGNING (LONG stay only) ── */}
        {showLease && selectedRoom && selectedLocation && (
          <section className="bg-white py-16">
            <div ref={leaseRef} className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="lg:grid lg:grid-cols-3 lg:gap-10">
                  {/* Left: Signing widget (2/3) */}
                  <div className="lg:col-span-2">
                    <StepLease
                      signingUrl={signingUrl}
                      signatureRequestId={signatureRequestId}
                      devMode={leaseDevMode}
                      onSigned={handleLeaseSigned}
                    />
                  </div>

                  {/* Right: Booking summary (1/3) */}
                  <div className="mt-10 lg:mt-0">
                    <div className="lg:sticky lg:top-24">
                      <div className="rounded-[5px] bg-black p-6 text-white">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-[5px]">
                          <Image src={selectedRoom.image} alt={selectedRoom.name} fill className="object-cover" sizes="400px" />
                        </div>
                        <div className="mt-4">
                          <p className="text-lg font-bold">{selectedLocation.name} · {selectedRoom.name}</p>
                          <p className="mt-1 text-sm text-white/60">
                            {persons} {persons === 1 ? "person" : "persons"} · from {formatDate(moveInDate!)}
                          </p>
                        </div>
                        <div className="mt-4 border-t border-white/10 pt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-white/60">Starting from</p>
                            <p className="text-2xl font-extrabold">€{selectedRoom.priceMonthly}<span className="text-sm font-normal text-white/60">/mo</span></p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-white/40">Tenant</p>
                          <p className="text-sm">{firstName} {lastName}</p>
                          <p className="text-xs text-white/60">{email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        )}
      </main>

      {/* ── Bruno floating widget ── */}
      {!submitted && <BrunoWidget />}

      {!submitted && <Footer />}
    </>
  );
}

// ─── Floating contact bubble ───
function BrunoWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Card — positioned above the button */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-18 right-0 w-80 rounded-[5px] bg-black p-6 text-white shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                <Image
                  src="/images/community-manager.webp"
                  alt="Bruno"
                  fill
                  className="object-cover"
                  sizes="48px"
                />
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-green-400" />
              </div>
              <div>
                <p className="text-base font-bold">Bruno</p>
                <p className="text-sm text-white/50">Community Manager</p>
              </div>
            </div>
            <p className="mt-4 text-base text-white/70 leading-relaxed">
              Hey! Need help with your booking? I&apos;m happy to answer any questions.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="mailto:booking@stacey.de"
                className="flex flex-1 items-center justify-center gap-2 rounded-[5px] bg-pink px-4 py-3 text-sm font-bold text-black transition-all duration-200 hover:opacity-80"
              >
                <Mail size={15} /> Email
              </a>
              <a
                href="https://wa.me/4940696389600"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-[5px] bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-white/20"
              >
                WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3"
      >
        {!open && (
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Need help?</span>
        )}
        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-black shadow-lg transition-transform duration-200 hover:scale-110">

        {/* Chat icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className={clsx(
            "absolute text-white transition-all duration-200",
            open ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* Close icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className={clsx(
            "absolute text-white transition-all duration-200",
            open ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        >
          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        </div>
      </button>
    </div>
  );
}
