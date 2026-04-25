"use client";

// Dev-only preview — three RADICALLY different takes on the "Almost
// everything included" section. None of them are a feature-card grid.
// Open /preview manually.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeftRight, Sofa, Sparkles, Users, Wifi, Wrench, Coffee } from "lucide-react";
import { clsx } from "clsx";

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
/* VARIANT D — "A Day at STACEY" Timeline
   Narrative storytelling. Each feature is a moment in a member's day,
   anchored to a clock time. Photos are polaroid-style with rotation.
   Pink vertical timeline runs down the centre.
   What's different: the section reads like a story, not a feature
   list. Each "stop" in the day reveals a feature naturally.
/* ================================================================== */

type DayMoment = {
  time: string;
  icon: typeof Sofa;
  feature: string;
  quote: string;
  member: string;
  image: string;
  rotate: string;
  highlight?: boolean;
};

const DAY: DayMoment[] = [
  {
    time: "07:30",
    icon: Coffee,
    feature: "Common kitchen",
    quote: "Coffee in the kitchen. Anna&rsquo;s already plotting tonight&rsquo;s dinner.",
    member: "Lukas, suite 04",
    image: "/images/locations/muehlenkamp/community/01-muehlenkamp.webp",
    rotate: "-rotate-2",
  },
  {
    time: "10:00",
    icon: Wifi,
    feature: "Fibre internet, included",
    quote: "Fibre wifi just works. I haven&rsquo;t thought about a router in two years.",
    member: "Mira, suite 02",
    image: "/images/locations/muehlenkamp/community/02-muehlenkamp.webp",
    rotate: "rotate-1",
  },
  {
    time: "13:00",
    icon: Sparkles,
    feature: "Weekly cleaning",
    quote: "Cleaner&rsquo;s been through. I didn&rsquo;t even notice. Fresh towels in the bath.",
    member: "Tom, suite 11",
    image: "/images/locations/muehlenkamp/community/03-muehlenkamp.webp",
    rotate: "-rotate-1",
  },
  {
    time: "18:30",
    icon: Users,
    feature: "Built-in community",
    quote: "Sunday roast on the rooftop. Eight of us. None of us planned it.",
    member: "Lisa, suite 07",
    image: "/images/locations/eimsbuettel/community/001-community-ei.webp",
    rotate: "rotate-2",
  },
  {
    time: "20:15",
    icon: Wrench,
    feature: "On-call maintenance",
    quote: "Fridge stopped. Maintenance fixed it before sundown. No drama.",
    member: "Daniel, suite 09",
    image: "/images/locations/muehlenkamp/community/04-muehlenkamp.webp",
    rotate: "-rotate-1",
  },
  {
    time: "22:00",
    icon: ArrowLeftRight,
    feature: "Move between cities",
    quote: "Booked next month at STACEY Berlin. No new lease. No new deposit.",
    member: "Ana, soon-to-be suite 03 (Mitte)",
    image: "/images/locations/berlin-mitte/community/13-berlin.webp",
    rotate: "rotate-2",
    highlight: true,
  },
];

