"use client";

// Dev-only preview, three layouts that group the Locations cards and
// the Map section under one shared editorial header. Open /preview.

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { locations } from "@/lib/data";

const MapSection = dynamic(() => import("@/components/home/MapSection"), { ssr: false });

const CITY_LABELS: Record<string, string> = {
  hamburg: "Hamburg",
  berlin: "Berlin",
  vallendar: "Vallendar",
};
const CITY_ORDER = ["hamburg", "berlin", "vallendar"] as const;
type CityFilter = "all" | (typeof CITY_ORDER)[number];

/* ─── Shared header ──────────────────────────────────────────────── */

function DiscoveryHeader({ city = "all" }: { city?: CityFilter }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
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
      <p className="mx-auto mt-3 max-w-xl text-sm text-gray sm:text-base">
        Hover a marker, scroll the list. Click any home to check live availability.
      </p>
    </div>
  );
}

/* ─── Mock locations carousel (replicates the homepage cards) ──── */

function LocationsCarousel({ city = "all" }: { city?: CityFilter }) {
  const filtered = useMemo(() => {
    if (city === "all") return locations;
    return locations.filter((l) => l.city === city);
  }, [city]);
  return (
    <div
      className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{ scrollbarWidth: "none" }}
    >
      {filtered.map((loc) => (
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

function VariantLabel({
  n,
  title,
  desc,
}: {
  n: string;
  title: string;
  desc?: string;
}) {
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
/* V1, header band above, then Locations, then Map (3 sections)       */
/*    Lightest touch. Sections stay structurally separate; the shared */
/*    header above ties them visually. Map keeps its city tabs which */
/*    only filter the map (not the cards).                            */
/* ================================================================== */
function V1() {
  return (
    <>
      <section className="bg-[#FAFAFA] px-4 pt-16 pb-6 sm:px-6 sm:pt-20 sm:pb-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <DiscoveryHeader />
        </div>
      </section>
      <section className="bg-[#FAFAFA] px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <LocationsCarousel />
        </div>
      </section>
      <MapSection />
    </>
  );
}

/* ================================================================== */
/* V2, single wrapper section, no breaks between cards and map        */
/*    Header at top, cards below, map below that. All inside one     */
/*    bg-#FAFAFA section so the three blocks read as one cluster.    */
/*    Map renders without its own header (hideHeader prop).          */
/* ================================================================== */
function V2() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <DiscoveryHeader />
        <div className="mt-10">
          <LocationsCarousel />
        </div>
      </div>
      <div className="mt-4">
        <MapSection hideHeader />
      </div>
    </section>
  );
}

/* ================================================================== */
/* V3, single wrapper + shared city filter at top                     */
/*    City tabs lifted up, sit under the header, control both the    */
/*    cards filter AND the map. Headline morphs based on selected    */
/*    city. (Note: in this preview the embedded MapSection still     */
/*    has its own internal city state, so the map below would also   */
/*    need to be wired to the shared state in real implementation.   */
/*    The cards filtering and headline morph demonstrate the idea.) */
/* ================================================================== */
function V3() {
  const [city, setCity] = useState<CityFilter>("all");
  return (
    <section className="bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <DiscoveryHeader city={city} />
        <div className="mt-6 flex justify-center">
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
        <div className="mt-8">
          <LocationsCarousel city={city} />
        </div>
      </div>
      <div className="mt-4">
        <MapSection hideHeader />
      </div>
      <p className="mx-auto mt-6 max-w-md text-center text-[11px] italic text-gray">
        (Preview note: cards filter live; the map below would also be wired to
        the shared filter in real implementation.)
      </p>
    </section>
  );
}

/* ─── Page wrapper ───────────────────────────────────────────────── */

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · take 7
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Discovery cluster,{" "}
          <span className="italic font-light">three groupings</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Drei Wege Locations Cards + Map unter einer gemeinsamen Editorial-
          Überschrift zu bündeln. V1 = leichteste Trennung, V2 = single
          wrapper, V3 = shared filter über beide Blöcke.
        </p>
      </div>

      <VariantLabel
        n="V1"
        title="Header band above, sections stay separate"
        desc="Shared header in eigener Section ganz oben. Locations + Map bleiben strukturell getrennt aber visuell durch den Header geclustert. Map behält ihren eigenen Header? Nein, der ist hier nur durch DiscoveryHeader ersetzt; die Map zeigt unten nur ihre City-Tabs + die Karte selbst."
      />
      <V1 />

      <VariantLabel
        n="V2"
        title="Single wrapper, header + cards + map flow together"
        desc="Eine Section umschließt alles. Header oben, Cards drunter, Map ohne eigenen Header drunter. Alles auf gleichem #FAFAFA Hintergrund, kein Section-Break dazwischen. Cleanste Lösung."
      />
      <V2 />

      <VariantLabel
        n="V3"
        title="Single wrapper + shared city filter (cards + map)"
        desc="V2 plus City-Tabs zwischen Header und Cards. Klick auf eine Stadt filtert Cards UND Map gleichzeitig. Headline morpht zur gewählten Stadt. (Im Preview ist das Map-Wiring stub'd — Cards filtern wirklich, Map-Sync würde in der echten Implementierung passieren.)"
      />
      <V3 />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          Pick V1, V2, oder V3. Ich verdrahte die Wahl als neuen Default.
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
