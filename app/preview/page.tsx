"use client";

// Dev-only preview — three takes on the "Almost everything included"
// section. All keep photography front-and-centre (matching stacey.de's
// existing photo-first vibe) but vary in layout drama. Open
// /preview/features manually.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeftRight, Sofa, Sparkles, Users, Wifi, Wrench } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

type Feature = {
  icon: typeof Sofa;
  title: string;
  body: string;
  image: string;
  highlight?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: Sofa,
    title: "Fully furnished suite",
    body: "Bed, desk, storage. Every detail thought through.",
    image: "/images/locations/muehlenkamp/jumbo/001-jumbo-mk.webp",
  },
  {
    icon: Users,
    title: "Common spaces",
    body: "Living rooms, kitchens, work zones — all built for hanging out.",
    image: "/images/locations/muehlenkamp/01-muehlenkamp.webp",
  },
  {
    icon: Wifi,
    title: "Utilities & fibre WiFi",
    body: "Power, water, heating, internet. One price.",
    image: "/images/locations/muehlenkamp/02-muehlenkamp.webp",
  },
  {
    icon: Sparkles,
    title: "Weekly cleaning",
    body: "Common areas every week. Your room stays your space.",
    image: "/images/locations/muehlenkamp/03-muehlenkamp.webp",
  },
  {
    icon: ArrowLeftRight,
    title: "Move between cities",
    body: "Change STACEY homes mid-stay. No fees. No break clauses.",
    image: "/images/locations/eimsbuettel/community/001-community-ei.webp",
    highlight: true,
  },
  {
    icon: Wrench,
    title: "On-call maintenance",
    body: "Something broken? Often fixed the same day.",
    image: "/images/locations/muehlenkamp/04-muehlenkamp.webp",
  },
];

function Eyebrow({ city = "ALL-INCLUSIVE LIVING" }: { city?: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">{city}</p>
  );
}

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

