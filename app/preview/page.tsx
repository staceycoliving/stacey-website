"use client";

// Dev-only preview — 6 map section ideas. Some variants are live mocks
// over a fake "map" surface; the real Mapbox integration would replace
// the placeholder for #2, #3, #4. Open /preview manually.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { locations } from "@/lib/data";

const LocationMap = dynamic(() => import("@/components/ui/LocationMap"), { ssr: false });

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

const PinkPulseDot = () => (
  <span className="relative flex h-1.5 w-1.5">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-70" />
    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
  </span>
);

// Faux map surface so we can preview overlays without spinning up Mapbox.
function FauxMap({ height = "h-[480px]", children }: { height?: string; children?: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "relative w-full overflow-hidden rounded-[5px] ring-1 ring-black/5",
        height,
      )}
      style={{
        backgroundImage:
          "linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 30%, #E5E7EB 60%, #D1D5DB 100%)",
      }}
    >
      {/* Faux map "streets" */}
      <svg className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none">
        <defs>
          <pattern id="streets" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M0 40 L80 40 M40 0 L40 80" stroke="#9CA3AF" strokeWidth="1" />
            <path d="M0 0 L80 80" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#streets)" />
      </svg>
      {children}
    </div>
  );
}

// ── Variant 1 — Editorial header upgrade ─────────────────────

function V1_EditorialHeader() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            8 homes · 3 cities
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Find us in <span className="italic font-light">Hamburg, Berlin, Vallendar</span>.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray sm:text-base">
            Pick your city, your neighbourhood, your home.
          </p>
        </div>
        <LocationMap />
      </div>
    </section>
  );
}

// ── Variant 2 — Map + scrolling side-panel ───────────────────

function V2_MapWithSidePanel() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            8 homes · 3 cities
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Find us in <span className="italic font-light">Hamburg, Berlin, Vallendar</span>.
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[400px_1fr] lg:gap-6">
          {/* Side panel — scrollable list. On mobile this falls below the
              map; on desktop it's a fixed-height scroll alongside. */}
          <div className="order-2 lg:order-1">
            <div className="lg:max-h-[560px] lg:overflow-y-auto lg:pr-2 space-y-2">
              {locations.map((loc) => (
                <Link
                  key={loc.slug}
                  href={`/locations/${loc.slug}`}
                  className="group flex items-center gap-3 rounded-[5px] bg-white p-2.5 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md hover:ring-pink/40"
                >
                  <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-[3px]">
                    <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray">
                      {loc.city === "hamburg"
                        ? "Hamburg"
                        : loc.city === "berlin"
                          ? "Berlin"
                          : "Vallendar"}
                    </p>
                    <p className="truncate text-sm font-bold">{loc.name}</p>
                    <p className="truncate text-[11px] text-gray">
                      from €{loc.priceFrom}
                      {loc.stayType === "SHORT" ? "/night" : "/mo"}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "shrink-0 rounded-[5px] px-2 py-0.5 text-[9px] font-bold",
                      loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white",
                    )}
                  >
                    {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          {/* Map column */}
          <div className="order-1 lg:order-2">
            <LocationMap />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-gray">
          Hover/click in the list to highlight a marker. Hover/click a marker to
          scroll the list. (Cross-highlight is a wiring detail — UI shown for
          structure.)
        </p>
      </div>
    </section>
  );
}

// ── Variant 3 — Custom branded markers ───────────────────────

function V3_BrandedMarkers() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            New marker style — STACEY <span className="italic font-light">S</span>
          </h2>
          <p className="mt-2 text-sm text-gray">
            Three states: idle (small black) · active filter (pink with pulse
            ring) · hovered (scaled, shadow).
          </p>
        </div>
        <FauxMap height="h-[420px]">
          {/* Idle marker */}
          <div className="absolute" style={{ left: "20%", top: "30%" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white shadow-lg ring-2 ring-white">
              <span className="text-sm font-black">S</span>
            </span>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray">
              idle
            </p>
          </div>
          {/* Active marker */}
          <div className="absolute" style={{ left: "50%", top: "30%" }}>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-pink text-white shadow-lg ring-2 ring-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-pink opacity-50" />
              <span className="relative text-sm font-black">S</span>
            </span>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-pink">
              active
            </p>
          </div>
          {/* Hovered marker */}
          <div className="absolute" style={{ left: "80%", top: "30%" }}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-2xl ring-4 ring-pink/30">
              <span className="text-base font-black">S</span>
            </span>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray">
              hovered
            </p>
          </div>
        </FauxMap>
      </div>
    </section>
  );
}

// ── Variant 4 — Marker popup as mini-booking-card ────────────

