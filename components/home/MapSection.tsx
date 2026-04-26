"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { clsx } from "clsx";
import { locations } from "@/lib/data";

const LocationMap = dynamic(() => import("@/components/ui/LocationMap"), { ssr: false });

const CITY_LABELS: Record<string, string> = {
  hamburg: "Hamburg",
  berlin: "Berlin",
  vallendar: "Vallendar",
};

const CITY_ORDER = ["hamburg", "berlin", "vallendar"] as const;
type CityFilter = "all" | (typeof CITY_ORDER)[number];

const ORDERED_LOCATIONS = CITY_ORDER.flatMap((c) =>
  locations.filter((l) => l.city === c),
);

// Discovery section, full-bleed map with a glassmorphic floating left
// rail on desktop (city tabs + scrollable list) and an Airbnb-style
// bottom-sheet card carousel on mobile (swipe ↔ flies map to that
// location). Idle framing centers Hamburg, since 6 of 8 homes live
// there, but Berlin and Vallendar markers stay active and undimmed.
export default function MapSection() {
  const [city, setCity] = useState<CityFilter>("all");
  const [active, setActive] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const programmaticScrollRef = useRef(false);

  const filtered = useMemo(
    () => (city === "all" ? ORDERED_LOCATIONS : ORDERED_LOCATIONS.filter((l) => l.city === city)),
    [city],
  );

  // External active changes (marker tap, list hover) → scroll the
  // matching mobile card to centre. The programmatic flag prevents the
  // scroll-listener feedback loop.
  useEffect(() => {
    if (!active) return;
    const card = cardRefs.current[active];
    if (card && carouselRef.current) {
      programmaticScrollRef.current = true;
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      const t = setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 600);
      return () => clearTimeout(t);
    }
  }, [active]);

  // Mobile carousel swipe → set active to whichever card is closest to
  // the viewport centre. The map flies to that location automatically
  // via LocationMap's activeSlug effect.
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    let raf = 0;
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = carousel.scrollLeft + carousel.clientWidth / 2;
        let bestSlug: string | null = null;
        let bestDist = Infinity;
        for (const [slug, el] of Object.entries(cardRefs.current)) {
          if (!el) continue;
          const cardCenter = el.offsetLeft + el.offsetWidth / 2;
          const d = Math.abs(cardCenter - center);
          if (d < bestDist) {
            bestDist = d;
            bestSlug = slug;
          }
        }
        if (bestSlug) setActive((prev) => (prev === bestSlug ? prev : bestSlug));
      });
    };
    carousel.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      carousel.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [filtered]);

  return (
    <section className="bg-white py-12 sm:py-16">
      {/* Editorial header lives inside the constrained container; the map
          below escapes to full-bleed for cinematic effect. */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[11px] font-bold uppercase text-white">
            8 homes · 3 cities
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Find us in{" "}
            <span className="italic font-light">
              {city === "all" ? "Hamburg, Berlin, Vallendar" : CITY_LABELS[city]}
            </span>
            .
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray sm:text-base">
            {city === "all" &&
              "Hover a marker, scroll the list. Click any home to check live availability."}
            {city === "hamburg" &&
              "Across the most-walkable neighbourhoods: canals, corner cafés, late-night ferment."}
            {city === "berlin" &&
              "Mitte. Two minutes from Museum Island, U2 and U8 at your door."}
            {city === "vallendar" &&
              "Quiet outpost on the Rhine, next door to WHU Otto Beisheim."}
          </p>
        </div>
      </div>

      {/* Full-bleed map with floating overlays (desktop rail + mobile
          bottom carousel + mobile city-tabs pill). overflow-hidden keeps
          the rail's drop-shadow inside this section. */}
      <div className="relative mt-8 overflow-hidden">
        <LocationMap
          cityFilter={city}
          activeSlug={active}
          onSelect={setActive}
          markerVariant="expand"
        />

        {/* Desktop floating rail, glassmorphic city tabs + scrollable
            list of compact location items. Hidden under lg. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-full max-w-[380px] p-6 lg:flex lg:flex-col">
          <div className="pointer-events-auto flex max-h-full flex-col overflow-hidden rounded-[8px] border border-white/40 bg-white/90 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <div className="border-b border-black/10 p-3">
              <CityTabs city={city} setCity={setCity} variant="glass" />
            </div>
            <div className="space-y-2 overflow-y-auto p-3">
              {filtered.map((loc) => {
                const isActive = active === loc.slug;
                const isShort = loc.stayType === "SHORT";
                return (
                  <Link
                    key={loc.slug}
                    href={`/locations/${loc.slug}`}
                    onMouseEnter={() => setActive(loc.slug)}
                    onMouseLeave={() => setActive(null)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-[5px] bg-white p-2.5 text-left ring-1 transition-all",
                      isActive
                        ? isShort
                          ? "ring-black/60 shadow-md"
                          : "ring-pink/60 shadow-md"
                        : "ring-black/5 hover:ring-black/20",
                    )}
                  >
                    <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-[3px]">
                      <Image
                        src={loc.images[0]}
                        alt={loc.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-black">{loc.name}</p>
                      <p className="truncate text-xs text-gray">
                        from €{loc.priceFrom}
                        {loc.stayType === "SHORT" ? "/night" : "/mo"}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        "flex-shrink-0 rounded-[5px] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                        isShort ? "bg-black text-white" : "bg-pink text-white",
                      )}
                    >
                      {isShort ? "SHORT" : "LONG"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile floating city tabs, top-centre on the map. */}
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 lg:hidden">
          <CityTabs city={city} setCity={setCity} variant="glass" />
        </div>

        {/* Mobile bottom-sheet carousel, swipeable. Active card stays in
            sync with the map markers in both directions. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 lg:hidden">
          <div
            ref={carouselRef}
            className="pointer-events-auto flex gap-2 overflow-x-auto px-[10%] pb-1 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {filtered.map((loc) => {
              const isActive = active === loc.slug;
              const isShort = loc.stayType === "SHORT";
              return (
                <div
                  key={loc.slug}
                  ref={(el) => {
                    cardRefs.current[loc.slug] = el;
                  }}
                  className="w-[80%] max-w-[320px] flex-shrink-0 snap-center"
                >
                  <Link
                    href={`/locations/${loc.slug}`}
                    className={clsx(
                      "flex w-full items-center gap-2.5 rounded-[5px] bg-white p-2 text-left shadow-[0_4px_18px_rgba(0,0,0,0.18)] ring-1 transition-all",
                      isActive
                        ? isShort
                          ? "ring-black/60"
                          : "ring-pink/60"
                        : "ring-black/5",
                    )}
                  >
                    <div className="relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-[3px]">
                      <Image
                        src={loc.images[0]}
                        alt={loc.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold leading-tight text-black">
                        {loc.name}
                      </p>
                      <p className="truncate text-xs leading-tight text-gray">
                        from €{loc.priceFrom}
                        {loc.stayType === "SHORT" ? "/night" : "/mo"}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        "flex-shrink-0 rounded-[5px] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider",
                        isShort ? "bg-black text-white" : "bg-pink text-white",
                      )}
                    >
                      {isShort ? "SHORT" : "LONG"}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CityTabs({
  city,
  setCity,
  variant = "default",
}: {
  city: CityFilter;
  setCity: (c: CityFilter) => void;
  variant?: "default" | "glass";
}) {
  return (
    <div
      className={clsx(
        "inline-flex gap-1 rounded-[5px] p-1 shadow-sm",
        variant === "glass"
          ? "border border-white/20 bg-white/85 backdrop-blur-md"
          : "border border-black/10 bg-white",
      )}
    >
      <button
        type="button"
        onClick={() => setCity("all")}
        className={clsx(
          "rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors",
          city === "all" ? "bg-black text-white" : "text-black/70 hover:bg-black/5",
        )}
      >
        All
      </button>
      {CITY_ORDER.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCity(c)}
          className={clsx(
            "rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors",
            city === c ? "bg-black text-white" : "text-black/70 hover:bg-black/5",
          )}
        >
          {CITY_LABELS[c]}
        </button>
      ))}
    </div>
  );
}
