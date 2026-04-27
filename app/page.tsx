"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import type { StayType } from "@/lib/data";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FadeIn from "@/components/ui/FadeIn";
import HeroHeadline from "@/components/home/HeroHeadline";
import SearchFields from "@/components/move-in/SearchFields";
import FeaturesSection from "@/components/home/FeaturesSection";
import VideoSection from "@/components/home/VideoSection";
import FAQSection from "@/components/home/FAQSection";
import AboutSection from "@/components/home/AboutSection";
import PullQuoteSection from "@/components/home/PullQuoteSection";
import FinalCtaSection from "@/components/home/FinalCtaSection";
import MapSection from "@/components/home/MapSection";
import { locations, formatMoveInLabel } from "@/lib/data";
import { expandMoveInDates } from "@/lib/availability";

// Faces hand-picked for the hero strip, frontal, well-lit, work at
// 40px. These five can also appear on location cards (a member living
// somewhere AND showing up in the hero "+ 295 more" intro is logical
//, they really do live in one of these homes). The constraint that
// matters is that no member appears in two LOCATIONS at once.
const HERO_AVATARS: readonly string[] = [
  "/images/members/member-2.jpeg",
  "/images/members/member-3.jpeg",
  "/images/members/member-7.jpeg",
  "/images/members/member-16.jpeg",
  "/images/members/member-19.jpeg",
];

// Full pool of 26 member shots for the per-card "X new residents this
// month" mini-avatars. 8 locations × 3 unique faces = 24 needed → 2
// spare. Interview thumbnails stay out (those are interview subjects,
// rendered elsewhere on the site).
const AVATAR_POOL: readonly string[] = [
  ...Array.from({ length: 25 }, (_, i) => `/images/members/member-${i + 1}.jpeg`),
  "/images/members/member-26.png",
];

