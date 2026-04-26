"use client";

// Dev-only preview, four ways to place the editorial header BETWEEN
// Locations cards and Map at the visual boundary between them.

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { locations } from "@/lib/data";

const MapSection = dynamic(() => import("@/components/home/MapSection"), { ssr: false });

/* ─── Shared header copy ─────────────────────────────────────────── */

function DiscoveryHeading() {
  return (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
        8 homes · 3 cities
      </p>
      <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
        Find us in{" "}
        <span className="italic font-light">Hamburg, Berlin, Vallendar</span>.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-gray sm:text-base">
        Hover a marker, scroll the list. Click any home to check live availability.
      </p>
    </>
  );
}

/* ─── Mock Locations carousel ────────────────────────────────────── */

function LocationsCarousel() {
  const list = useMemo(() => locations.slice(0, 6), []);
  return (
    <div
      className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{ scrollbarWidth: "none" }}
    >
      {list.map((loc) => (
        <Link
          key={loc.slug}
          href={`/locations/${loc.slug}`}
          className="group relative w-[260px] flex-shrink-0 overflow-hidden rounded-[5px] bg-white shadow-sm ring-1 ring-black/5 snap-start transition-transform hover:-translate-y-0.5 sm:w-[300px]"
        >
          <div className="relative aspect-[4/3]">
            <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="300px" />
            <span
              className={clsx(
                "absolute right-2 top-2 rounded-[5px] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]",
                loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white",
              )}
            >
              {loc.stayType}
            </span>
          </div>
          <div className="p-3">
            <p className="text-sm font-extrabold leading-tight">{loc.name}</p>
            <p className="mt-0.5 text-xs text-gray">
              from €{loc.priceFrom}/{loc.stayType === "SHORT" ? "night" : "mo"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─── Variant labels ─────────────────────────────────────────────── */

function VariantLabel({ n, title, desc }: { n: string; title: string; desc?: string }) {
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

/* ================================================================== */
/* V1, Straddle the boundary (two-tone bg)                             */
/*    Cards on #FAFAFA, Map on white. Header sits centered on the     */
/*    color seam so its top half is on grey, bottom half on white.    */
/*    Subtle but readable since both bgs are light.                   */
/* ================================================================== */
function V1() {
  return (
    <>
      <section className="bg-[#FAFAFA] py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <LocationsCarousel />
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto -mt-10 max-w-2xl px-4 pb-10 text-center sm:px-6 lg:px-8">
          <DiscoveryHeading />
        </div>
        <MapSection hideHeader />
      </section>
    </>
  );
}

/* ================================================================== */
/* V2, Floating card stamp                                             */
/*    Header lives in a white card with shadow + ring, sitting with   */
/*    negative margins so it overlaps both Cards and Map. Reads as a  */
/*    pull-quote stamp tying the two together.                        */
/* ================================================================== */
function V2() {
  return (
    <div className="relative">
      <section className="bg-[#FAFAFA] py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <LocationsCarousel />
        </div>
      </section>
      {/* Card stamp, overlaps both sections via negative margins */}
      <div className="relative z-10 mx-auto -mt-16 mb-[-4rem] max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[5px] bg-white p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.12)] ring-1 ring-black/5 sm:p-10">
          <DiscoveryHeading />
        </div>
      </div>
      <section className="bg-[#FAFAFA] pt-24">
        <MapSection hideHeader />
      </section>
    </div>
  );
}

/* ================================================================== */
/* V3, Diagonal seam with header on the angle                          */
/*    Cards section ends with a clip-path angle. Map section begins   */
/*    with the same angle. The header sits centered on the angled    */
/*    seam, with a thin pink hairline running through it.            */
/* ================================================================== */
function V3() {
  return (
    <div className="relative">
      <section
        className="bg-[#FAFAFA] py-12"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 60px), 0 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
          <LocationsCarousel />
        </div>
      </section>
      <div className="-mt-12 mb-12">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <DiscoveryHeading />
          {/* Hairline that hints the section transition */}
          <div
            aria-hidden
            className="mx-auto mt-6 h-px max-w-xs"
            style={{
              backgroundImage: "linear-gradient(to right, transparent, #FCB0C0 50%, transparent)",
            }}
          />
        </div>
      </div>
      <section
        className="bg-white pt-12"
        style={{ clipPath: "polygon(0 60px, 100% 0, 100% 100%, 0 100%)" }}
      >
        <MapSection hideHeader />
      </section>
    </div>
  );
}

/* ================================================================== */
/* V4, Pin drop                                                        */
/*    Header card with a MapPin icon. A dashed pink line drops from   */
/*    the pin down into the Map section below, like a literal pin    */
/*    trail leading the eye to the geography.                         */
/* ================================================================== */
function V4() {
  return (
    <div className="relative">
      <section className="bg-[#FAFAFA] py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <LocationsCarousel />
        </div>
      </section>
      <div className="relative bg-white">
        <div className="mx-auto max-w-2xl px-4 pt-12 pb-6 text-center sm:px-6 lg:px-8">
          <DiscoveryHeading />
          {/* Pin + dashed line connecting to map below */}
          <div className="relative mx-auto mt-6 flex flex-col items-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink text-black shadow-[0_6px_18px_rgba(252,176,192,0.5)]">
              <MapPin size={18} strokeWidth={2.5} className="-translate-y-px fill-black" />
            </span>
            <div
              aria-hidden
              className="h-12 w-px"
              style={{
                backgroundImage: "linear-gradient(to bottom, #FCB0C0 50%, transparent 50%)",
                backgroundSize: "1px 8px",
                backgroundRepeat: "repeat-y",
              }}
            />
          </div>
        </div>
        <MapSection hideHeader />
      </div>
    </div>
  );
}

/* ─── Page wrapper ───────────────────────────────────────────────── */

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · take 8
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Header at the seam,{" "}
          <span className="italic font-light">four ways</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Locations Cards bleiben oben (peek-trigger vom Hero), Map drunter.
          Der Editorial-Header sitzt zwischen beiden und nutzt die
          Übergangsstelle visuell. Vier verschiedene Konzepte.
        </p>
      </div>

      <VariantLabel
        n="V1"
        title="Straddle the boundary, two-tone background"
        desc="Cards auf #FAFAFA, Map auf weiß. Header sitzt zentriert auf der Farb-Naht, obere Hälfte auf grau, untere auf weiß. Subtil aber liest sich als visuelle Brücke."
      />
      <V1 />

      <VariantLabel
        n="V2"
        title="Floating card stamp, overlaps both sections"
        desc="Header in einer weißen Card mit kräftigem Shadow + Ring, sitzt mit negativen Margins über der Naht zwischen Cards und Map. Wie ein Stempel oder Pull-Quote der die zwei Blöcke verklammert."
      />
      <V2 />

      <VariantLabel
        n="V3"
        title="Diagonal seam, header on the angle"
        desc="Beide Sektionen haben eine schräge Kante (clip-path). Header sitzt zentriert auf dem Diagonal-Übergang mit einer dünnen pinken Hairline drunter. Magazin-Spread Vibe."
      />
      <V3 />

      <VariantLabel
        n="V4"
        title="Pin drop, header with literal pin trail into the map"
        desc="Header schließt mit einer pink-runden MapPin Marker, drunter eine gestrichelte vertikale Linie die in die Map hineinläuft. Zeigt buchstäblich 'wir markieren die Häuser auf der Karte unten'."
      />
      <V4 />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          Pick V1, V2, V3 oder V4. Ich verdrahte die Wahl als neuen Default.
        </p>
        <Link
          href="/"
          className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-pink"
        >
          Back to homepage
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