function VariantD() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            A day at STACEY
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            Six moments from a Tuesday. Every one of them is a thing that&rsquo;s
            already paid for.
          </p>
        </div>

        {/* Timeline — pink centre line on desktop, left-rail on mobile */}
        <div className="relative mt-16 sm:mt-20">
          <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-pink/0 via-pink/50 to-pink/0 sm:left-1/2 sm:-translate-x-px" />

          <ol className="space-y-14 sm:space-y-20">
            {DAY.map((m, i) => {
              const right = i % 2 === 1;
              const Icon = m.icon;
              return (
                <li
                  key={m.time}
                  className={clsx(
                    "relative grid gap-6 pl-14 sm:gap-8 sm:pl-0 sm:grid-cols-2",
                  )}
                >
                  {/* Pin on the timeline */}
                  <span
                    aria-hidden
                    className={clsx(
                      "absolute left-6 top-2 -translate-x-1/2 rounded-full ring-4 ring-[#FAFAFA] sm:left-1/2",
                      m.highlight
                        ? "h-4 w-4 bg-pink"
                        : "h-3 w-3 bg-black",
                    )}
                  />
                  {/* Time stamp */}
                  <div
                    className={clsx(
                      "sm:flex sm:items-start",
                      right ? "sm:order-2 sm:justify-start sm:pl-12" : "sm:order-1 sm:justify-end sm:pr-12 sm:text-right",
                    )}
                  >
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray">
                        {m.time}
                      </p>
                      <p className="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                        {m.feature}
                      </p>
                      <p
                        className={clsx(
                          "mt-3 max-w-sm text-base italic font-light leading-relaxed text-black sm:text-lg",
                          right ? "" : "sm:ml-auto",
                        )}
                        dangerouslySetInnerHTML={{ __html: `&ldquo;${m.quote}&rdquo;` }}
                      />
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.15em] text-gray">
                        — {m.member}
                      </p>
                      <span
                        className={clsx(
                          "mt-3 inline-flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                          m.highlight ? "bg-pink text-black" : "bg-black text-white",
                        )}
                      >
                        <Icon size={11} strokeWidth={2.5} />
                        {m.highlight ? "Stacey only" : "Included"}
                      </span>
                    </div>
                  </div>

                  {/* Polaroid */}
                  <div className={clsx(right ? "sm:order-1 sm:justify-self-end" : "sm:order-2 sm:justify-self-start")}>
                    <div
                      className={clsx(
                        "relative w-full max-w-[340px] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:rotate-0",
                        m.rotate,
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-black">
                        <Image
                          src={m.image}
                          alt={m.feature}
                          fill
                          className="object-cover"
                          sizes="(min-width: 640px) 340px, 100vw"
                        />
                      </div>
                      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-gray">
                        {m.time} · {m.feature}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mx-auto mt-20 max-w-2xl text-center text-sm text-gray sm:text-base">
          You bring{" "}
          <span className="font-semibold text-black">your clothes</span>,{" "}
          <span className="font-semibold text-black">a toothbrush</span>, and{" "}
          <span className="font-semibold text-black">yourself</span>.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-80"
          >
            Find your room
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* VARIANT E — Annotated Hero Photo (NYT-Explainer Style)
   ONE big hero photo of a STACEY common space. Numbered pink pins
   placed at meaningful spots (sofa = "common spaces", router = "wifi
   included"…). Hover/click a pin → label card pops out with feature
   detail. Below the photo: a numbered list mirrors the pins.
   What's different: the apartment IS the section. Photo carries 90%
   of the visual weight; the features are revealed as you read it.
/* ================================================================== */

type Pin = {
  n: string;
  top: string;
  left: string;
  icon: typeof Sofa;
  title: string;
  body: string;
  highlight?: boolean;
};

const PINS: Pin[] = [
  {
    n: "01",
    top: "26%",
    left: "18%",
    icon: Sofa,
    title: "Furnished suite",
    body: "Bed, desk, storage. Every detail thought through.",
  },
  {
    n: "02",
    top: "44%",
    left: "62%",
    icon: Users,
    title: "Common spaces",
    body: "Living rooms, kitchens, work zones built for hanging out.",
  },
  {
    n: "03",
    top: "18%",
    left: "78%",
    icon: Wifi,
    title: "Fibre WiFi & utilities",
    body: "Power, water, heating, internet. One price.",
  },
  {
    n: "04",
    top: "70%",
    left: "32%",
    icon: Sparkles,
    title: "Weekly cleaning",
    body: "Common areas every week. Your room stays your space.",
  },
  {
    n: "05",
    top: "62%",
    left: "82%",
    icon: Wrench,
    title: "On-call maintenance",
    body: "Something broken? Often fixed the same day.",
  },
  {
    n: "06",
    top: "82%",
    left: "55%",
    icon: ArrowLeftRight,
    title: "Move between cities",
    body: "Change STACEY homes mid-stay. No fees. No break clauses.",
    highlight: true,
  },
];

function VariantE() {
  const [active, setActive] = useState<string>("01");
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Read the apartment
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            Six things, one room. Tap a pin.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Hero photo with pins */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-[5px] bg-black">
            <Image
              src="/images/locations/eimsbuettel/community/001-community-ei.webp"
              alt="STACEY common space"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 70vw, 100vw"
              priority
            />
            {/* Subtle vignette so pins read against any photo content */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/0 via-black/10 to-black/35" />

            {PINS.map((p) => {
              const isActive = active === p.n;
              return (
                <button
                  key={p.n}
                  onClick={() => setActive(p.n)}
                  onMouseEnter={() => setActive(p.n)}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: p.top, left: p.left }}
                  aria-label={`${p.n} ${p.title}`}
                >
                  {/* Pulse ring when active */}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-pink/40"
                      style={{ animation: "stacey-marker-ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }}
                    />
                  )}
                  <span
                    className={clsx(
                      "relative flex items-center justify-center rounded-full font-mono text-[11px] font-black transition-all duration-300 ring-4",
                      isActive
                        ? "h-9 w-9 bg-pink text-black ring-white shadow-[0_4px_18px_rgba(0,0,0,0.4)] scale-100"
                        : p.highlight
                          ? "h-7 w-7 bg-pink text-black ring-white/80 shadow-[0_3px_12px_rgba(0,0,0,0.35)]"
                          : "h-7 w-7 bg-black text-white ring-white/80 shadow-[0_3px_12px_rgba(0,0,0,0.35)]",
                    )}
                  >
                    {p.n}
                  </span>
                </button>
              );
            })}

            {/* Active pin's caption — anchored top-left of photo, magazine pull-quote feel */}
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:max-w-sm">
              {PINS.filter((p) => p.n === active).map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.n}
                    className="rounded-[5px] bg-white/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur"
                    style={{ animation: "fadeSlide 0.3s ease-out" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "flex h-7 w-7 items-center justify-center rounded-[5px]",
                          p.highlight ? "bg-pink text-black" : "bg-black text-white",
                        )}
                      >
                        <Icon size={13} strokeWidth={2.5} />
                      </span>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray">
                        Pin {p.n}
                      </p>
                      {p.highlight && (
                        <span className="rounded-[3px] bg-pink px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">
                          Stacey only
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-base font-black leading-tight">{p.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray">{p.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Index list — same numbers as pins, click-through navigation */}
          <ol className="self-start lg:sticky lg:top-24">
            {PINS.map((p, i) => {
              const isActive = active === p.n;
              return (
                <li key={p.n}>
                  <button
                    onClick={() => setActive(p.n)}
                    onMouseEnter={() => setActive(p.n)}
                    className={clsx(
                      "group flex w-full items-start gap-3 border-b border-black/5 py-3 text-left transition-colors",
                      i === PINS.length - 1 && "border-b-0",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-black transition-all",
                        isActive
                          ? p.highlight
                            ? "bg-pink text-black"
                            : "bg-black text-white"
                          : "bg-[#F5F5F5] text-black/60 group-hover:bg-black group-hover:text-white",
                      )}
                    >
                      {p.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={clsx(
                          "text-sm font-bold leading-tight transition-colors",
                          isActive ? "text-black" : "text-black/60 group-hover:text-black",
                        )}
                      >
                        {p.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-gray">{p.body}</p>
                    </div>
                    {p.highlight && (
                      <span className="flex-shrink-0 rounded-[3px] bg-pink px-1 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">
                        ★
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-gray sm:text-base">
          You bring{" "}
          <span className="font-semibold text-black">your clothes</span>,{" "}
          <span className="font-semibold text-black">a toothbrush</span>, and{" "}
          <span className="font-semibold text-black">yourself</span>.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-80"
          >
            Find your room
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* VARIANT F — Receipt vs Receipt (Cost Reveal)
   Side-by-side mock receipts. Left: "Renting somewhere else" with 7
   itemised line items adding up to a big total. Right: a clean STACEY
   receipt — one line, italic-keyword headline, no add-ons. The
   features are the line items on the LEFT side, struck through (since
   STACEY absorbs them). Drama is mathematical, not photographic.
/* ================================================================== */

type Cost = { label: string; price: string; sub?: string; included?: boolean };

const RIVAL: Cost[] = [
  { label: "Furnished apartment", price: "€1,100", sub: "1-room, Hamburg avg" },
  { label: "Furniture (amortised)", price: "€120", sub: "bed, desk, sofa, storage / 24 mo" },
  { label: "Utilities", price: "€180", sub: "power, water, heating" },
  { label: "Fibre internet", price: "€40", sub: "100 Mbps contract, 24 mo lock-in" },
  { label: "Weekly cleaning", price: "€100", sub: "common areas, fortnightly minimum" },
  { label: "Maintenance buffer", price: "€60", sub: "your problem, your time, your money" },
  { label: "Move-in admin", price: "€80", sub: "Schufa, Anmeldung, broker, deposits" },
];

function VariantF() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Do the math
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            One number against seven. We&rsquo;ll make it short.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Rival receipt — long, fragmented, struck through */}
          <div className="relative rounded-[5px] bg-white p-6 ring-1 ring-black/10 shadow-sm sm:p-8">
            <div className="flex items-baseline justify-between border-b border-dashed border-black/15 pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray">
                Renting solo
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray">
                Hamburg · monthly
              </p>
            </div>

            <ul className="mt-4 space-y-3">
              {RIVAL.map((c) => (
                <li
                  key={c.label}
                  className="grid grid-cols-[1fr_auto] gap-3 border-b border-black/5 pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-bold leading-tight text-black/80 line-through decoration-pink decoration-2">
                      {c.label}
                    </p>
                    {c.sub && (
                      <p className="mt-0.5 text-[11px] leading-tight text-gray">{c.sub}</p>
                    )}
                  </div>
                  <p className="self-start font-mono text-sm font-bold text-black/60 line-through decoration-pink decoration-2">
                    {c.price}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-baseline justify-between border-t-2 border-double border-black/30 pt-4">
              <p className="text-base font-black uppercase tracking-wide">Total</p>
              <p className="font-mono text-3xl font-black sm:text-4xl">€1,680</p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray">
              Plus 24 months of locked contracts, three deposits, one Schufa,
              and an evening on hold with the internet provider.
            </p>
          </div>

          {/* STACEY receipt — short, clean, one number */}
          <div className="relative flex flex-col justify-between rounded-[5px] bg-black p-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-8">
            <div>
              <div className="flex items-baseline justify-between border-b border-dashed border-white/20 pb-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pink">
                  STACEY
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Hamburg · monthly
                </p>
              </div>

              <p className="mt-8 text-sm font-medium uppercase tracking-[0.15em] text-white/60">
                Your move-in
              </p>
              <p className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                One private suite.{" "}
                <span className="italic font-light text-pink">Everything in.</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Furnished. Cleaned weekly. Fibre wifi. Utilities, maintenance,
                community, and free transfers between STACEY cities — all on
                the bill below.
              </p>
            </div>

            <div className="mt-10">
              <div className="flex items-baseline justify-between border-t-2 border-double border-white/30 pt-4">
                <p className="text-base font-black uppercase tracking-wide">Total</p>
                <p className="font-mono text-4xl font-black text-pink sm:text-5xl">€1,290</p>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-white/55">
                You save ~<span className="font-semibold text-pink">€390/mo</span>.
                You skip seven contracts. You start tomorrow.
              </p>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-gray sm:mt-14 sm:text-base">
          You bring{" "}
          <span className="font-semibold text-black">your clothes</span>,{" "}
          <span className="font-semibold text-black">a toothbrush</span>, and{" "}
          <span className="font-semibold text-black">yourself</span>.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-80"
          >
            Find your room
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
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
          Internal preview · take 2
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          &ldquo;Almost everything included&rdquo; —{" "}
          <span className="italic font-light">D, E, F</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Drei radikal andere Ansätze. Kein Card-Grid. Storytelling, Annotated
          Hero, oder Math. Pick whichever feels closest, ich verfeinere weiter.
        </p>
      </div>

      <VariantLabel
        n="D"
        title="A Day at STACEY — Polaroid Timeline"
        desc="Sechs Momente eines Dienstags, jeder Moment = ein Feature. Pinkes Mittel-Timeline, Polaroid-Fotos mit Member-Quotes. Liest sich wie eine Story, nicht wie eine Liste."
      />
      <VariantD />

      <VariantLabel
        n="E"
        title="Read the Apartment — Annotated Hero Photo (NYT-Style)"
        desc="EIN großes Foto einer STACEY Common Area. Sechs nummerierte Pink-Pins markieren Spots im Raum. Hover/Tap → Feature-Card pop-out. Begleitend rechts: nummerierte Index-Liste. Die Wohnung IST der Inhalt."
      />
      <VariantE />

      <VariantLabel
        n="F"
        title="Receipt vs Receipt — Mathematical Drama"
        desc="Side-by-side Rechnungen. Links: 7 durchgestrichene Posten beim Solo-Mieten = €1.680. Rechts: STACEY = ein Posten = €1.290. Zahl statt Foto. Killer Argument für die preisbewusste Zielgruppe."
      />
      <VariantF />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">— Pick D, E, oder F. Oder kombiniert. —</p>
      </div>
    </main>
  );
}
