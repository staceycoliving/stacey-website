"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ArrowRight,
  Sofa,
  CreditCard,
  Users,
  ArrowLeftRight,
  Wifi,
  Sparkles,
  WashingMachine,
  Wrench,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LocationCard from "@/components/ui/LocationCard";
import DualCalendar from "@/components/ui/DualCalendar";
import FadeIn from "@/components/ui/FadeIn";
import dynamic from "next/dynamic";

const LocationMap = dynamic(() => import("@/components/ui/LocationMap"), { ssr: false });
import { locations, memberStories, ROOM_NAME_TO_CATEGORY } from "@/lib/data";


export default function HomePage() {
  const [step, setStep] = useState(0); // 0=stay type, 1=persons, 2=booking
  const [stayType, setStayType] = useState<"SHORT" | "LONG" | null>(null);
  const [persons, setPersons] = useState<1 | 2 | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [longCity, setLongCity] = useState("");
  const [longMoveIn, setLongMoveIn] = useState("");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(2); // Jihane starts in spotlight
  const [spotlightPlaying, setSpotlightPlaying] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [locView, setLocView] = useState<"list" | "map">("list");
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [longStayDates, setLongStayDates] = useState<{ value: string; label: string }[]>([]);
  const [loadingLongDates, setLoadingLongDates] = useState(false);
  // Raw availability per location → category → moveInDates
  type AvailMap = Record<string, Record<string, { available: number; moveInDates?: string[]; pricePerNight?: number | null }>>;
  const [longAvailability, setLongAvailability] = useState<AvailMap>({});
  const [shortAvailability, setShortAvailability] = useState<AvailMap>({});

  // Fetch SHORT stay availability when dates are set
  useEffect(() => {
    if (stayType !== "SHORT" || !checkIn || !checkOut || !persons) return;
    const nights = Math.round((new Date(checkOut!).getTime() - new Date(checkIn!).getTime()) / 86400000);
    if (nights < 5) return;

    const locs = locations.filter((l) => l.stayType === "SHORT");
    const fetches = locs.map((loc) =>
      fetch(`/api/availability?location=${loc.slug}&persons=${persons}&checkIn=${checkIn}&checkOut=${checkOut}`)
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null)
    );

    Promise.all(fetches).then((results) => {
      const map: AvailMap = {};
      for (const data of results) {
        if (!data?.categories) continue;
        const catMap: Record<string, { available: number; pricePerNight?: number | null }> = {};
        for (const cat of data.categories) {
          catMap[cat.category] = { available: cat.available ?? 0, pricePerNight: cat.pricePerNight ?? null };
        }
        map[data.location] = catMap;
      }
      setShortAvailability(map);
    });
  }, [stayType, checkIn, checkOut, persons]);

  // Fetch LONG stay availability when city changes
  useEffect(() => {
    if (stayType !== "LONG" || !longCity || !persons) return;
    setLoadingLongDates(true);
    setLongStayDates([]);
    setLongMoveIn("");

    const locs = locations.filter((l) => l.stayType === "LONG" && l.city === longCity);
    const fetches = locs.map((loc) =>
      fetch(`/api/availability?location=${loc.slug}&persons=${persons}`)
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null)
    );

    Promise.all(fetches).then((results) => {
      const now = new Date();
      const localDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const today = localDate(now);
      const limit = new Date(now);
      limit.setDate(limit.getDate() + 30);
      const limitStr = localDate(limit);

      // Store raw availability for filtering results
      const availMap: AvailMap = {};
      for (const data of results) {
        if (!data?.categories) continue;
        const catMap: Record<string, { available: number; moveInDates?: string[] }> = {};
        for (const cat of data.categories) {
          catMap[cat.category] = { available: cat.freeNow ?? 0, moveInDates: cat.moveInDates };
        }
        availMap[data.location] = catMap;
      }
      setLongAvailability(availMap);

      // Collect earliest moveInDates
      const earliestDates = new Set<string>();
      for (const data of results) {
        if (!data?.categories) continue;
        for (const cat of data.categories) {
          if (cat.moveInDates) cat.moveInDates.forEach((d: string) => earliestDates.add(d));
        }
      }

      // Expand into all bookable days
      const bookableDays = new Set<string>();
      for (const earliest of earliestDates) {
        if (earliest < today) continue;
        if (earliest > limitStr) {
          bookableDays.add(earliest);
        } else {
          const d = new Date(earliest + "T12:00:00");
          while (localDate(d) <= limitStr) {
            bookableDays.add(localDate(d));
            d.setDate(d.getDate() + 1);
          }
        }
      }

      const sorted = [...bookableDays].filter((d) => d >= today).sort();
      setLongStayDates(sorted.map((d) => ({
        value: d,
        label: d === today
          ? "Today"
          : new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      })));
      setLoadingLongDates(false);
    });
  }, [stayType, longCity, persons]);

  // Compute search results based on hero selections
  const searchResults = (() => {
    if (stayType === "SHORT") {
      const hasAvail = Object.keys(shortAvailability).length > 0;
      const datesSelected = checkIn && checkOut && Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) >= 5;
      return locations
        .filter((l) => l.stayType === "SHORT")
        .map((l) => ({
          location: l,
          rooms: l.rooms
            .filter((r) => (persons === 2 ? r.forCouples : true))
            .filter((r) => {
              if (!hasAvail || !datesSelected) return true;
              const cat = ROOM_NAME_TO_CATEGORY[r.name];
              const catData = cat ? shortAvailability[l.slug]?.[cat] : null;
              if (!catData) return false;
              return catData.available > 0;
            }),
        }));
    }
    if (stayType === "LONG" && longCity) {
      const hasAvail = Object.keys(longAvailability).length > 0;
      return locations
        .filter((l) => l.city === longCity && l.stayType === "LONG")
        .map((l) => ({
          location: l,
          rooms: l.rooms
            .filter((r) => (persons === 2 ? r.forCouples : true))
            .filter((r) => {
              if (!hasAvail) return true; // show all while loading
              const cat = ROOM_NAME_TO_CATEGORY[r.name];
              const catData = cat ? longAvailability[l.slug]?.[cat] : null;
              if (!catData) return false; // no DB data for this category → hide
              if (!longMoveIn) return true; // no date selected yet → show all
              // Check if room is available on selected date
              return catData.moveInDates
                ? catData.moveInDates.some((d) => longMoveIn >= d)
                : catData.available > 0;
            }),
        }))
        // Don't filter out empty locations — show "Sold out" instead
        ;
    }
    return [];
  })();

  const totalRooms = searchResults.reduce((acc, r) => acc + r.rooms.length, 0);

  const testimonials = [
    { name: "Daniel", desc: "First time in Hamburg for studies", video: "/images/interview-1.mp4", thumb: "/images/interview-1-thumb.webp" },
    { name: "Christian", desc: "Relocated to Hamburg for work", video: "/images/interview-2.mp4", thumb: "/images/interview-2-thumb.webp" },
    { name: "Jihane", desc: "Moved from Lebanon to Berlin", video: "/images/interview-3.mp4", thumb: "/images/interview-3-thumb.webp", quote: "Strangers became neighbors and neighbors became family." },
  ];
  const spotlightMember = testimonials[spotlightIndex];
  const smallMembers = testimonials.filter((_, i) => i !== spotlightIndex);

  // Pre-compute values used in step 2
  const nights = checkIn && checkOut
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  const tooShort = nights > 0 && nights < 5;
  const cityLocations = longCity
    ? locations.filter((l) => l.city === longCity && l.stayType === "LONG")
    : [];

  const orderedLocations = [
    locations.find(l => l.slug === "mitte")!,
    locations.find(l => l.slug === "muehlenkamp")!,
    ...locations.filter(l => l.slug !== "mitte" && l.slug !== "muehlenkamp"),
  ];

  const handleStayType = (type: "SHORT" | "LONG") => {
    setStayType(type);
    setStep(1);
  };

  const handlePersons = (p: 1 | 2) => {
    setPersons(p);
    setStep(2);
  };

  const handleCalendarSelect = (date: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
    } else if (date > checkIn) {
      setCheckOut(date);
    } else {
      setCheckIn(date);
      setCheckOut(null);
    }
  };

  const handleReset = () => {
    setStep(0);
    setStayType(null);
    setPersons(null);
    setCheckIn(null);
    setCheckOut(null);
    setLongCity("");
    setLongMoveIn("");
  };

  return (
    <>
      <Navbar transparent />

      {/* ── HERO — 90vh, stepped booking ──────── */}
      <section className="relative flex min-h-[600px] h-[80vh] items-center justify-center overflow-hidden">
        <Image
          src="/images/website-hero.webp"
          alt="STACEY Coliving"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/50" />

        <div className="relative z-30 w-full max-w-6xl px-5 text-center sm:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            OUR MEMBERS CALL US <span className="italic font-light">HOME.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 sm:mt-10"
          >
            {/* Step 0: Short or Long */}
            {step === 0 && (
              <>
                <p className="text-base font-semibold text-white sm:text-lg">How long do you want to stay?</p>
                <div className="mt-5 flex flex-col items-center gap-3 sm:mt-6 sm:flex-row sm:justify-center sm:gap-4">
                  <button
                    onClick={() => handleStayType("SHORT")}
                    className="w-full rounded-[5px] bg-white px-6 py-3.5 text-sm font-extrabold tracking-wide text-black transition-all duration-200 hover:opacity-80 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                  >
                    SHORT <span className="font-medium">&middot; &lt;3 months</span>
                  </button>
                  <button
                    onClick={() => handleStayType("LONG")}
                    className="w-full rounded-[5px] border-2 border-white bg-white/10 px-6 py-3.5 text-sm font-extrabold tracking-wide text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                  >
                    LONG <span className="font-medium">&middot; 3+ months</span>
                  </button>
                </div>
                <p className="mt-4 text-xs text-white/70 sm:text-sm">Free to browse · no commitment</p>
              </>
            )}

            {/* Step 1: How many persons */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-base font-semibold text-white sm:text-lg">Moving in alone or as a couple?</p>
                <div className="mt-5 flex flex-col items-center gap-3 sm:mt-6 sm:flex-row sm:justify-center sm:gap-4">
                  <button
                    onClick={() => handlePersons(1)}
                    className="w-full rounded-[5px] bg-white px-6 py-3.5 text-sm font-bold text-black transition-all duration-200 hover:opacity-80 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                  >
                    1 person
                  </button>
                  <button
                    onClick={() => handlePersons(2)}
                    className="w-full rounded-[5px] border-2 border-white bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                  >
                    2 persons
                  </button>
                </div>
                {persons === null && stayType === "LONG" && (
                  <p className="mt-4 text-xs text-white/40 sm:text-sm">
                    All-inclusive from &euro;695/month
                  </p>
                )}
                {persons === null && stayType === "SHORT" && (
                  <p className="mt-4 text-xs text-white/40 sm:text-sm">
                    Almost everything included from &euro;{Math.min(...locations.filter(l => l.stayType === "SHORT").map(l => l.priceFrom))}/night
                  </p>
                )}
                <button onClick={() => setStep(0)} className="mt-4 text-sm text-white/40 hover:text-white/70">
                  &larr; Back
                </button>
              </motion.div>
            )}

            {/* Step 2 SHORT: Calendar */}
            {step === 2 && stayType === "SHORT" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mx-auto max-w-lg rounded-[5px] bg-white p-5 shadow-2xl text-left"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Short Stay · Hamburg</p>
                      <p className="text-[11px] text-gray">
                        {persons === 2 ? "2 persons · couple-friendly rooms" : "1 person"} · from &euro;{(() => {
                          const prices = Object.values(shortAvailability).flatMap(loc => Object.values(loc)).map(c => c.pricePerNight).filter((p): p is number => p != null && p > 0);
                          return prices.length > 0 ? Math.min(...prices) : Math.min(...locations.filter(l => l.stayType === "SHORT").map(l => l.priceFrom));
                        })()}/night
                      </p>
                    </div>
                    <button onClick={handleReset} className="text-xs text-gray hover:text-black">
                      Start over
                    </button>
                  </div>

                  <p className="mb-2 text-xs font-medium text-gray">
                    {!checkIn ? "Select check-in date" : !checkOut ? "Now select check-out date" : "Your dates"}
                  </p>

                  <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={handleCalendarSelect} />

                  {tooShort && (
                    <p className="mt-3 text-xs font-medium text-[#E25C5C]">
                      Minimum stay is 5 nights. Please select a later check-out date.
                    </p>
                  )}

                  {checkIn && checkOut && !tooShort && (
                    <div className="mt-4 border-t border-[#F0F0F0] pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray">
                          {new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" → "}
                          {new Date(checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="font-bold">{nights} nights</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowResults(true);
                          setTimeout(() => document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth" }), 100);
                        }}
                        className="mt-3 block w-full rounded-[5px] bg-black py-3 text-center text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
                      >
                        Search available rooms
                      </button>
                    </div>
                  )}
                </motion.div>
            )}

            {/* Step 2 LONG: City + Date + Location preview */}
            {step === 2 && stayType === "LONG" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mx-auto max-w-sm rounded-[5px] bg-white p-5 shadow-2xl text-left"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Long Stay</p>
                      <p className="text-[11px] text-gray">
                        {persons === 2 ? "2 persons · couple-friendly rooms" : "1 person"} · open-end lease
                      </p>
                    </div>
                    <button onClick={handleReset} className="text-xs text-gray hover:text-black">
                      Start over
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray">City</label>
                      <select
                        value={longCity}
                        onChange={(e) => { setLongCity(e.target.value); setLongMoveIn(""); }}
                        className="w-full appearance-none rounded-[5px] border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm outline-none"
                      >
                        <option value="">Select a city</option>
                        <option value="hamburg">Hamburg</option>
                        <option value="berlin">Berlin</option>
                        <option value="vallendar">Vallendar</option>
                      </select>
                    </div>

                    {longCity && cityLocations.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Location preview */}
                        <p className="mb-2 text-xs font-medium text-gray">
                          {cityLocations.length} {cityLocations.length === 1 ? "location" : "locations"} available
                        </p>
                        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                          {cityLocations.map((loc) => (
                            <div key={loc.slug} className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[3px]">
                              <Image
                                src={loc.images[0]}
                                alt={loc.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                          ))}
                          <div className="flex items-center pl-1">
                            <p className="text-[11px] text-gray">
                              from &euro;{Math.min(...cityLocations.map((l) => l.priceFrom))}/mo
                            </p>
                          </div>
                        </div>

                        <label className="mb-1 block text-xs font-medium text-gray">Move-in date</label>
                        <select
                          value={longMoveIn}
                          onChange={(e) => setLongMoveIn(e.target.value)}
                          disabled={loadingLongDates}
                          className="w-full appearance-none rounded-[5px] border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                        >
                          <option value="">{loadingLongDates ? "Checking availability..." : "Select a date"}</option>
                          {longStayDates.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </motion.div>
                    )}

                    {longCity && longMoveIn && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <button
                          onClick={() => {
                            setShowResults(true);
                            setTimeout(() => document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth" }), 100);
                          }}
                          className="mt-1 block w-full rounded-[5px] bg-black py-3 text-center text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
                        >
                          Search available rooms
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
            )}
          </motion.div>
        </div>

        {/* Press banner inside hero at bottom */}
        <div className="absolute bottom-12 left-0 right-0 z-20">
          <div className="mx-auto max-w-xl rounded-[5px] bg-white/80 py-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-6 px-4 sm:gap-10">
              <span className="text-[9px] font-medium uppercase tracking-wider text-black/30">As seen in</span>
              <a href="https://www.abendblatt.de/advertorials/stacey.html" target="_blank" rel="noopener noreferrer" className="opacity-40 transition-opacity hover:opacity-80">
                <img src="/images/press/hamburger-abendblatt.svg" alt="Hamburger Abendblatt" className="h-3.5 brightness-0 sm:h-4" />
              </a>
              <a href="https://www.handelsblatt.com/adv/firmen/stacey.html" target="_blank" rel="noopener noreferrer" className="opacity-40 transition-opacity hover:opacity-80">
                <img src="/images/press/handelsblatt.svg" alt="Handelsblatt" className="h-3.5 brightness-0 sm:h-4" />
              </a>
              <a href="https://unternehmen.welt.de/finanzen-immobilien/coliving.html" target="_blank" rel="noopener noreferrer" className="opacity-40 transition-opacity hover:opacity-80">
                <img src="/images/press/die-welt.svg" alt="Die Welt" className="h-3.5 brightness-0 sm:h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Gradient fade into white */}
        <div className="absolute bottom-0 left-0 right-0 z-10 h-24 bg-gradient-to-t from-white to-transparent" />

      </section>

      {/* ── SEARCH RESULTS ────────────────────── */}
      {showResults && searchResults.length > 0 && (
        <section id="search-results" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {totalRooms} rooms <span className="italic font-light">found</span>
                </h2>
                <p className="mt-1 text-sm text-gray">
                  {stayType === "SHORT"
                    ? `Short stay · Hamburg · ${persons === 2 ? "2 persons" : "1 person"}${checkIn && checkOut ? ` · ${new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${new Date(checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`
                    : `Long stay · ${longCity.charAt(0).toUpperCase() + longCity.slice(1)} · ${persons === 2 ? "2 persons" : "1 person"}${longMoveIn ? ` · from ${new Date(longMoveIn).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}`
                  }
                </p>
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="text-xs font-semibold text-gray transition-all duration-200 hover:opacity-60"
              >
                Clear search
              </button>
            </div>

            <div className="mt-8 space-y-10">
              {searchResults.map(({ location: loc, rooms }) => (
                <div key={loc.slug}>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-extrabold">STACEY {loc.name}</h3>
                    <span className="text-xs text-gray">{loc.neighborhood}, {loc.city === "hamburg" ? "Hamburg" : loc.city === "berlin" ? "Berlin" : "Vallendar"}</span>
                    <Link href={`/locations/${loc.slug}`} className="ml-auto text-xs font-semibold text-gray transition-all duration-200 hover:opacity-60">
                      View location &rarr;
                    </Link>
                  </div>

                  {rooms.length === 0 && (
                    <p className="mt-3 text-sm text-gray">Sold out for this date</p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className={`overflow-hidden rounded-[5px] bg-white transition-all ${
                          expandedRoom === room.id ? "ring-2 ring-black" : "ring-1 ring-[#E5E5E5]"
                        }`}
                      >
                        <button
                          onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                          className="w-full text-left"
                        >
                          <div className="relative aspect-[4/3]">
                            <Image
                              src={room.image}
                              alt={room.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />
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
                              {room.sizeSqm && <p className="text-xs text-gray">{room.sizeSqm} m&sup2;</p>}
                            </div>
                            <p className="mt-1 text-xl font-extrabold">
                              {loc.stayType === "SHORT" ? (() => {
                                const cat = ROOM_NAME_TO_CATEGORY[room.name];
                                const price = cat ? shortAvailability[loc.slug]?.[cat]?.pricePerNight : null;
                                return price
                                  ? <>&euro;{price}<span className="text-xs font-normal text-gray">/night</span></>
                                  : <><span className="text-xs font-normal text-gray">Select dates for pricing</span></>;
                              })() : (
                                <>&euro;{room.priceMonthly}<span className="text-xs font-normal text-gray">/mo</span></>
                              )}
                            </p>
                          </div>
                        </button>

                        {expandedRoom === room.id && (
                          <div className="border-t border-[#E5E5E5] p-4">
                            <p className="text-sm leading-relaxed text-gray">{room.description}</p>
                            <p className="mt-2 text-xs text-gray">
                              <span className="font-semibold text-black">Includes:</span> {room.interior}
                            </p>
                            <Link
                              href={`/move-in?room=${room.id}&date=${stayType === "SHORT" ? checkIn : longMoveIn}&type=${stayType?.toLowerCase()}`}
                              className="mt-4 flex items-center justify-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
                            >
                              Book this room <ArrowRight size={14} />
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── LOCATIONS ─────────────────────────── */}
      <section className="bg-white pb-16 pt-6">
        <FadeIn>
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">

            {(() => (
                <div className="relative mt-4">
                  <div
                    id="locations-scroll"
                    className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {orderedLocations.map((loc) => {
                      const href = `/locations/${loc.slug}`;
                      return (
                        <Link
                          key={loc.slug}
                          href={href}
                          className="group relative w-[85vw] flex-shrink-0 snap-start overflow-hidden rounded-[5px] sm:w-[340px]"
                        >
                          <div className="relative aspect-[3/4]">
                            <Image
                              src={loc.images[0]}
                              alt={loc.name}
                              fill
                              className="object-cover"
                              sizes="340px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-colors duration-300 group-hover:from-black/70 group-hover:via-black/30 group-hover:to-black/20" />
                            <div className="absolute left-3 top-3">
                              <span className={`rounded-[5px] px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                                loc.stayType === "SHORT"
                                  ? "bg-black text-white"
                                  : "bg-pink text-white"
                              }`}>
                                {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                              </span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                                {loc.city === "hamburg" ? "Hamburg" : loc.city === "berlin" ? "Berlin" : "Vallendar"}
                              </p>
                              <h3 className="mt-1 text-xl font-bold text-white">{loc.name}</h3>
                              <span className="mt-2 inline-block rounded-[5px] bg-white/20 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm">
                                from &euro;{loc.priceFrom}{loc.stayType === "SHORT" ? "/night" : "/mo"}
                              </span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                              <span className="rounded-[5px] bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg">
                                View rooms
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Find your room CTA card */}
                    <Link
                      href="/move-in"
                      className="group relative w-[85vw] flex-shrink-0 snap-start overflow-hidden rounded-[5px] bg-black sm:w-[340px]"
                    >
                      <div className="relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden">
                        {/* Animated gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-pink via-black to-pink opacity-30 transition-opacity duration-500 group-hover:opacity-50" style={{ backgroundSize: "200% 200%", animation: "gradientShift 5s ease infinite" }} />

                        {/* Floating room images */}
                        <div className="absolute -left-4 -top-4 h-24 w-24 rotate-12 overflow-hidden rounded-[5px] opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:rotate-6">
                          <Image src={locations[0].images[0]} alt="" fill className="object-cover" sizes="96px" />
                        </div>
                        <div className="absolute -bottom-4 -right-4 h-28 w-28 -rotate-12 overflow-hidden rounded-[5px] opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:-rotate-6">
                          <Image src={locations[3].images[0]} alt="" fill className="object-cover" sizes="112px" />
                        </div>
                        <div className="absolute -bottom-2 -left-6 h-20 w-20 rotate-6 overflow-hidden rounded-[5px] opacity-15 transition-all duration-500 group-hover:opacity-30 group-hover:rotate-3">
                          <Image src={locations[5].images[0]} alt="" fill className="object-cover" sizes="80px" />
                        </div>
                        <div className="absolute -right-6 top-8 h-20 w-20 -rotate-6 overflow-hidden rounded-[5px] opacity-15 transition-all duration-500 group-hover:opacity-30 group-hover:-rotate-3">
                          <Image src={locations[7].images[0]} alt="" fill className="object-cover" sizes="80px" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 text-center px-6">
                          <p className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                            FIND<br />YOUR<br />ROOM
                          </p>
                          <div className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-white px-6 py-3 text-sm font-bold text-black shadow-xl transition-transform duration-300 group-hover:scale-110">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>


                  <button
                    onClick={() => document.getElementById("locations-scroll")?.scrollBy({ left: -300, behavior: "smooth" })}
                    className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-md transition-transform hover:scale-110 sm:block"
                    aria-label="Scroll left"
                  >
                    <ChevronDown size={18} className="rotate-90" />
                  </button>
                  <button
                    onClick={() => document.getElementById("locations-scroll")?.scrollBy({ left: 300, behavior: "smooth" })}
                    className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-md transition-transform hover:scale-110 sm:block"
                    aria-label="Scroll right"
                  >
                    <ChevronDown size={18} className="-rotate-90" />
                  </button>
                </div>
            ))()}
          {/* Map below cards */}
          <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:px-8">
            <h3 className="mb-6 text-center text-lg font-extrabold tracking-tight sm:text-xl">
              Find us on the <span className="italic font-light">map</span>
            </h3>
            <LocationMap />
          </div>
        </div>
        </FadeIn>
      </section>

      {/* ── FEATURES — What's included ────────── */}
      <section className="bg-[#FAFAFA] py-20">
        <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Almost everything<br /><span className="italic font-light">included.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                One price. No surprises. Move in with just a suitcase.
              </p>
              <Link
                href="/move-in"
                className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
              >
                Find your room <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: <Sofa size={18} />, text: "Fully furnished private suite" },
                { icon: <CreditCard size={18} />, text: "Utilities included" },
                { icon: <Wifi size={18} />, text: "Internet included" },
                { icon: <Sparkles size={18} />, text: "Weekly professional cleaning" },
                { icon: <Users size={18} />, text: "Community events & shared spaces" },
                { icon: <ArrowLeftRight size={18} />, text: "Transfer between locations" },
                { icon: <Wrench size={18} />, text: "Maintenance & repair service" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 rounded-[5px] bg-white px-4 py-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink/20 text-black">{f.icon}</span>
                  <p className="text-sm font-medium">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        </FadeIn>
      </section>


      {/* ── VIDEO ─────────────────────────────── */}
      <section className="bg-white py-20">
        <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
            {/* Video left */}
            <div id="stacey-video" className="relative aspect-video overflow-hidden rounded-[5px]">
              {!videoPlaying ? (
                <>
                  <img
                    src="/images/video-thumbnail.webp"
                    alt="Life at STACEY"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/15" />
                  <button
                    onClick={() => setVideoPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-110 sm:h-16 sm:w-16">
                      <div className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                      <svg viewBox="0 0 24 24" fill="currentColor" className="relative ml-1 h-6 w-6 text-black"><polygon points="5,3 19,12 5,21" /></svg>
                    </div>
                  </button>
                </>
              ) : (
                <video
                  autoPlay
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full"
                >
                  <source src="/images/life-at-stacey.mp4" type="video/mp4" />
                </video>
              )}
            </div>

            {/* Text right */}
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                More than a place<br />to <span className="italic font-light">sleep.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                Community events, shared dinners, coworking spaces, and friendships
                that last. This is what coliving at STACEY feels like.
              </p>
            </div>
          </div>
        </div>
        </FadeIn>
      </section>

      {/* ── HOW IT WORKS — Boarding Pass ────── */}
      <section className="bg-[#FAFAFA] py-20">
        <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Your journey to <span className="italic font-light">home.</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { num: "01", title: "Start exploring", desc: "Explore our coliving locations and sign up online to begin the booking process." },
              { num: "02", title: "Choose your Suite", desc: "We'll reach out and give you access to our booking platform. Pick your favorite suite." },
              { num: "03", title: "Make memories", desc: "You are now a member! Attend events, connect with other members and enjoy your time." },
            ].map((s) => (
              <div key={s.num} className="relative overflow-hidden rounded-[5px] border-2 border-dashed border-[#D9D9D9] bg-white p-6">
                <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#FAFAFA]" />
                <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#FAFAFA]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink">Boarding Pass</p>
                <p className="mt-3 text-4xl font-black text-black/[0.07]">{s.num}</p>
                <h3 className="mt-2 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/move-in"
              className="inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              Get Started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        </FadeIn>
      </section>

      {/* ── TESTIMONIALS — Spotlight ─────────── */}
      <section className="bg-white py-20">
        <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Hear from our <span className="italic font-light">members</span>
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Spotlight */}
            <div className="sm:col-span-2 sm:row-span-2">
              {(() => {
                const isPlaying = spotlightPlaying === spotlightIndex;
                return (
                  <div className="relative h-full overflow-hidden rounded-[5px]">
                    {!isPlaying ? (
                      <>
                        <Image
                          src={spotlightMember.thumb}
                          alt={spotlightMember.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 60vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <button
                          onClick={() => setSpotlightPlaying(spotlightIndex)}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-110 sm:h-16 sm:w-16">
                            <div className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                            <svg viewBox="0 0 24 24" fill="currentColor" className="relative ml-1 h-6 w-6 text-black"><polygon points="5,3 19,12 5,21" /></svg>
                          </div>
                        </button>
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                          <p className="text-xl font-extrabold text-white sm:text-2xl">{spotlightMember.name}</p>
                          <p className="mt-1 text-sm text-white/80 sm:text-base">{spotlightMember.desc}</p>
                          {spotlightMember.quote && (
                            <p className="mt-2 text-sm italic leading-relaxed text-white/90">
                              &ldquo;{spotlightMember.quote}&rdquo;
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <video
                        key={spotlightMember.video}
                        autoPlay
                        controls
                        playsInline
                        className="absolute inset-0 h-full w-full rounded-[5px]"
                      >
                        <source src={spotlightMember.video} type="video/mp4" />
                      </video>
                    )}
                  </div>
                );
              })()}
            </div>
            {/* Small cards */}
            {smallMembers.map((t) => {
              const originalIndex = testimonials.indexOf(t);
              return (
                <button
                  key={t.name}
                  onClick={() => { setSpotlightIndex(originalIndex); setSpotlightPlaying(null); }}
                  className="group relative overflow-hidden rounded-[5px] text-left transition-all"
                >
                  <div className="relative aspect-video">
                    <Image
                      src={t.thumb}
                      alt={t.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition-transform group-hover:scale-110">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4 text-black"><polygon points="5,3 19,12 5,21" /></svg>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-3" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-[11px] text-white/80">{t.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        </FadeIn>
      </section>

      {/* ── ABOUT / STORY ──────────────────── */}
      <section className="bg-[#FAFAFA] py-20">
        <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
            {/* Photo left */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[5px]">
              <Image
                src="/images/stacey-team.webp"
                alt="The STACEY Team"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Text right */}
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                The story behind <span className="italic font-light">STACEY.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                Founded in Hamburg in 2019 with a simple mission: make city living
                better. We believe that home is more than four walls — it&apos;s the
                people you share it with.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gray">
                From our first apartment in Winterhude to locations across Germany,
                we&apos;re building a community of like-minded people who value
                connection, convenience and beautiful spaces.
              </p>
              <Link
                href="/why-stacey"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black transition-all duration-200 hover:opacity-60"
              >
                Learn more about us <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
        </FadeIn>
      </section>

      <Footer />
    </>
  );
}