function V4_PopupCard() {
  const loc = locations.find((l) => l.slug === "alster")!;
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            New marker popup — <span className="italic font-light">mini booking card</span>
          </h2>
          <p className="mt-2 text-sm text-gray">
            Click a marker → richer card with badge, live availability, CTA.
            Same DNA as homepage cards.
          </p>
        </div>
        <FauxMap>
          {/* Marker */}
          <div className="absolute" style={{ left: "30%", top: "40%" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink text-white shadow-lg ring-2 ring-white">
              <span className="text-sm font-black">S</span>
            </span>
          </div>
          {/* Popup */}
          <div className="absolute" style={{ left: "32%", top: "44%", width: "280px" }}>
            <div className="overflow-hidden rounded-[5px] bg-white shadow-2xl ring-1 ring-black/5">
              <div className="relative aspect-[3/2] overflow-hidden">
                <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="280px" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                  <span className="rounded-[5px] bg-black px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                    SHORT
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-[5px] bg-pink px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    <PinkPulseDot />2 rooms
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray">
                  Hamburg
                </p>
                <p className="mt-0.5 text-base font-bold">{loc.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    from €{loc.priceFrom}
                    <span className="text-gray">/night</span>
                  </p>
                  <Link
                    href={`/locations/${loc.slug}`}
                    className="inline-flex items-center gap-1 rounded-[5px] bg-black px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-80"
                  >
                    View rooms <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </FauxMap>
      </div>
    </section>
  );
}

// ── Variant 5 — Filter pills as floating dark-glass overlay ──

function V5_FilterPillsOverlay() {
  const [active, setActive] = useState<string | null>(null);
  const cities = [
    { name: "All", slug: null },
    { name: "Hamburg", slug: "hamburg" },
    { name: "Berlin", slug: "berlin" },
    { name: "Vallendar", slug: "vallendar" },
  ];
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Filter pills — <span className="italic font-light">floating overlay</span>
          </h2>
          <p className="mt-2 text-sm text-gray">
            Same dark-glass aesthetic as the navbar. Floats top-left of the
            map, no longer takes a separate row above.
          </p>
        </div>
        <FauxMap>
          <div className="absolute left-3 top-3 flex gap-1 rounded-[5px] bg-black/95 p-1 ring-1 ring-white/15 backdrop-blur-xl">
            {cities.map((c) => (
              <button
                key={c.slug ?? "all"}
                onClick={() => setActive(c.slug)}
                className={clsx(
                  "rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-all",
                  active === c.slug
                    ? "bg-white text-black"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </FauxMap>
      </div>
    </section>
  );
}

// ── Variant 6 — City stats overlay ───────────────────────────

function V6_StatsOverlay() {
  const [stats, setStats] = useState<{ available: number; members: number }>({ available: 12, members: 124 });
  useEffect(() => {
    fetch("/api/locations/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res?.ok) return;
        const hamburg = ["alster", "downtown", "muehlenkamp", "eppendorf", "st-pauli", "eimsbuettel"];
        let avail = 0, mem = 0;
        for (const slug of hamburg) {
          avail += res.data?.[slug]?.available ?? 0;
          mem += res.data?.[slug]?.newResidents ?? 0;
        }
        if (avail || mem) setStats({ available: avail, members: mem });
      })
      .catch(() => {});
  }, []);
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            City stats overlay — <span className="italic font-light">live context</span>
          </h2>
          <p className="mt-2 text-sm text-gray">
            When a city filter is selected, a dark-glass card top-right shows
            live data for that city. Pulls /api/locations/stats.
          </p>
        </div>
        <FauxMap>
          <div className="absolute right-3 top-3 rounded-[5px] bg-black/95 px-4 py-3 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
              Hamburg
            </p>
            <p className="mt-1 text-base font-bold text-white">6 homes</p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-white/70">
              <span className="inline-flex items-center gap-1">
                <PinkPulseDot />
                {stats.available} rooms available
              </span>
              <span className="text-white/30">·</span>
              <span>+ {stats.members} new this month</span>
            </div>
          </div>
        </FauxMap>
      </div>
    </section>
  );
}

// ── Bonus — Combined gallery + map under one section header ──

function VB_CombinedHeader() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Browse our homes
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            8 homes. 3 cities. <span className="italic font-light">One feeling.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray sm:text-base">
            Swipe the gallery or pick from the map.
          </p>
        </div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray">
          Gallery
        </p>
        <div className="mb-6 rounded-[5px] bg-white p-4 ring-1 ring-black/5">
          <p className="text-center text-sm text-gray">
            (existing horizontal cards carousel sits here)
          </p>
        </div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray">
          Map
        </p>
        <LocationMap />
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
          Map section — <span className="italic font-light">six lifts</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Variants 1, 2 and B use the real LocationMap. 3, 4, 5, 6 use a
          faux map surface so we can preview overlays without rewiring
          Mapbox first — those would land on the real map in production.
        </p>
      </div>

      <Label
        n="1"
        title="Editorial header upgrade"
        desc="Eyebrow + bigger italic-keyword headline above the existing map. Easiest visual lift."
      />
      <V1_EditorialHeader />

      <Label
        n="2"
        title="Map + scrolling side-panel (Discovery layout)"
        desc="Two-column on desktop: scrolling location list left, map right. Mobile stacks. Cross-highlight (hover list ↔ marker) wired in production."
      />
      <V2_MapWithSidePanel />

      <Label
        n="3"
        title="Custom branded markers — STACEY S"
        desc="Three states demoed on a faux-map surface: idle, active (pink + pulse), hovered (scaled, ring)."
      />
      <V3_BrandedMarkers />

      <Label
        n="4"
        title="Marker popup as mini booking-card"
        desc="Click a marker → card with image, badge, live rooms chip, View-rooms CTA. Same DNA as homepage cards."
      />
      <V4_PopupCard />

      <Label
        n="5"
        title="Filter pills — floating dark-glass overlay"
        desc="Pills move from a separate row to a floating overlay top-left of the map. Brand-on (matches navbar)."
      />
      <V5_FilterPillsOverlay />

      <Label
        n="6"
        title="City stats overlay — live context on the map"
        desc="Selected city → dark-glass card top-right shows live availability + new-this-month members. Pulls /api/locations/stats."
      />
      <V6_StatsOverlay />

      <Label
        n="B"
        title="BONUS: Gallery + Map under one section header"
        desc="Frames cards-carousel and map as ONE story under a unified intro headline. No more two stacked content blocks without a shared frame."
      />
      <VB_CombinedHeader />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          — Pick the combinations you want. My pick: 1 + 2 + 3 + B for the
          big lift. Then 4, 5, 6 as polish iterations. —
        </p>
      </div>
    </main>
  );
}