/* ------------------------------------------------------------------ */
/* VARIANT A — Bento Magazine Grid
   Asymmetric grid. Hero card (Private Suite) spans 2 cells with a big
   photo + overlay title. Supporting cards vary in size. The black
   "STACEY only" card is a no-photo stat tile that interrupts the
   photography rhythm — feels like a magazine spread.
/* ------------------------------------------------------------------ */
function VariantA() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow />
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            One price. No surprises. Move in with a suitcase — we handle the rest.
          </p>
        </div>

        {/* Bento — 4 columns, custom row spans. Hero spans col-1+2 row 1+2.
            USP card spans col-3+4 row 2 (wide black band). */}
        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:grid-rows-[260px_220px_260px]">
          {/* Hero — Private Suite, big */}
          <div className="group relative col-span-1 overflow-hidden rounded-[5px] bg-black sm:col-span-2 sm:row-span-2">
            <Image
              src={FEATURES[0].image}
              alt={FEATURES[0].title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] bg-pink text-black">
                <Sofa size={16} strokeWidth={2.25} />
              </span>
              <p className="mt-3 text-xl font-black leading-tight sm:text-2xl">
                {FEATURES[0].title}
              </p>
              <p className="mt-1 max-w-md text-sm text-white/80">{FEATURES[0].body}</p>
            </div>
          </div>

          {/* Common spaces */}
          <div className="group relative h-[220px] overflow-hidden rounded-[5px] bg-black sm:h-auto">
            <Image
              src={FEATURES[1].image}
              alt={FEATURES[1].title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width: 640px) 25vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="text-base font-black leading-tight">{FEATURES[1].title}</p>
              <p className="mt-1 text-xs text-white/75">{FEATURES[1].body}</p>
            </div>
          </div>

          {/* Utilities */}
          <div className="group relative h-[220px] overflow-hidden rounded-[5px] bg-black sm:h-auto">
            <Image
              src={FEATURES[2].image}
              alt={FEATURES[2].title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width: 640px) 25vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="text-base font-black leading-tight">{FEATURES[2].title}</p>
              <p className="mt-1 text-xs text-white/75">{FEATURES[2].body}</p>
            </div>
          </div>

          {/* USP — wide black card spans 2 cols, no photo */}
          <div className="group relative col-span-1 flex h-[220px] flex-col justify-between overflow-hidden rounded-[5px] bg-black p-5 text-white transition-all hover:bg-[#0F0F0F] sm:col-span-2 sm:h-auto">
            <div className="flex items-start justify-between">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] bg-pink text-black">
                <ArrowLeftRight size={16} strokeWidth={2.25} />
              </span>
              <span className="rounded-[3px] bg-pink px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">
                Stacey only
              </span>
            </div>
            <div>
              <p className="text-2xl font-black leading-tight sm:text-3xl">
                Move between cities,{" "}
                <span className="italic font-light text-pink">mid-stay</span>.
              </p>
              <p className="mt-2 max-w-md text-sm text-white/70">
                Hamburg in spring, Berlin in summer, Vallendar in autumn. No fees,
                no break clauses. No other coliving lets you do this.
              </p>
            </div>
          </div>

          {/* Weekly cleaning — small */}
          <div className="group relative h-[220px] overflow-hidden rounded-[5px] bg-black sm:h-auto">
            <Image
              src={FEATURES[3].image}
              alt={FEATURES[3].title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width: 640px) 25vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="text-base font-black leading-tight">{FEATURES[3].title}</p>
              <p className="mt-1 text-xs text-white/75">{FEATURES[3].body}</p>
            </div>
          </div>

          {/* Maintenance — small */}
          <div className="group relative h-[220px] overflow-hidden rounded-[5px] bg-black sm:h-auto">
            <Image
              src={FEATURES[5].image}
              alt={FEATURES[5].title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width: 640px) 25vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="text-base font-black leading-tight">{FEATURES[5].title}</p>
              <p className="mt-1 text-xs text-white/75">{FEATURES[5].body}</p>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-gray sm:text-base">
          You bring{" "}
          <span className="font-semibold text-black">your clothes</span>,{" "}
          <span className="font-semibold text-black">a toothbrush</span>, and{" "}
          <span className="font-semibold text-black">yourself</span>. We&rsquo;ve
          got the rest.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-80"
          >
            Find your room
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* VARIANT B — Full-Photo Hover-Reveal
   Square photo cards. Photo fills the card. Title visible at rest in
   the gradient; body text slides up on hover. Dramatic, cinematic, but
   tap-friendly on mobile (we expand the active card permanently).
