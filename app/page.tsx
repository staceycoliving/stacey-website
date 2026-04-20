"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LocationCard from "@/components/ui/LocationCard";
import DualCalendar from "@/components/ui/DualCalendar";
import FadeIn from "@/components/ui/FadeIn";
import FeaturesSection from "@/components/home/FeaturesSection";
import VideoSection from "@/components/home/VideoSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import AboutSection from "@/components/home/AboutSection";
import dynamic from "next/dynamic";

const LocationMap = dynamic(() => import("@/components/ui/LocationMap"), { ssr: false });
import { locations, ROOM_NAME_TO_CATEGORY, formatMoveInLabel } from "@/lib/data";
import { expandMoveInDates } from "@/lib/availability";


export default function HomePage() {
  const [step, setStep] = useState(0); // 0=stay type, 1=persons, 2=booking
  const [stayType, setStayType] = useState<"SHORT" | "LONG" | null>(null);
  const [persons, setPersons] = useState<1 | 2 | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [longCity, setLongCity] = useState("");
  const [longMoveIn, setLongMoveIn] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [locView, setLocView] = useState<"list" | "map">("list");
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [longStayDates, setLongStayDates] = useState<{ value: string; label: string }[]>([]);
  const [loadingLongDates, setLoadingLongDates] = useState(false);
  // Raw availability per location → category → moveInDates
  type AvailMap = Record<string, Record<string, { available: number; moveInDates?: string[]; pricePerNight?: number | null }>>;
  const [longAvailability, setLongAvailability] = useState<AvailMap>({});
  const [shortAvailability, setShortAvailability] = useState<AvailMap>({});

  // Base nightly prices from apaleo (fetched once on mount)
  const [basePrices, setBasePrices] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok) setBasePrices(res.data);
      })
      .catch(() => {});
  }, []);

  const getLowestPrice = (slug: string) => {
    // First try live prices from shortAvailability (after date selection)
    const liveEntries = shortAvailability[slug] ? Object.values(shortAvailability[slug]) : [];
    const livePrices = liveEntries.map(c => c.pricePerNight).filter((p): p is number => p != null && p > 0);
    if (livePrices.length > 0) return Math.min(...livePrices);
    // Fallback: base prices from apaleo
    const base = basePrices[slug] ? Object.values(basePrices[slug]) : [];
    if (base.length > 0) return Math.min(...base);
    // Last resort: data.ts
    const loc = locations.find(l => l.slug === slug);
    return loc?.priceFrom || null;
  };

  const lowestShortPrice = (() => {
    const prices = locations.filter(l => l.stayType === "SHORT").map(l => getLowestPrice(l.slug)).filter((p): p is number => p != null);
    return prices.length > 0 ? Math.min(...prices) : null;
  })();

  // Fetch SHORT stay availability when dates are set
  useEffect(() => {
    if (stayType !== "SHORT" || !checkIn || !checkOut || !persons) return;
    const nights = Math.round((new Date(checkOut!).getTime() - new Date(checkIn!).getTime()) / 86400000);
    if (nights < 5) return;

    const locs = locations.filter((l) => l.stayType === "SHORT");
    const fetches = locs.map((loc) =>
      fetch(`/api/availability?location=${loc.slug}&persons=${persons}&checkIn=${checkIn}&checkOut=${checkOut}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((res) => ({ slug: loc.slug, data: res?.ok ? res.data : null }))
    );

    Promise.all(fetches).then((results) => {
      const map: AvailMap = {};
      for (const { slug, data } of results) {
        // Always insert an entry for the location, even on fetch failure — that way
        // the display logic knows we tried (and won't fall back to 1-person basePrices).
        if (!data?.categories) {
          map[slug] = {};
          continue;
        }
        const catMap: Record<string, { available: number; pricePerNight?: number | null }> = {};
        for (const cat of data.categories) {
          catMap[cat.category] = { available: cat.available ?? 0, pricePerNight: cat.pricePerNight ?? null };
        }
        map[slug] = catMap;
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
    const fetchOnce = async (url: string) => {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        return body?.ok ? body.data : null;
      }
      if (res.status >= 500) throw new Error(`retry ${res.status}`);
      return null;
    };
    const fetches = locs.map(async (loc) => {
      const url = `/api/availability?location=${loc.slug}&persons=${persons}`;
      try {
        return await fetchOnce(url);
      } catch {
        await new Promise((r) => setTimeout(r, 600));
        try { return await fetchOnce(url); } catch { return null; }
      }
    });

    Promise.all(fetches).then((results) => {
      // Store raw availability for filtering results
      const availMap: AvailMap = {};
      const earliestDates: string[] = [];
      for (const data of results) {
        if (!data?.categories) continue;
        const catMap: Record<string, { available: number; moveInDates?: string[] }> = {};
        for (const cat of data.categories) {
          catMap[cat.category] = { available: cat.freeNow ?? 0, moveInDates: cat.moveInDates };
          if (cat.moveInDates) earliestDates.push(...cat.moveInDates);
        }
        availMap[data.location] = catMap;
      }
      setLongAvailability(availMap);

      setLongStayDates(
        expandMoveInDates(earliestDates).map((d) => ({
          value: d,
          label: formatMoveInLabel(d),
        }))
      );
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
      setShowResults(false); // hide stale results until a new range is picked
    } else if (date > checkIn) {
      setCheckOut(date);
    } else {
      setCheckIn(date);
      setCheckOut(null);
      setShowResults(false);
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
                    Starting from &euro;695/month
                  </p>
                )}
                {persons === null && stayType === "SHORT" && lowestShortPrice && (
                  <p className="mt-4 text-xs text-white/40 sm:text-sm">
                    Almost everything included from &euro;{lowestShortPrice}/night
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
                        {persons === 2 ? "2 persons · couple-friendly rooms" : "1 person"}{lowestShortPrice ? <> · from &euro;{lowestShortPrice}/night</> : ""}
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
                        className="w-full appearance-none rounded-[5px] border border-[#E5E5E5] bg-white px-3 py-2.5 text-base outline-none sm:text-sm"
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
                          className="w-full appearance-none rounded-[5px] border border-[#E5E5E5] bg-white px-3 py-2.5 text-base outline-none disabled:opacity-50 sm:text-sm"
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
                                // Once live data is loaded for this location, trust it — don't fall
                                // back to basePrices, which are always fetched for 1 person.
                                const liveLoaded = shortAvailability[loc.slug] !== undefined;
                                const livePrice = cat ? shortAvailability[loc.slug]?.[cat]?.pricePerNight : null;
                                const basePrice = cat ? basePrices[loc.slug]?.[cat] : null;
                                const displayPrice = liveLoaded ? livePrice : basePrice;
                                if (displayPrice != null) {
                                  return <>&euro;{displayPrice}<span className="text-xs font-normal text-gray">/night</span></>;
                                }
                                return <span className="text-xs font-normal text-gray">{liveLoaded ? "Sold out" : "Select dates for pricing"}</span>;
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
                              href={stayType === "SHORT"
                                ? `/move-in?room=${room.id}&checkin=${checkIn}&checkout=${checkOut}&persons=${persons ?? 1}&type=short`
                                : `/move-in?room=${room.id}&date=${longMoveIn}&persons=${persons ?? 1}&type=long`}
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

      <FeaturesSection />
      <VideoSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <AboutSection />

      <Footer />
    </>
  );
}
