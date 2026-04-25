"use client";

import { useMemo, useRef, useState, useEffect } from "react";
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

// Locations grouped + ordered for the side-panel list. Hamburg first
// (most homes), Berlin, Vallendar. Numbering follows this order so the
// markers and list cards line up at a glance.
const ORDERED_LOCATIONS = CITY_ORDER.flatMap((c) =>
  locations.filter((l) => l.city === c),
);

export default function MapSection() {
  const [city, setCity] = useState<CityFilter>("all");
  const [active, setActive] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = useMemo(
    () => (city === "all" ? ORDERED_LOCATIONS : ORDERED_LOCATIONS.filter((l) => l.city === city)),
    [city],
  );

  // Group filtered list by city for the sticky-header sections in the
  // side panel. With city filter set we only have one group, but the
  // markup stays unified.
  const grouped = useMemo(() => {
    return CITY_ORDER.filter((c) => filtered.some((l) => l.city === c)).map((c) => ({
      city: c,
      locs: filtered.filter((l) => l.city === c),
    }));
  }, [filtered]);

  // Auto-scroll the list to the active item when the marker is hovered.
  useEffect(() => {
    if (!active) return;
    itemRefs.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active]);

  return (
    <section className="bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Editorial header — subtitle morphs to the active city */}
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            8 homes · 3 cities
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Find us in{" "}
            <span className="italic font-light">
              {city === "all" ? "Hamburg, Berlin, Vallendar" : CITY_LABELS[city]}
            </span>
            .
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray sm:text-base">
            Pick your city, your neighbourhood, your home.
          </p>
        </div>

        {/* City tabs — sit close under the header so they read as
            part of the same heading block rather than a detached row. */}
        <div className="mb-6 flex justify-center sm:mb-8">
          <div className="inline-flex gap-1 rounded-[5px] border border-black/10 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setCity("all")}
              className={clsx(
                "rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors",
                city === "all" ? "bg-black text-white" : "text-black/70 hover:bg-[#F5F5F5]",
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
                  city === c ? "bg-black text-white" : "text-black/70 hover:bg-[#F5F5F5]",
                )}
              >
                {CITY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column: side-panel list + map. Mobile shows map FIRST
            (the visual hook), then the list scrolls in below. Desktop:
            list left (340px — narrower since numbers are gone), map
            right. */}
        <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:gap-6">
          {/* Side-panel — Mobile renders the carousel OVERLAID on the
              map (Airbnb-style), see below. This column only renders
              the desktop sticky-header list. */}
          <div className="order-2 hidden min-w-0 lg:order-1 lg:block">
            <div className="relative max-h-[600px] overflow-y-auto pr-1 lg:max-h-[600px]">
              {grouped.map((group) => (
                <div key={group.city} className="mb-3">
                  {city === "all" && (
                    <p className="sticky top-0 z-10 -mx-1 mb-2 bg-[#FAFAFA] px-1 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-pink shadow-[0_8px_8px_-8px_rgba(0,0,0,0.06)]">
                      {CITY_LABELS[group.city]} · {group.locs.length}{" "}
                      {group.locs.length === 1 ? "home" : "homes"}
                    </p>
                  )}
                  <div className="space-y-2">
                    {group.locs.map((loc) => {
                      const isActive = active === loc.slug;
                      const isShort = loc.stayType === "SHORT";
                      return (
                        <div
                          key={loc.slug}
                          ref={(el) => {
                            itemRefs.current[loc.slug] = el;
                          }}
                        >
                          <Link
                            href={`/locations/${loc.slug}`}
                            onMouseEnter={() => setActive(loc.slug)}
                            onMouseLeave={() => setActive(null)}
                            className={clsx(
                              "flex w-full items-center gap-3 rounded-[5px] bg-white p-2.5 text-left shadow-sm ring-1 transition-all",
                              isActive
                                ? isShort
                                  ? "ring-black/60 shadow-md"
                                  : "ring-pink/60 shadow-md"
                                : isShort
                                  ? "ring-black/5 hover:ring-black/30"
                                  : "ring-black/5 hover:ring-pink/30",
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
                              <p className="truncate text-sm font-bold text-black">
                                {loc.name}
                              </p>
                              <p className="truncate text-[11px] text-gray">
                                from €{loc.priceFrom}
                                {loc.stayType === "SHORT" ? "/night" : "/mo"}
                              </p>
                            </div>
                            <span
                              className={clsx(
                                "flex-shrink-0 rounded-[5px] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
                                loc.stayType === "SHORT"
                                  ? "bg-black text-white"
                                  : "bg-pink text-white",
                              )}
                            >
                              {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                            </span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative">
              <LocationMap
                cityFilter={city}
                activeSlug={active}
                onSelect={setActive}
                markerVariant="expand"
              />
              {/* Mobile: cards float over the map's bottom edge,
                  Airbnb/Google-Maps style. 5px inset from the map
                  borders, scroll-snap one card at a time with a peek
                  of the next. lg+ hides this since the side-panel
                  list takes over. */}
              <div className="pointer-events-none absolute inset-x-[5px] bottom-[5px] lg:hidden">
                <div
                  className="pointer-events-auto flex gap-2 overflow-x-auto snap-x snap-mandatory"
                  style={{ scrollbarWidth: "none" }}
                >
                  {filtered.map((loc) => {
                    const isActive = active === loc.slug;
                    const isShort = loc.stayType === "SHORT";
                    return (
                      <div
                        key={loc.slug}
                        ref={(el) => {
                          itemRefs.current[loc.slug] = el;
                        }}
                        className="w-full flex-shrink-0 snap-start"
                      >
                        <Link
                          href={`/locations/${loc.slug}`}
                          onClick={() => setActive(loc.slug)}
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
                            <p className="truncate text-[13px] font-bold leading-tight text-black">
                              {loc.name}
                            </p>
                            <p className="truncate text-[11px] leading-tight text-gray">
                              from €{loc.priceFrom}
                              {loc.stayType === "SHORT" ? "/night" : "/mo"}
                            </p>
                          </div>
                          <span
                            className={clsx(
                              "flex-shrink-0 rounded-[5px] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]",
                              loc.stayType === "SHORT"
                                ? "bg-black text-white"
                                : "bg-pink text-white",
                            )}
                          >
                            {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                          </span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