// Deterministically shuffle the pool ONCE per build so the assignment
// is stable across re-renders / HMR, but doesn't follow the file-naming
// order (which would cluster sequentially-named photos onto the same
// card).
function deterministicShuffle<T>(pool: readonly T[], seed: number): T[] {
  const arr = [...pool];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build the global "this slug → these N faces" map. Each location gets
// a CONSECUTIVE non-overlapping slice of the shuffled pool, so the
// same person never appears under two homes. Falls back to wrapping if
// we ever exceed the pool size (won't happen with 26 photos / 24 slots,
// but defensive).
const AVATARS_PER_LOCATION = 3;
const AVATAR_ASSIGNMENT: Record<string, readonly string[]> = (() => {
  const shuffled = deterministicShuffle(AVATAR_POOL, 1234567);
  const sortedSlugs = locations.map((l) => l.slug).sort();
  const map: Record<string, string[]> = {};
  let cursor = 0;
  for (const slug of sortedSlugs) {
    const slice: string[] = [];
    for (let i = 0; i < AVATARS_PER_LOCATION; i++) {
      slice.push(shuffled[cursor % shuffled.length]);
      cursor++;
    }
    map[slug] = slice;
  }
  return map;
})();

function avatarsForLocation(slug: string, count: number): string[] {
  if (count <= 0) return [];
  return (AVATAR_ASSIGNMENT[slug] ?? []).slice(0, Math.min(count, AVATARS_PER_LOCATION));
}


export default function HomePage() {
  const router = useRouter();

  // Filter state for the hero SearchFields. On submit we router.push to
  // /move-in with these as query params, the homepage never shows results
  // itself, that's entirely /move-in's job.
  const [stayType, setStayType] = useState<StayType | null>(null);
  const [persons, setPersons] = useState<1 | 2>(1);
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [moveInDate, setMoveInDate] = useState<string | null>(null);
  const [moveInOptions, setMoveInOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Hydrate filter state from URL on mount, supports deep-links, refresh,
  // and browser-back from /move-in back to /.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URL(window.location.href).searchParams;
    const urlStayType = p.get("stayType");
    if (urlStayType === "SHORT" || urlStayType === "LONG") setStayType(urlStayType);
    const urlPersons = p.get("persons");
    if (urlPersons === "1" || urlPersons === "2") setPersons(Number(urlPersons) as 1 | 2);
    const urlCheckIn = p.get("checkIn");
    const urlCheckOut = p.get("checkOut");
    const urlCity = p.get("city");
    const urlMoveIn = p.get("moveIn");
    if (urlCheckIn) setCheckIn(urlCheckIn);
    if (urlCheckOut) setCheckOut(urlCheckOut);
    if (urlCity) setCity(urlCity);
    if (urlMoveIn) setMoveInDate(urlMoveIn);
  }, []);

  // Mirror filter state back into the URL as the user fills fields. Uses
  // history.replaceState directly so there's no Next.js re-render and no
  // flash, just a quiet URL rewrite. Shareable + refresh-safe.
  //
  // IMPORTANT: skip the initial mount so the mirror doesn't strip the
  // inbound query params before the hydrate effect has read them.
  const mirrorMountedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mirrorMountedRef.current) {
      mirrorMountedRef.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (stayType) params.set("stayType", stayType);
    if (persons !== 1) params.set("persons", String(persons));
    if (stayType === "SHORT") {
      if (checkIn) params.set("checkIn", checkIn);
      if (checkOut) params.set("checkOut", checkOut);
    }
    if (stayType === "LONG") {
      if (city) params.set("city", city);
      if (moveInDate) params.set("moveIn", moveInDate);
    }
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [stayType, persons, city, checkIn, checkOut, moveInDate]);

  // Fetch LONG-stay move-in date options when city+persons change. Needed
  // so SearchFields can render the move-in-date dropdown with real options.
  useEffect(() => {
    if (stayType !== "LONG" || !city || !persons) return;
    setLoadingDates(true);
    setMoveInOptions([]);
    setMoveInDate(null);

    const locs = locations.filter((l) => l.stayType === "LONG" && l.city === city);
    const fetches = locs.map((loc) =>
      fetch(`/api/availability?location=${loc.slug}&persons=${persons}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => (res?.ok ? res.data : null))
        .catch(() => null),
    );

    Promise.all(fetches).then((results) => {
      const earliestDates: string[] = [];
      for (const data of results) {
        if (!data?.categories) continue;
        for (const cat of data.categories) {
          if (cat.moveInDates) earliestDates.push(...cat.moveInDates);
        }
      }
      setMoveInOptions(
        expandMoveInDates(earliestDates).map((d) => ({
          value: d,
          label: formatMoveInLabel(d),
        })),
      );
      setLoadingDates(false);
    });
  }, [stayType, city, persons]);

  // Track horizontal scroll position of locations carousel → highlight active dot
  useEffect(() => {
    const el = document.getElementById("locations-scroll");
    if (!el) return;
    const onScroll = () => {
      // Each card is w-[85vw] on mobile, plus gap-4 (16px).
      // Find the card whose left edge is closest to the scroll offset.
      const cards = el.querySelectorAll<HTMLElement>(":scope > a");
      if (!cards.length) return;
      const scrollLeft = el.scrollLeft;
      let closestIdx = 0;
      let minDelta = Infinity;
      cards.forEach((card, i) => {
        const delta = Math.abs(card.offsetLeft - scrollLeft);
        if (delta < minDelta) {
          minDelta = delta;
          closestIdx = i;
        }
      });
      setCarouselIndex(closestIdx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Nights + tooShort for the SHORT-stay calendar helper.
  const nightCount = checkIn && checkOut
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  const tooShort = nightCount > 0 && nightCount < 5;

  const orderedLocations = [
    locations.find((l) => l.slug === "mitte")!,
    locations.find((l) => l.slug === "muehlenkamp")!,
    ...locations.filter((l) => l.slug !== "mitte" && l.slug !== "muehlenkamp"),
  ];

  // Per-location card stats (available rooms · new residents this month
  // · next-availability date for fully booked homes). Lives in /api/
  // locations/stats which combines DB query (LONG) and apaleo (SHORT),
  // edge-cached 10 min. Failure is non-fatal, cards just hide the
  // social-proof / availability rows when we don't have the data.
  type LocationStat = {
    available: number;
    newResidents: number;
    nextAvailable: string | null;
  };
  const [locationStats, setLocationStats] = useState<Record<string, LocationStat>>({});
  useEffect(() => {
    let cancelled = false;
    fetch("/api/locations/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!cancelled && res?.ok) setLocationStats(res.data ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Submit = router.push to /move-in with all filters as query params.
  const canSubmit =
    (stayType === "SHORT" && checkIn && checkOut && !tooShort) ||
    (stayType === "LONG" && city && moveInDate);

  const handleSubmit = () => {
    if (!canSubmit || !stayType) return;
    const params = new URLSearchParams({
      stayType,
      persons: String(persons),
    });
    if (stayType === "SHORT") {
      if (checkIn) params.set("checkIn", checkIn);
      if (checkOut) params.set("checkOut", checkOut);
    } else {
      if (city) params.set("city", city);
      if (moveInDate) params.set("moveIn", moveInDate);
    }
    router.push(`/move-in?${params.toString()}`);
  };

  return (
    <>
      <Navbar transparent />

      {/* ── HERO, brand headline + progressive SearchFields.
           min-h-[82vh] (was 88vh) leaves more of the next section
           visible on first load and doesn't dominate big screens.
           600px floor prevents squashing on very short laptops.
           Growing content (expanded SearchFields) pushes the hero
           taller naturally, no fixed height clash. */}
      <section className="relative flex min-h-[max(82vh,600px)] items-center justify-center overflow-hidden pb-36 pt-28 sm:pt-32">
        <Image
          src="/images/website-hero.webp"
          alt="STACEY Coliving"
          fill
          className="hero-ken-burns object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/55" />

        <div className="relative z-30 w-full px-5 text-center sm:px-6">
          {/* Cinematic word-by-word reveal, brand moment, fully
              reduced-motion compliant. */}
          <HeroHeadline />

          {/* Sub-headline, one warm line that turns the claim into a
              full thought and sets the brand voice before the booking
              flow starts. */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
            className="mx-auto mt-5 max-w-xl text-base font-medium leading-snug text-white/80 sm:mt-6 sm:text-lg lg:text-xl"
          >
            Rooms come furnished. Friends come included.
          </motion.p>

          {/* Member portraits, five real STACEY faces (interview thumbs
              + community photos as launch placeholders) overlapping in
              a strip + "+ X more members" tag. Human-first signal sits
              above the booking flow on purpose: see the people, then
              pick your stay. Stacks vertically on mobile so neither the
              avatars nor the count get squeezed. */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.35, ease: "easeOut" }}
            className="mx-auto mt-5 flex flex-col items-center justify-center gap-2 sm:mt-8 sm:flex-row sm:gap-3"
          >
            <div className="flex -space-x-2">
              {HERO_AVATARS.map((src, i) => (
                <span
                  key={i}
                  className="relative inline-block h-8 w-8 overflow-hidden rounded-full ring-2 ring-white/90 shadow-md sm:h-10 sm:w-10"
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="48px" />
                </span>
              ))}
            </div>
            <span className="text-xs font-semibold text-white/90 sm:text-sm">
              + 295 more members
            </span>
          </motion.div>

          {/* SearchFields stays inside a narrow column so fields don't
              sprawl on desktop. Fades in last so the entrance reads as
              headline → voice → people → action. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.55, ease: "easeOut" }}
            className="mx-auto max-w-xl lg:max-w-2xl"
          >
            <SearchFields
              stayType={stayType} onStayType={setStayType}
              persons={persons} onPersons={setPersons}
              city={city} onCity={setCity}
              checkIn={checkIn} checkOut={checkOut} onCalendarSelect={handleCalendarSelect}
              onCalendarClear={() => { setCheckIn(null); setCheckOut(null); }}
              moveInDate={moveInDate} onMoveInDate={setMoveInDate}
              moveInOptions={moveInOptions} loadingDates={loadingDates}
              nightCount={nightCount} tooShort={tooShort}
              variant="full"
              onSubmit={handleSubmit}
            />
          </motion.div>
        </div>

        {/* Gradient fade into white, matches the Locations section bg
            below so the hero photo dissolves cleanly into the page. */}
        <div className="absolute bottom-0 left-0 right-0 z-10 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── LOCATIONS, low pt on every breakpoint so card tops peek
           under the 82vh hero (mobile + desktop). Bottom padding scales
           normally for rhythm with the next section. White section bg,
           cards earn definition through ring + medium shadow chrome. */}
      <section className="bg-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8">
        {/* No FadeIn here, this section peeks under the hero on first
            paint; triggering a scroll-in animation delays the cards
            and defeats the whole peek-to-tease pattern. */}
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
                      const s = locationStats[loc.slug];
                      // Up to 3 mini-avatars per card, deterministically
                      // sampled from a 6-face pool so adjacent cards
                      // don't show the same trio (would read as fake).
                      const avatarsToShow = s
                        ? Math.min(3, Math.max(0, s.newResidents))
                        : 0;
                      const avatarSrc = avatarsForLocation(loc.slug, avatarsToShow);
                      return (
                        <Link
                          key={loc.slug}
                          href={href}
                          className="group relative w-[85vw] flex-shrink-0 snap-start overflow-hidden rounded-[5px] bg-white ring-1 ring-black/8 shadow-[0_6px_22px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:ring-black/15 hover:shadow-[0_16px_36px_rgba(0,0,0,0.12)] sm:w-[340px]"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <Image
                              src={loc.images[0]}
                              alt={loc.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="340px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                            {/* SHORT/LONG badge, top-left anchor */}
                            <div className="absolute left-3 top-3">
                              <span className={`rounded-[5px] px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                                loc.stayType === "SHORT"
                                  ? "bg-black text-white"
                                  : "bg-pink text-white"
                              }`}>
                                {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                              </span>
                            </div>

                            {/* Price chip, top-right, frosted glass.
                                Flips to solid black on card hover for a
                                clearer "click me" affordance. */}
                            <div className="absolute right-3 top-3">
                              <span className="rounded-[5px] bg-white/90 px-2.5 py-1 text-xs font-bold text-black shadow-sm backdrop-blur-sm transition-colors duration-300 group-hover:bg-black group-hover:text-white">
                                from &euro;{loc.priceFrom}{loc.stayType === "SHORT" ? "/night" : "/mo"}
                              </span>
                            </div>

                            {/* Bottom story block: city → name →
                                avatars (social proof) → live availability */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                                {loc.city === "hamburg" ? "Hamburg" : loc.city === "berlin" ? "Berlin" : "Vallendar"}
                              </p>
                              <h3 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl">
                                {loc.name}
                              </h3>

                              {s && s.newResidents > 0 && avatarsToShow > 0 && (
                                <div className="mt-3 flex items-center gap-2">
                                  <div className="flex -space-x-1.5">
                                    {avatarSrc.map((src, i) => (
                                      <span
                                        key={i}
                                        className="relative inline-block h-7 w-7 overflow-hidden rounded-full ring-2 ring-white/90"
                                      >
                                        <Image src={src} alt="" fill className="object-cover" sizes="28px" />
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-xs font-medium text-white/85">
                                    {s.newResidents} new {s.newResidents === 1 ? "resident" : "residents"} this month
                                  </span>
                                </div>
                              )}

                              {s && s.available > 0 && (
                                <div className={(s.newResidents > 0 ? "mt-2" : "mt-3") + " flex items-center gap-1.5"}>
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-70" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
                                  </span>
                                  <span className="text-xs font-semibold text-white">
                                    {s.available} {s.available === 1 ? "room" : "rooms"} available now
                                  </span>
                                </div>
                              )}

                              {s && s.available === 0 && s.nextAvailable && (
                                <div className="mt-3 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                                  <span className="text-xs font-medium text-white/80">
                                    Next available {new Date(s.nextAvailable).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </span>
                                </div>
                              )}
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

                  {/* Mobile-only pagination dots, clicks scroll to that card */}
                  <div className="mt-3 flex items-center justify-center gap-1.5 sm:hidden">
                    {Array.from({ length: orderedLocations.length + 1 }).map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Go to card ${i + 1}`}
                        onClick={() => {
                          const el = document.getElementById("locations-scroll");
                          const card = el?.querySelectorAll<HTMLElement>(":scope > a")[i];
                          if (el && card) el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === carouselIndex ? "w-6 bg-black" : "w-1.5 bg-black/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
            ))()}
        </div>
      </section>

      {/* Customer-question sequence drives the order:
           Hero        → "what is this?"
           Locations   → "what's available?"
           Video       → "what's the vibe?"        (emotional palate-cleanser)
           Map         → "is one near me?"          (info-dense, benefits from emotional warm-up)
           Receipts    → "is it worth it?"
           FAQ         → "what about [my objection]?"
           About       → "who's behind it?"
           The booking-process explainer that used to sit between Map
           and Receipts moved to /move-in (JourneyStrip) where users
           actually need it. */}

      {/* VIDEO, placed between Locations and Map as a vibe-check.
           Locations cards are visually dense; the cinematic Video
           gives the eye a break before the equally-dense Map. */}
      <VideoSection />

      {/* MAP, interactive geographic discovery, lands after the
           emotional warm-up so the "is there one in my neighbourhood?"
           question reads in colour, not as a cold lookup. */}
      <MapSection />

      {/* WHAT'S INCLUDED, atmospheric inclusions grid (no math comparison
           anymore, that was Hamburg/LONG-only and rechtlich heikel). */}
      <FeaturesSection />

      {/* PULL-QUOTE, brand pause between two content-heavy sections.
           Single member quote on full-bleed black, decorative pink
           quote-marks. Third black anchor on the page (Video, here,
           Final-CTA), breaks the run of lower-page lese-sektionen. */}
      <PullQuoteSection />

      {/* FAQ, answers the five most common conversion-blocking
           questions (notice period, what's included, couples, pets,
           why cheaper). Sits right after What's-Included so it catches
           remaining objections before the trust + social-proof beats
           build the page toward the conversion ask. */}
      <FAQSection />

      {/* ABOUT, who is behind this, told as a team-story split (16:9
           team photo + founder/team copy). Lands after FAQ so trust
           builds on a reader whose objections are already cleared. */}
      <AboutSection />

      {/* FINAL-CTA, gives the brand claim its own stage on full-bleed
           black, with the three member-interview thumbs sitting under
           the "OUR MEMBERS CALL US HOME" claim as direct visual proof
           before the Find-your-room handoff. */}
      <FinalCtaSection />

      <Footer />
    </>
  );
}
