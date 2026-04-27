"use client";

// Internal preview, all current Hero SHORT/LONG selector ideas in one
// place. CURRENT shown first as baseline. Then four distinct concepts:
// solid pink-active, pre-selected LONG (Booking/Airbnb pattern), both
// always-inviting (no smart default), refined heavy-border.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";

type StayType = "SHORT" | "LONG";

function VariantLabel({
  n,
  title,
  desc,
  recommendation,
}: {
  n: string;
  title: string;
  desc?: string;
  recommendation?: string;
}) {
  return (
    <div className="bg-[#1A1A1A] px-6 py-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pink">
            Option {n}
          </p>
          {recommendation && (
            <span className="inline-block rounded-[3px] bg-pink px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
              {recommendation}
            </span>
          )}
        </div>
        <p className="mt-1 text-base font-extrabold text-white sm:text-lg">{title}</p>
        {desc && <p className="mt-1 text-xs text-white/60">{desc}</p>}
      </div>
    </div>
  );
}

function HeroBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-[440px] items-center justify-center overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <Image
        src="/images/website-hero.webp"
        alt=""
        fill
        className="object-cover"
        priority={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/55" />
      <div className="relative z-10 w-full max-w-md text-center">
        <p className="mb-5 block w-full text-base font-semibold text-white sm:text-lg">
          How long do you want to stay?
        </p>
        {children}
      </div>
    </section>
  );
}

/* ================================================================== */
/* CURRENT, baseline                                                    */
/* ================================================================== */
function Current() {
  const [stayType, setStayType] = useState<StayType | null>(null);
  return (
    <HeroBackdrop>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
        {(["SHORT", "LONG"] as StayType[]).map((t) => {
          const active = stayType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setStayType(t)}
              className={clsx(
                "w-full rounded-[5px] px-6 py-3.5 text-sm font-extrabold tracking-wide transition-all duration-200 sm:flex sm:w-auto sm:min-w-[210px] sm:flex-col sm:gap-0.5 sm:px-8 sm:py-4 sm:text-base",
                active
                  ? "bg-white text-black shadow-lg hover:opacity-80"
                  : "border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
              )}
            >
              <span>{t === "SHORT" ? "SHORT" : "LONG"}</span>
              <span className="text-xs font-medium sm:text-sm">
                <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>
                {t === "SHORT" ? "up to 3 months" : "stay 3+ months"}
              </span>
            </button>
          );
        })}
      </div>
    </HeroBackdrop>
  );
}

/* ================================================================== */
/* OPTION A, Pink-Active Color Split                                    */
/*    Inactive bg-white/text-black solid (visible button waiting), */
/*    Active bg-pink shadow-pink-glow (brand-color pop). Maximum brand */
/*    coloration, both states clearly buttons. No pre-selection.       */
/* ================================================================== */
function OptionA() {
  const [stayType, setStayType] = useState<StayType | null>(null);
  return (
    <HeroBackdrop>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
        {(["SHORT", "LONG"] as StayType[]).map((t) => {
          const active = stayType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setStayType(t)}
              className={clsx(
                "w-full rounded-[5px] px-8 py-4 text-base font-extrabold tracking-wide transition-all duration-200 sm:flex sm:w-auto sm:min-w-[220px] sm:flex-col sm:items-center sm:gap-1",
                active
                  ? "bg-pink text-black shadow-[0_8px_28px_rgba(252,176,192,0.45)]"
                  : "bg-white text-black/80 shadow-[0_4px_18px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.20)]",
              )}
            >
              <span>{t === "SHORT" ? "Short stay" : "Long stay"}</span>
              <span className={clsx("text-sm font-medium", active ? "text-black/65" : "text-black/55")}>
                <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>
                {t === "SHORT" ? "Up to 3 months" : "From 3 months"}
              </span>
            </button>
          );
        })}
      </div>
    </HeroBackdrop>
  );
}

/* ================================================================== */
/* OPTION B, Solid White + Pink-Ring Active (no pre-select)            */
/*    Both states bg-white solid. Inactive: muted text-black/55.      */
/*    Active: full text-black + ring-2 ring-pink + pink-shadow-glow + */
/*    Check-Badge top-right. Neither pre-selected.                     */
/* ================================================================== */
function OptionB() {
  const [stayType, setStayType] = useState<StayType | null>(null);
  return (
    <HeroBackdrop>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
        {(["SHORT", "LONG"] as StayType[]).map((t) => {
          const active = stayType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setStayType(t)}
              className={clsx(
                "relative w-full overflow-hidden rounded-[5px] bg-white px-8 py-4 text-base font-extrabold tracking-wide transition-all duration-200 sm:flex sm:w-auto sm:min-w-[220px] sm:flex-col sm:items-center sm:gap-1",
                active
                  ? "text-black ring-2 ring-pink shadow-[0_8px_28px_rgba(252,176,192,0.45)]"
                  : "text-black/55 shadow-[0_4px_18px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:text-black hover:shadow-[0_8px_24px_rgba(0,0,0,0.20)]",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-pink shadow-md"
                >
                  <Check size={12} className="text-black" strokeWidth={3} />
                </span>
              )}
              <span>{t === "SHORT" ? "Short stay" : "Long stay"}</span>
              <span className={clsx("text-sm font-medium", active ? "text-black/60" : "text-black/45")}>
                <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>
                {t === "SHORT" ? "Up to 3 months" : "From 3 months"}
              </span>
            </button>
          );
        })}
      </div>
    </HeroBackdrop>
  );
}

