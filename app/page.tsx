"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import type { StayType } from "@/lib/data";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FadeIn from "@/components/ui/FadeIn";
import SearchFields from "@/components/move-in/SearchFields";
import FeaturesSection from "@/components/home/FeaturesSection";
import VideoSection from "@/components/home/VideoSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import AboutSection from "@/components/home/AboutSection";
import dynamic from "next/dynamic";

const LocationMap = dynamic(() => import("@/components/ui/LocationMap"), { ssr: false });
import { locations, formatMoveInLabel } from "@/lib/data";
import { expandMoveInDates } from "@/lib/availability";


export default function HomePage() {
  const router = useRouter();

  // Filter state for the hero SearchFields. On submit we router.push to
  // /move-in with these as query params — the homepage never shows results
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

      {/* ── HERO — brand headline + progressive SearchFields ──────── */}
      <section className="relative flex min-h-[700px] items-center justify-center overflow-hidden pb-36 pt-28 sm:pt-32">
        <Image
          src="/images/website-hero.webp"
          alt="STACEY Coliving"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

        <div className="relative z-30 w-full max-w-md px-5 text-center sm:px-6">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            OUR MEMBERS CALL US <span className="italic font-light">HOME.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          >
            <SearchFields
              stayType={stayType} onStayType={setStayType}
              persons={persons} onPersons={setPersons}
              city={city} onCity={setCity}
              checkIn={checkIn} checkOut={checkOut} onCalendarSelect={handleCalendarSelect}
              moveInDate={moveInDate} onMoveInDate={setMoveInDate}
              moveInOptions={moveInOptions} loadingDates={loadingDates}
              nightCount={nightCount} tooShort={tooShort}
              variant="full"
            />

            <AnimatePresence>
              {canSubmit && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-10"
                >
                  <button
                    onClick={handleSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[5px] bg-white px-10 py-4 text-base font-bold text-black transition-all duration-200 hover:opacity-80 sm:text-lg"
                  >
                    Show available rooms <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* ── LOCATIONS ─────────────────────────── */}
      <section className="bg-white py-12 sm:py-16 md:py-20">
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

                  {/* Mobile-only pagination dots — clicks scroll to that card */}
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
