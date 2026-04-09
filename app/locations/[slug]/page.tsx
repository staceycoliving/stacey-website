"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, User, Users, ChevronLeft, ChevronRight, X, ArrowRight } from "lucide-react";
import DualCalendar from "@/components/ui/DualCalendar";
import FadeIn from "@/components/ui/FadeIn";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getLocationBySlug, getNearbyLocations, locations, ROOM_NAME_TO_CATEGORY } from "@/lib/data";
import type { Location } from "@/lib/data";

export default function LocationPage() {
  const params = useParams();
  const slug = params.slug as string;
  const location = getLocationBySlug(slug);

  if (!location) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray">Location not found.</p>
      </div>
    );
  }

  return <LocationDetail location={location} />;
}


// ─── Booking Card Content (shared between desktop sticky + mobile) ───
function BookingCardContent({
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
  tooShort,
  availableDates,
  availableRoomCount,
  loadingAvail,
  lowestNightlyPrice,
  lowestMonthlyPrice,
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
  tooShort: boolean;
  availableDates: { value: string; label: string }[];
  availableRoomCount: number;
  loadingAvail: boolean;
  lowestNightlyPrice: number | null;
  lowestMonthlyPrice: number | null;
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
              <DualCalendar checkIn={checkIn} checkOut={checkOut} onSelect={handleCalendarSelect} />
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
            className="w-full appearance-none rounded-[5px] border border-white/20 bg-white/10 px-4 py-3 text-center text-sm text-white outline-none"
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

// ─── Main Detail Component ───────────────────────────────────────
function LocationDetail({ location }: { location: Location }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>(location.images);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setLightboxIndex((prev) => (prev! + 1) % lightboxImages.length);
      if (e.key === "ArrowLeft") setLightboxIndex((prev) => (prev! - 1 + lightboxImages.length) % lightboxImages.length);
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, lightboxImages.length]);

  const [moveInDate, setMoveInDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [persons, setPersons] = useState<1 | 2>(1);
  const [roomDates, setRoomDates] = useState<Record<string, string>>({});
  const [roomPersons, setRoomPersons] = useState<Record<string, 1 | 2>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleGlobalDateChange = (date: string) => {
    setMoveInDate(date);
    setRoomDates({});
  };
  const handleCalendarSelect = (date: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut("");
      setRoomDates({});
    } else if (date > checkIn) {
      setCheckOut(date);
      setRoomDates({});
    } else {
      setCheckIn(date);
      setCheckOut("");
      setRoomDates({});
    }
  };

  // Map
  const neighborhoodMapRef = useRef<HTMLDivElement>(null);
  const neighborhoodMapInstance = useRef<any>(null);
  const locationCoords: Record<string, [number, number]> = {
    muehlenkamp: [10.0134, 53.5875],
    eppendorf: [9.9858, 53.5895],
    downtown: [10.0022, 53.5468],
    alster: [10.0103, 53.5553],
    "st-pauli": [9.9658, 53.5525],

    eimsbuettel: [9.9603, 53.5745],
    mitte: [13.4050, 52.5115],
    vallendar: [7.6187, 50.3964],
  };

  useEffect(() => {
    if (!neighborhoodMapRef.current || neighborhoodMapInstance.current) return;
    const coords = locationCoords[location.slug] || [10.0, 53.55];

    // Load mapbox CSS + JS via CDN to avoid Turbopack hanging on mapbox-gl
    const cdnBase = "https://api.mapbox.com/mapbox-gl-js/v3.9.4";

    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${cdnBase}/mapbox-gl.css`;
      document.head.appendChild(link);
    }

    const initMap = () => {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !neighborhoodMapRef.current || neighborhoodMapInstance.current) return;

      mapboxgl.accessToken = "pk.eyJ1Ijoic3RhY2V5MjAxOSIsImEiOiJjazFxZHo2bGMwMjFkM2RzeHNlNjd4NjR3In0.BADipEjIKFaTMjt3dX6F-w";

      const map = new mapboxgl.Map({
        container: neighborhoodMapRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: coords,
        zoom: 15,
        attributionControl: false,
      });
      neighborhoodMapInstance.current = map;

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      const el = document.createElement("div");
      el.innerHTML = `<div style="width:36px;height:36px;background:${location.stayType === "SHORT" ? "#1A1A1A" : "#FCB0C0"};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><span style="color:white;font-weight:900;font-size:15px;font-family:Montserrat,sans-serif;">S</span></div>`;

      new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
    };

    if ((window as any).mapboxgl) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = `${cdnBase}/mapbox-gl.js`;
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => { neighborhoodMapInstance.current?.remove(); neighborhoodMapInstance.current = null; };
  }, [location.slug]);

  const isShort = location.stayType === "SHORT";
  const nights = checkIn && checkOut
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  const tooShort = nights > 0 && nights < 5;

  // ─── Availability from DB ───
  type CatAvail = { available: number; moveInDates?: string[]; pricePerNight?: number | null; monthlyRent?: number | null };
  const [availability, setAvailability] = useState<Record<string, CatAvail>>({});
  const [loadingAvail, setLoadingAvail] = useState(false);

  // Base nightly prices from apaleo (fetched once, before date selection)
  const [basePrices, setBasePrices] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!isShort) return;
    fetch("/api/prices").then(r => r.ok ? r.json() : {}).then((data: Record<string, Record<string, number>>) => {
      setBasePrices(data[location.slug] || {});
    }).catch(() => {});
  }, [location.slug, isShort]);

  const localDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Fetch availability on mount + when persons change
  useEffect(() => {
    const params = new URLSearchParams({ location: location.slug, persons: String(persons) });
    if (isShort && checkIn && checkOut) {
      params.set("checkIn", checkIn);
      params.set("checkOut", checkOut);
    }
    setLoadingAvail(true);
    fetch(`/api/availability?${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.categories) { setAvailability({}); return; }
        const map: Record<string, CatAvail> = {};
        for (const cat of data.categories) {
          map[cat.category] = {
            available: cat.available ?? cat.freeNow ?? 0,
            moveInDates: cat.moveInDates,
            pricePerNight: cat.pricePerNight ?? null,
            monthlyRent: cat.monthlyRent ?? null,
          };
        }
        setAvailability(map);
      })
      .catch(() => setAvailability({}))
      .finally(() => setLoadingAvail(false));
  }, [location.slug, persons, isShort ? `${checkIn}-${checkOut}` : ""]);

  // Build LONG stay move-in dates — per category and combined for the booking card
  const expandDates = (earliestDates: string[]): { value: string; label: string }[] => {
    const now = new Date();
    const today = localDate(now);
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 30);
    const limitStr = localDate(limit);

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
    return sorted.map((d) => ({
      value: d,
      label: d === today
        ? "Today"
        : new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    }));
  };

  // Combined dates (all categories) for the booking card dropdown
  const availableDates = (() => {
    if (isShort) return [];
    const allEarliest: string[] = [];
    for (const catData of Object.values(availability)) {
      if (catData.moveInDates) allEarliest.push(...catData.moveInDates);
    }
    return expandDates(allEarliest);
  })();

  // Per-room dates: only dates for that specific category
  const getRoomDates = (roomName: string): { value: string; label: string }[] => {
    const cat = ROOM_NAME_TO_CATEGORY[roomName];
    const catData = cat ? availability[cat] : null;
    if (!catData?.moveInDates) return [];
    return expandDates(catData.moveInDates);
  };

  // Filter rooms: only hide sold-out when a date is selected
  const hasAvail = Object.keys(availability).length > 0;
  const dateSelected = isShort ? (checkIn && checkOut && nights >= 5) : !!moveInDate;
  const availableRooms = (persons === 2 ? location.rooms.filter((r) => r.forCouples) : location.rooms)
    .filter((r) => {
      if (!hasAvail || !dateSelected) return true; // no date yet → show all categories
      const cat = ROOM_NAME_TO_CATEGORY[r.name];
      const catData = cat ? availability[cat] : null;
      if (!catData) return false; // not in DB → hide
      if (isShort) return catData.available > 0;
      // LONG: check moveInDate
      if (!catData.moveInDates) return catData.available > 0;
      return catData.moveInDates.some((d) => moveInDate >= d);
    });
  const nearby = getNearbyLocations(location);
  const cityLabel = location.city === "hamburg" ? "Hamburg" : location.city === "berlin" ? "Berlin" : "Vallendar";

  // Shared booking card props
  // Compute lowest price from available categories
  const lowestNightlyPrice = isShort
    ? (() => {
        // Live prices from availability (after date selection)
        const livePrices = Object.values(availability).map(c => c.pricePerNight).filter((p): p is number => p != null && p > 0);
        if (livePrices.length > 0) return Math.min(...livePrices);
        // Base prices from apaleo (before date selection)
        const base = Object.values(basePrices);
        if (base.length > 0) return Math.min(...base);
        return null;
      })()
    : null;

  // LONG Stay: lowest monthly rent from available categories (in EUR)
  const lowestMonthlyPrice = !isShort
    ? (() => {
        // Only consider categories that are actually shown (available for selected date)
        const availableCatNames = availableRooms.map(r => ROOM_NAME_TO_CATEGORY[r.name]).filter(Boolean);
        const rents = availableCatNames
          .map(cat => availability[cat]?.monthlyRent)
          .filter((r): r is number => r != null && r > 0);
        if (rents.length > 0) return Math.round(Math.min(...rents) / 100);
        return null;
      })()
    : null;

  const bookingProps = {
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
    tooShort,
    availableDates,
    availableRoomCount: availableRooms.length,
    loadingAvail,
    lowestNightlyPrice,
    lowestMonthlyPrice,
  } as const;

  return (
    <>
      <Navbar locationName={location.name} stayType={location.stayType} />

      {/* ── GALLERY ── */}
      <section className="bg-white pt-20 sm:pt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray">
            <Link href="/" className="transition-all duration-200 hover:opacity-60">Home</Link>
            <span>/</span>
            <span className="text-black">{location.name}</span>
          </nav>

          {/* Mobile: fullwidth swipeable gallery */}
          <div className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory sm:hidden" style={{ scrollbarWidth: "none" }}>
            {location.images.map((img, i) => (
              <button
                key={i}
                onClick={() => { setLightboxImages(location.images); setLightboxIndex(i); }}
                className="relative aspect-[4/3] w-[90vw] flex-shrink-0 snap-start overflow-hidden rounded-[5px]"
              >
                <Image
                  src={img}
                  alt={`${location.name} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="90vw"
                  priority={i === 0}
                />
                <div className="absolute bottom-2 right-2 rounded-[5px] bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {i + 1}/{location.images.length}
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: Airbnb-style — 1 large left + 2x2 right */}
          <div className="hidden sm:grid sm:grid-cols-4 sm:grid-rows-2 sm:gap-3">
            <button
              onClick={() => { setLightboxImages(location.images); setLightboxIndex(0); }}
              className="group relative col-span-2 row-span-2 overflow-hidden rounded-[5px]"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={location.images[0]}
                  alt={`STACEY ${location.name}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="50vw"
                  priority
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/20">
                  <span className="rounded-[5px] bg-white/90 px-4 py-2 text-xs font-semibold text-black opacity-0 shadow transition-opacity duration-300 group-hover:opacity-100">
                    View gallery
                  </span>
                </div>
              </div>
            </button>

            {location.images.slice(1, 5).map((img, i) => (
              <button
                key={i}
                onClick={() => { setLightboxImages(location.images); setLightboxIndex(i + 1); }}
                className="group relative overflow-hidden rounded-[5px]"
              >
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${location.name} ${i + 2}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {i === 3 && location.images.length > 5 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors duration-300 group-hover:bg-black/50">
                      <span className="text-sm font-semibold text-white">+{location.images.length - 5} more</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN GRID: Header → Further Information + Sticky Booking ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative grid grid-cols-1 gap-x-8 gap-y-0 py-10 lg:grid-cols-3">

          {/* ── LEFT COLUMN (2/3) ── */}
          <div className="lg:col-span-2">

            {/* Header */}
            <div>
              <div className="flex items-center gap-3">
                <span className={`rounded-[5px] px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                  location.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white"
                }`}>
                  {location.stayType === "SHORT" ? "SHORT" : "LONG"}
                </span>
                <span className="text-sm text-gray">{cityLabel}</span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                STACEY {location.name}
              </h1>

              <p className="mt-2 text-lg font-semibold italic text-black/70">
                {location.tagline}
              </p>

              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray">
                <MapPin size={14} /> {location.address}
              </p>

              <p className="mt-4 text-sm leading-relaxed text-gray">
                {location.description}
              </p>
            </div>

            {/* Mobile Booking Card */}
            <div className="mt-8 lg:hidden">
              <BookingCardContent {...bookingProps} variant="mobile" />
            </div>

            {/* Rooms */}
            <FadeIn>
            <div id="rooms" className="mt-12 scroll-mt-24">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Choose your <span className="italic font-light">suite</span>
                  </h2>
                  <p className="mt-1 text-sm text-gray">
                    Select a room type and move-in date to book.
                  </p>
                  <p className="mt-1 text-xs text-gray">
                    {availableRooms.length} {availableRooms.length === 1 ? "room type" : "room types"} available{persons === 2 ? " for 2 persons" : ""}{moveInDate ? ` from ${new Date(moveInDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}
                  </p>
                </div>
              </div>

              {/* Room cards */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {availableRooms.map((room) => {
                  const roomDate = roomDates[room.id] || moveInDate;
                  return (
                    <div key={room.id} className="overflow-hidden rounded-t-[5px]">
                      <button
                        onClick={() => {
                          const imgs = room.images || [room.image];
                          setLightboxImages(imgs);
                          setLightboxIndex(0);
                        }}
                        className="group relative w-full overflow-hidden text-left"
                      >
                        <div className="relative aspect-[3/2] overflow-hidden">
                          <Image
                            src={room.image}
                            alt={room.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                          {/* Badges top */}
                          <div className="absolute left-3 top-3 flex gap-2">
                            {room.sizeSqm && (
                              <span className="rounded-[5px] bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black backdrop-blur-sm">
                                {room.sizeSqm} m&sup2;
                              </span>
                            )}
                            <span className={`flex items-center gap-1 rounded-[5px] px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
                              room.forCouples ? "bg-pink text-white" : "bg-white/90 text-black"
                            }`}>
                              {room.forCouples ? (
                                <><Users size={10} /> 2 persons</>
                              ) : (
                                <><User size={10} /> 1 person</>
                              )}
                            </span>
                          </div>

                          {/* Info bottom overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-lg font-extrabold text-white">{room.name}</p>
                            <span className="mt-1 inline-block rounded-[5px] bg-white/20 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm">
                              {isShort
                                ? (() => {
                                    const cat = ROOM_NAME_TO_CATEGORY[room.name];
                                    const price = cat ? availability[cat]?.pricePerNight : null;
                                    const basePrice = cat ? basePrices[cat] : null;
                                    return price ? <>&euro;{price}/night</> : basePrice ? <>&euro;{basePrice}/night</> : <>Select dates</>;
                                  })()
                                : (() => {
                                    const cat = ROOM_NAME_TO_CATEGORY[room.name];
                                    const dbRent = cat ? availability[cat]?.monthlyRent : null;
                                    const basePrice = dbRent ? Math.round(dbRent / 100) : room.priceMonthly;
                                    const surcharge = (roomPersons[room.id] || 1) >= 2 ? 50 : 0;
                                    return <>&euro;{basePrice + surcharge}/mo</>;
                                  })()}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Info + Date + Book */}
                      <div className="rounded-b-[5px] border border-t-0 border-[#E5E5E5] bg-white p-4">
                        <p className="mb-3 text-xs leading-relaxed text-gray">
                          <span className="font-semibold text-black">Includes: </span>{room.interior}
                        </p>
                        {isShort ? (
                          <div className="space-y-2">
                            {checkIn && checkOut && nights >= 5 ? (
                              <>
                                <p className="text-center text-xs text-gray">
                                  {new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  {" → "}
                                  {new Date(checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  {" · "}{nights} nights
                                </p>
                                <Link
                                  href={`/move-in?room=${room.id}&checkin=${checkIn}&checkout=${checkOut}`}
                                  className="flex items-center justify-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
                                >
                                  Book · {nights} nights <ArrowRight size={14} />
                                </Link>
                              </>
                            ) : (
                              <button
                                onClick={() => setCalendarOpen(true)}
                                className="w-full rounded-[5px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2.5 text-center text-sm text-gray transition-all duration-200 hover:bg-[#FAFAFA]"
                              >
                                Select dates
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Persons toggle — only for couple-friendly rooms */}
                            {room.forCouples ? (
                              <div className="mb-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setRoomPersons({ ...roomPersons, [room.id]: 1 })}
                                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-[5px] py-2 text-xs font-bold transition-all duration-200 ${
                                      (roomPersons[room.id] || 1) === 1 ? "bg-black text-white hover:opacity-80" : "border border-[#E5E5E5] text-gray hover:bg-[#FAFAFA]"
                                    }`}
                                  >
                                    <User size={12} /> 1 person
                                  </button>
                                  <button
                                    onClick={() => setRoomPersons({ ...roomPersons, [room.id]: 2 })}
                                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-[5px] py-2 text-xs font-bold transition-all duration-200 ${
                                      (roomPersons[room.id] || 1) === 2 ? "bg-black text-white hover:opacity-80" : "border border-[#E5E5E5] text-gray hover:bg-[#FAFAFA]"
                                    }`}
                                  >
                                    <Users size={12} /> 2 persons
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {(() => {
                              const dates = getRoomDates(room.name);
                              return (
                              <select
                                value={roomDate}
                                onChange={(e) => setRoomDates({ ...roomDates, [room.id]: e.target.value })}
                                className="w-full appearance-none rounded-[5px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2.5 text-center text-sm outline-none"
                              >
                                <option value="">{dates.length === 0 ? "Sold out" : "Move-in date"}</option>
                                {dates.map((d) => (
                                  <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                              </select>
                              );
                            })()}
                            {roomDate ? (
                              <Link
                                href={`/move-in?room=${room.id}&date=${roomDate}&persons=${roomPersons[room.id] || 1}`}
                                className="mt-3 flex items-center justify-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
                              >
                                Book this room · {(roomPersons[room.id] || 1) === 2 ? "2 persons" : "1 person"} <ArrowRight size={14} />
                              </Link>
                            ) : (
                              <p className="mt-2 text-center text-[11px] text-gray">Select a date to book</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </FadeIn>

            {/* Community Space */}
            <FadeIn>
            <div className="mt-16">
              <span className="rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold text-white">360 VIRTUAL TOUR</span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Community <span className="italic font-light">space</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray">{location.communitySpaceDescription}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-[5px] bg-[#E5E5E5] px-3 py-1.5 text-xs font-bold">Lounge</span>
                <span className="rounded-[5px] bg-[#E5E5E5] px-3 py-1.5 text-xs font-bold">Kitchen</span>
                <span className="rounded-[5px] bg-[#E5E5E5] px-3 py-1.5 text-xs font-bold">Coworking</span>
              </div>
              <div className="relative mt-6 aspect-video overflow-hidden rounded-[5px]">
                <iframe
                  src="https://my.matterport.com/show/?m=XegesAR7kDJ&play=1&qs=1"
                  className="absolute inset-0 h-full w-full"
                  allowFullScreen
                  allow="xr-spatial-tracking"
                  title="STACEY Community Space 3D Tour"
                />
              </div>
            </div>
            </FadeIn>

            {/* Neighborhood */}
            <FadeIn>
            <div className="mt-16">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                The <span className="italic font-light">neighborhood</span>
              </h2>
              <p className="mt-1 text-sm font-semibold text-gray">{location.neighborhood}, {cityLabel}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray">{location.neighborhoodDescription}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-black transition-all duration-200 hover:opacity-60"
              >
                Open in Google Maps <ArrowRight size={14} />
              </a>
              <div ref={neighborhoodMapRef} className="mt-6 h-[400px] w-full overflow-hidden rounded-[5px]" />
            </div>
            </FadeIn>

            {/* Community Manager */}
            <FadeIn>
            <div className="mt-16">
              <h2 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Your community <span className="italic font-light">manager</span>
              </h2>
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-full sm:h-44 sm:w-44">
                  <Image
                    src={location.communityManager.image}
                    alt={location.communityManager.name}
                    fill
                    className="object-cover"
                    sizes="176px"
                  />
                </div>
                <div>
                  <div className="rounded-[5px] rounded-tl-none bg-[#FAFAFA] p-4 sm:p-5">
                    <p className="text-base font-bold sm:text-lg">{location.communityManager.name}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray">
                      Hey! I&apos;m {location.communityManager.name.split(" ")[0]}, your community manager at STACEY {location.name}. Need anything? Events, questions, maintenance — just reach out. I&apos;m here to make sure you feel at home!
                    </p>
                  </div>
                  <a
                    href={`mailto:${location.communityManager.email}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-black transition-all duration-200 hover:opacity-60"
                  >
                    Say hello to {location.communityManager.name.split(" ")[0]} <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
            </FadeIn>

            {/* Further Information */}
            <FadeIn>
            <div className="mt-16">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Further <span className="italic font-light">information</span>
              </h2>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-[5px] bg-[#FAFAFA] p-5">
                  <p className="text-sm font-bold">Check-in</p>
                  <p className="mt-1 text-sm text-gray">From 4:00 PM</p>
                </div>
                <div className="rounded-[5px] bg-[#FAFAFA] p-5">
                  <p className="text-sm font-bold">Check-out</p>
                  <p className="mt-1 text-sm text-gray">Until 11:00 AM</p>
                </div>
                <div className="rounded-[5px] bg-[#FAFAFA] p-5">
                  <p className="text-sm font-bold">Minimum stay</p>
                  <p className="mt-1 text-sm text-gray">
                    {location.stayType === "SHORT" ? "5 days" : "3 months"}
                  </p>
                </div>
                <div className="rounded-[5px] bg-[#FAFAFA] p-5">
                  <p className="text-sm font-bold">Roommates</p>
                  <p className="mt-1 text-sm text-gray">{location.roomiesPerApartment} per apartment</p>
                </div>
                <div className="rounded-[5px] bg-[#FAFAFA] p-5">
                  <p className="text-sm font-bold">Cancellation</p>
                  <p className="mt-1 text-sm text-gray">
                    {location.stayType === "SHORT" ? "Flexible cancellation policy" : "3 months notice"}
                  </p>
                </div>
                <div className="rounded-[5px] bg-[#FAFAFA] p-5">
                  <p className="text-sm font-bold">Note</p>
                  <p className="mt-1 text-sm text-gray">
                    Photos are representative. Your actual room and room size may vary slightly.
                  </p>
                </div>
              </div>
            </div>
            </FadeIn>

          </div>{/* end LEFT COLUMN */}

          {/* ── RIGHT COLUMN — Sticky Booking Widget (1/3) ── */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-3">
              <BookingCardContent {...bookingProps} variant="desktop" />
              <a
                href={`mailto:${location.communityManager.email}`}
                className="group flex items-center gap-4 rounded-[5px] bg-black p-5 transition-all duration-200 hover:opacity-90"
              >
                <div className="relative h-20 w-20 flex-shrink-0">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full">
                    <Image
                      src={location.communityManager.image}
                      alt={location.communityManager.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-black">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                  </span>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{location.communityManager.name.split(" ")[0]}</p>
                  <p className="text-xs text-white/50">Community Manager</p>
                  <p className="mt-1 text-xs font-semibold text-pink">Say hello <span className="inline-block transition-transform group-hover:translate-x-1">→</span></p>
                </div>
              </a>
            </div>
          </div>

        </div>{/* end GRID */}
      </div>

      {/* ── NEARBY LOCATIONS ── */}
      {nearby.length > 0 && (
        <section className="bg-[#FAFAFA] py-16">
          <FadeIn>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Nearby <span className="italic font-light">locations</span>
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-gray">
              <ArrowRight size={14} className="text-pink" />
              As a STACEY member you can transfer between our locations.
            </p>
            <div className="mt-8 flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {nearby.map((loc) => {
                const locCity = loc.city === "hamburg" ? "Hamburg" : loc.city === "berlin" ? "Berlin" : "Vallendar";
                return (
                  <Link
                    key={loc.slug}
                    href={`/locations/${loc.slug}`}
                    className="group relative w-[75vw] flex-shrink-0 snap-start overflow-hidden rounded-[5px] sm:w-[280px]"
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
                          loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white"
                        }`}>
                          {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">{locCity}</p>
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
              <button
                onClick={() => document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })}
                className="group relative w-[75vw] flex-shrink-0 snap-start overflow-hidden rounded-[5px] bg-black sm:w-[280px] text-left"
              >
                <div className="relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink via-black to-pink opacity-30 transition-opacity duration-500 group-hover:opacity-50" style={{ backgroundSize: "200% 200%", animation: "gradientShift 5s ease infinite" }} />

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

                  <div className="relative z-10 text-center px-6">
                    <p className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                      FIND<br />YOUR<br />ROOM
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-white px-6 py-3 text-sm font-bold text-black shadow-xl transition-transform duration-300 group-hover:scale-110">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          </FadeIn>
        </section>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 text-white/70 hover:text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={28} />
          </button>

          <div className="flex flex-1 items-center justify-center p-4">
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev! - 1 + lightboxImages.length) % lightboxImages.length);
              }}
            >
              <ChevronLeft size={24} />
            </button>
            <div
              className="flex h-[65vh] w-full max-w-4xl items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`${location.name} ${lightboxIndex + 1}`}
                className="max-h-full max-w-full rounded-[5px] object-contain"
              />
            </div>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev! + 1) % lightboxImages.length);
              }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div
            className="hidden gap-2 overflow-x-auto px-4 py-4 sm:flex sm:justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{ scrollbarWidth: "none" }}
          >
            {lightboxImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-[3px] transition-all ${
                  i === lightboxIndex
                    ? "ring-2 ring-white opacity-100"
                    : "opacity-40 hover:opacity-70"
                }`}
              >
                <Image
                  src={img}
                  alt={`${location.name} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </button>
            ))}
          </div>

          <div className="pb-4 text-center text-sm text-white/50 sm:hidden">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        </div>
      )}

      {/* ── CALENDAR MODAL (Short Stay) ── */}
      {isShort && calendarOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCalendarOpen(false)} />
          <div className="relative max-w-lg w-[min(95vw,512px)] rounded-[5px] bg-white p-5 shadow-2xl text-left">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Short Stay · STACEY {location.name}</p>
                <p className="text-[11px] text-black/50">
                  {persons === 2 ? "2 persons · couple-friendly rooms" : "1 person"} · from &euro;{location.priceFrom}/mo
                </p>
              </div>
              <button onClick={() => { setCheckIn(""); setCheckOut(""); }} className="text-xs text-black/40 transition-all duration-200 hover:opacity-60">
                Clear dates
              </button>
            </div>

            {/* Persons toggle */}
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-medium text-black/50">Persons</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPersons(1)}
                  className={`flex-1 rounded-[5px] py-2 text-xs font-bold transition-all duration-200 ${
                    persons === 1 ? "bg-black text-white hover:opacity-80" : "border border-[#E5E5E5] text-gray hover:bg-[#FAFAFA]"
                  }`}
                >
                  1 person
                </button>
                <button
                  onClick={() => setPersons(2)}
                  className={`flex-1 rounded-[5px] py-2 text-xs font-bold transition-all duration-200 ${
                    persons === 2 ? "bg-black text-white hover:opacity-80" : "border border-[#E5E5E5] text-gray hover:bg-[#FAFAFA]"
                  }`}
                >
                  2 persons
                </button>
              </div>
            </div>

            <p className="mb-2 text-xs font-medium text-black/50">
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
                  <span className="font-bold text-black">{nights} nights</span>
                </div>
                <button
                  onClick={() => { setCalendarOpen(false); document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="mt-3 block w-full rounded-[5px] bg-black py-3 text-center text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
                >
                  Search available rooms
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