/* ------------------------------------------------------------------ */
function VariantB() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow />
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            One price. No surprises. Move in with a suitcase — we handle the rest.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const isActive = active === i;
            const Icon = f.icon;
            return (
              <button
                key={f.title}
                onClick={() => setActive(isActive ? null : i)}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className="group relative aspect-[4/3] overflow-hidden rounded-[5px] bg-black text-left"
              >
                <Image
                  src={f.image}
                  alt={f.title}
                  fill
                  className={clsx(
                    "object-cover transition-transform duration-700",
                    isActive ? "scale-110" : "scale-100",
                  )}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
                {/* Permanent bottom gradient so resting title is readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/0" />
                {/* Hover layer — adds darker overlay so body copy reads */}
                <div
                  className={clsx(
                    "absolute inset-0 bg-black/40 transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                {f.highlight && (
                  <span className="absolute right-3 top-3 rounded-[3px] bg-pink px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">
                    Stacey only
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span
                    className={clsx(
                      "inline-flex h-9 w-9 items-center justify-center rounded-[5px] transition-all duration-300",
                      isActive
                        ? "bg-pink text-black"
                        : "bg-white/15 text-white backdrop-blur-sm",
                    )}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <p className="mt-3 text-lg font-black leading-tight sm:text-xl">
                    {f.title}
                  </p>
                  <p
                    className={clsx(
                      "overflow-hidden text-sm text-white/90 transition-all duration-300",
                      isActive ? "mt-1.5 max-h-20 opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    {f.body}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-gray sm:text-base">
          You bring{" "}
          <span className="font-semibold text-black">your clothes</span>,{" "}
          <span className="font-semibold text-black">a toothbrush</span>, and{" "}
          <span className="font-semibold text-black">yourself</span>. We&rsquo;ve
          got the rest.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-80"
          >
            Find your room
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* VARIANT C — Editorial Diptych Bands
   Each feature gets its own horizontal band — alternating photo
   left/right with copy on the opposite side. Big photos, big type.
   Magazine-spread feel, slower scroll, premium.
/* ------------------------------------------------------------------ */
function VariantC() {
  // Trim to 4 features for the diptych — full bands need to feel
  // intentional, not endless. The USP gets its own dark band.
  const bands = [FEATURES[0], FEATURES[1], FEATURES[4], FEATURES[3]];
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow />
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            Move in with a suitcase. Here&rsquo;s what&rsquo;s waiting.
          </p>
        </div>

        <div className="mt-14 space-y-12 sm:mt-20 sm:space-y-20">
          {bands.map((f, i) => {
            const reversed = i % 2 === 1;
            const Icon = f.icon;
            const isUSP = !!f.highlight;
            return (
              <div
                key={f.title}
                className={clsx(
                  "grid items-center gap-6 sm:gap-12 lg:grid-cols-2 lg:gap-16",
                )}
              >
                {/* Photo */}
                <div
                  className={clsx(
                    "relative aspect-[4/3] overflow-hidden rounded-[5px] bg-black",
                    reversed && "lg:order-2",
                  )}
                >
                  <Image
                    src={f.image}
                    alt={f.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                  {isUSP && (
                    <span className="absolute left-4 top-4 rounded-[3px] bg-pink px-2 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-black">
                      Stacey only
                    </span>
                  )}
                </div>

                {/* Copy */}
                <div className={clsx(reversed && "lg:order-1")}>
                  <span
                    className={clsx(
                      "inline-flex h-10 w-10 items-center justify-center rounded-[5px]",
                      isUSP ? "bg-pink text-black" : "bg-black text-white",
                    )}
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </span>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                    Feature 0{i + 1}
                  </p>
                  <h3 className="mt-1 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                    {f.title.replace("Move between cities", "Move between cities")}
                  </h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-gray">
                    {f.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-16 max-w-2xl text-center text-sm text-gray sm:text-base">
          You bring{" "}
          <span className="font-semibold text-black">your clothes</span>,{" "}
          <span className="font-semibold text-black">a toothbrush</span>, and{" "}
          <span className="font-semibold text-black">yourself</span>. We&rsquo;ve
          got the rest.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-80"
          >
            Find your room
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function PreviewFeatures() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          &ldquo;Almost everything included&rdquo; —{" "}
          <span className="italic font-light">A vs B vs C</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Drei Varianten der Features-Sektion mit echten Fotos. Jede behält die
          editoriale Tonalität (pink eyebrow + italic-keyword headline + &ldquo;You
          bring&rdquo; reveal), variiert aber das Foto-Layout.
        </p>
      </div>

      <VariantLabel
        n="A"
        title="Bento Magazine Grid — asymmetric, hero-card driven"
        desc="Magazin-Spread Look. Private Suite als 2×2 Hero, USP (Move between cities) als breites schwarzes Band ohne Foto. 5 Photo-Cards + 1 Statement-Card. Premium, dicht, viel zu sehen ohne lang zu scrollen."
      />
      <VariantA />

      <VariantLabel
        n="B"
        title="Full-Photo Cards — hover/tap reveals body copy"
        desc='Foto füllt jede Card komplett. Nur Icon + Titel sichtbar. Auf Hover/Tap erscheint Body-Text mit dunklerem Overlay + pink Icon. Cinematic, mutig — Fokus liegt auf der Photographie selbst.'
      />
      <VariantB />

      <VariantLabel
        n="C"
        title="Editorial Diptych Bands — alternating photo + text rows"
        desc="Vier große Bänder, abwechselnd Foto-Links/Foto-Rechts. Wie eine Magazin-Doppelseite. Langsamer Scroll, jede Feature bekommt richtig Gewicht. Fokus auf Größe, weniger auf Quantität."
      />
      <VariantC />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">— Pick A, B, oder C — und ich verdrahte es als neuen Default. —</p>
      </div>
    </main>
  );
}