/* ================================================================== */
/* OPTION C, Pre-selected LONG (Booking/Airbnb pattern)                 */
/*    LONG starts active by default (matches user's most common path  */
/*    + STACEY's main offering). SHORT solid+inviting next to it.    */
/*    Reduces "empty form" feeling, primes user toward main flow,     */
/*    SHORT remains explicitly clickable.                              */
/* ================================================================== */
function OptionC() {
  // Note the default value is "LONG", that's the smart-default
  const [stayType, setStayType] = useState<StayType>("LONG");
  return (
    <HeroBackdrop>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
        {(["SHORT", "LONG"] as StayType[]).map((t) => {
          const active = stayType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setStayType(t)}
              className={clsx(
                "relative w-full overflow-hidden rounded-[5px] px-8 py-4 text-base font-extrabold tracking-wide transition-all duration-200 sm:flex sm:w-auto sm:min-w-[220px] sm:flex-col sm:items-center sm:gap-1",
                active
                  ? "bg-pink text-black shadow-[0_8px_28px_rgba(252,176,192,0.45)]"
                  : "bg-white text-black/75 shadow-[0_4px_18px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:text-black hover:shadow-[0_8px_24px_rgba(0,0,0,0.20)]",
              )}
            >
              <span>{t === "SHORT" ? "Short stay" : "Long stay"}</span>
              <span className={clsx("text-sm font-medium", active ? "text-black/65" : "text-black/50")}>
                <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>
                {t === "SHORT" ? "Up to 3 months" : "From 3 months"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-white/55">
        ↑ LONG ist als Default vorausgewählt (Smart-Default-Pattern). SHORT bleibt
        klar klickbar als Alternative.
      </p>
    </HeroBackdrop>
  );
}

/* ================================================================== */
/* OPTION D, Both Always-Inviting (Glass + Strong Hover-Feel)          */
/*    Neither pre-selected. Both buttons start in a "looks like I can */
/*    be hovered" state: solid glass with strong ring + hint of      */
/*    interaction. No bias, but both feel ready-to-click.              */
/* ================================================================== */
function OptionD() {
  const [stayType, setStayType] = useState<StayType | null>(null);
  return (
    <HeroBackdrop>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
        {(["SHORT", "LONG"] as StayType[]).map((t) => {
          const active = stayType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setStayType(t)}
              className={clsx(
                "w-full rounded-[5px] px-8 py-4 text-base font-extrabold tracking-wide transition-all duration-200 sm:flex sm:w-auto sm:min-w-[220px] sm:flex-col sm:items-center sm:gap-1",
                active
                  ? "bg-white text-black ring-2 ring-pink shadow-[0_8px_28px_rgba(252,176,192,0.45)]"
                  : "bg-white/95 text-black ring-1 ring-white/60 shadow-[0_6px_22px_rgba(0,0,0,0.18)] backdrop-blur-sm hover:scale-[1.02] hover:ring-white",
              )}
            >
              <span>{t === "SHORT" ? "Short stay" : "Long stay"}</span>
              <span className={clsx("text-sm font-medium", active ? "text-black/60" : "text-black/55")}>
                <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>
                {t === "SHORT" ? "Up to 3 months" : "From 3 months"}
              </span>
            </button>
          );
        })}
      </div>
    </HeroBackdrop>
  );
}

/* ─── Page wrapper ───────────────────────────────────────────────── */

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · hero stay-type selector
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Alle SHORT/LONG-Konzepte zum Vergleich
        </h1>
        <p className="mt-3 text-sm text-gray">
          CURRENT als Baseline. Vier distinct Patterns drunter: bold
          color-split, solid-white-with-pink-active, pre-selected LONG
          (Booking/Airbnb), both-always-inviting. Klick die Buttons in
          jedem Block durch.
        </p>
      </div>

      <VariantLabel
        n="CURRENT"
        title="Aktueller Stand auf der Live-Seite"
        desc="Heavy white border, transparent inactive, bg-white active. hover:opacity-80 Anti-Pattern auf active state."
      />
      <Current />

      <VariantLabel
        n="A"
        title="Pink-Active Color Split"
        desc="Inactive bg-white text-black/80 (klar als Button erkennbar), Active bg-PINK text-black shadow-pink-glow. Maximale Brand-Energie, Active-State sofort erkennbar."
      />
      <OptionA />

      <VariantLabel
        n="B"
        title="Solid White + Pink-Ring + Check-Badge Active"
        desc="Beide solid-white. Inactive muted text-black/55, Active full-black + Pink-Ring + Pink-Check-Badge top-right. Hover lift auf inactive. Sehr klar, sehr button-y."
      />
      <OptionB />

      <VariantLabel
        n="C"
        title="Pre-selected LONG, Booking/Airbnb-Pattern"
        desc="LONG ist als Smart-Default vorausgewählt (matcht STACEY-Hauptpfad + Industry-Pattern von Booking/Airbnb). SHORT bleibt solid + klar klickbar als Alternative. Reduziert Empty-Form-Feeling."
        recommendation="Standard"
      />
      <OptionC />

      <VariantLabel
        n="D"
        title="Both Always-Inviting (no pre-select)"
        desc="Kein Pre-Select, aber beide Buttons starten in einem 'looks-hovered' State: solid bg-white, strong ring, shadow. Beide fühlen sich ready-to-click an. Active gets pink ring + glow."
      />
      <OptionD />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          Pick A, B, C oder D. Ich verdrahte die Wahl als Default in
          <code className="ml-1">SearchFields.tsx</code>.
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
