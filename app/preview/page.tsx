"use client";

// Dev-only preview — Map marker variants A (photo) vs B (expand on
// hover). Each is a full MapSection-style layout so we can compare
// them in real Mapbox context. Open /preview manually.

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

function Label({ n, title, desc }: { n: string; title: string; desc?: string }) {
  return (
    <div className="bg-black px-6 py-4">
      <div className="mx-auto max-w-7xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Variant {n}
        </p>
        <p className="mt-1 text-base font-extrabold text-white sm:text-lg">{title}</p>
        {desc && <p className="mt-1 text-xs text-white/60">{desc}</p>}
      </div>
    </div>
  );
}

function MapStage({ markerVariant }: { markerVariant: "photo" | "expand" }) {
  const [city, setCity] = useState<CityFilter>("all");
  const [active, setActive] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = useMemo(
    () => (city === "all" ? ORDERED_LOCATIONS : ORDERED_LOCATIONS.filter((l) => l.city === city)),
    [city],
  );

  const grouped = useMemo(() => {
    return CITY_ORDER.filter((c) => filtered.some((l) => l.city === c)).map((c) => ({
      city: c,
      locs: filtered.filter((l) => l.city === c),
    }));
  }, [filtered]);

  useEffect(() => {
    if (!active) return;
    itemRefs.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active]);

  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
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
        </div>
        <div className="mb-5 flex justify-center">
          <div className="inline-flex gap-1 rounded-[5px] border border-black/10 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setCity("all")}
              className={clsx(
                "rounded-[3px] px-3 py-1.5 text-xs font-semibold",
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
                  "rounded-[3px] px-3 py-1.5 text-xs font-semibold",
                  city === c ? "bg-black text-white" : "text-black/70 hover:bg-[#F5F5F5]",
                )}
              >
                {CITY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[400px_1fr] lg:gap-6">
          <div className="relative max-h-[600px] overflow-y-auto pr-1">
            {grouped.map((group) => (
              <div key={group.city} className="mb-3">
                <p className="sticky top-0 z-10 -mx-1 mb-2 bg-[#FAFAFA] px-1 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-pink shadow-[0_8px_8px_-8px_rgba(0,0,0,0.06)]">
                  {CITY_LABELS[group.city]} · {group.locs.length}{" "}
                  {group.locs.length === 1 ? "home" : "homes"}
                </p>
                <div className="space-y-2">
                  {group.locs.map((loc) => {
                    const isActive = active === loc.slug;
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
                              ? "ring-pink/60 shadow-md"
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
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray">
                              {CITY_LABELS[loc.city]}
                            </p>
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
                              "flex-shrink-0 rounded-[5px] px-1.5 py-0.5 text-[9px] font-bold",
                              loc.stayType === "SHORT"
                                ? "bg-black text-white"
                                : "bg-pink text-white",
                            )}
                          >
                            {loc.stayType === "SHORT" ? "S" : "L"}
                          </span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <LocationMap
            cityFilter={city}
            activeSlug={active}
            onSelect={setActive}
            markerVariant={markerVariant}
          />
        </div>
      </div>
    </section>
  );
}

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Map markers — <span className="italic font-light">A vs B</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Hover the list cards or the markers to test the sync. Click a
          city tab to filter. Click a marker to navigate to the location
          page.
        </p>
      </div>

      <Label
        n="A"
        title="Photo markers — small thumbnail with white border"
        desc="48px rounded-[5px] photo of the location. Active = scale + pink ring + pulse. Cleanest visual identification at a glance."
      />
      <MapStage markerVariant="photo" />

      <Label
        n="B"
        title='Expand-on-hover marker — small "S" pill that grows to photo + name'
        desc="22px photo dot in resting state; on hover/active it expands into a pink pill with photo + location name (Airbnb price-bubble DNA)."
      />
      <MapStage markerVariant="expand" />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">— Pick A or B and we wire it as the new default. —</p>
      </div>
    </main>
  );
}
