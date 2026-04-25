"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";

// "Do the math" — receipt-vs-receipt section. Replaces the old generic
// feature checklist. Drama is mathematical: seven struck-through line
// items adding up to the realistic cost of going solo, vs one number
// for STACEY (real cheapest Hamburg LONG suite, €795/mo). Each rival
// line item is paired with the corresponding STACEY inclusion via the
// `pair` field — hovering one highlights the other on the opposite
// receipt, so the reader can see, line by line, what gets absorbed.
// Totals count up when the section enters the viewport.

type RivalItem = {
  label: string;
  sub: string;
  price: number;
  pair: string; // matches STACEY_INCLUDES item.id — drives hover-pair highlight
};

const RIVAL_ITEMS: RivalItem[] = [
  { label: "1-bed apartment, Hamburg", sub: "median 1-room cold rent", price: 1100, pair: "suite" },
  { label: "Furniture, amortised", sub: "bed, desk, sofa, storage / 24 mo", price: 120, pair: "suite" },
  { label: "Utilities", sub: "power, water, heating", price: 180, pair: "utilities" },
  { label: "Fibre internet", sub: "100 Mbps, 24-month lock-in", price: 40, pair: "wifi" },
  { label: "Weekly cleaning", sub: "common areas, fortnightly minimum", price: 80, pair: "cleaning" },
  { label: "Maintenance buffer", sub: "your problem, your time, your money", price: 60, pair: "maintenance" },
  { label: "Move-in admin", sub: "Schufa, Anmeldung, broker, deposits", price: 90, pair: "move" },
];
const RIVAL_TOTAL = RIVAL_ITEMS.reduce((s, i) => s + i.price, 0); // 1670

const STACEY_TOTAL = 795; // real cheapest Hamburg LONG suite (lib/data.ts priceFrom)
const SAVINGS_MONTH = RIVAL_TOTAL - STACEY_TOTAL; // 875
const SAVINGS_YEAR = SAVINGS_MONTH * 12; // 10,500

const STACEY_INCLUDES: { id: string; label: string }[] = [
  { id: "suite", label: "Furnished private suite" },
  { id: "utilities", label: "Power, water, heating" },
  { id: "wifi", label: "Fibre WiFi" },
  { id: "cleaning", label: "Weekly cleaning" },
  { id: "maintenance", label: "On-call maintenance" },
  { id: "community", label: "Built-in community" },
  { id: "move", label: "Free transfers between cities" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

// Animated count-up. Triggers once the element enters the viewport.
// Uses rAF + ease-out so the number lands feeling rendered, not flicked.
function useCountUp(target: number, durationMs = 900): [number, (el: HTMLElement | null) => void] {
  const [value, setValue] = useState(0);
  const triggered = useRef(false);
  const setRef = (el: HTMLElement | null) => {
    if (!el || triggered.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!visible || triggered.current) return;
        triggered.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
          setValue(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
  };
  return [value, setRef];
}

export default function FeaturesSection() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [rivalCount, rivalRef] = useCountUp(RIVAL_TOTAL);
  const [staceyCount, staceyRef] = useCountUp(STACEY_TOTAL);
  const [savingsCount, savingsRef] = useCountUp(SAVINGS_YEAR);

  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Editorial header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Do the math
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            Seven bills against one. We&rsquo;ll keep this short.
          </p>
        </div>

        {/* Two receipts. Mobile stacks them; the pink "VS" badge below
            sits between for the comparison read. Desktop: side by side. */}
        <div className="relative mt-12 grid gap-4 sm:gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Mobile VS badge — only shows between the two receipts on
              mobile. Sits absolutely between rows of the grid. */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-[0_4px_18px_rgba(0,0,0,0.18)] lg:hidden"
          >
            vs
          </span>

          {/* RIVAL — itemised solo-rent receipt. Each line is struck
              through and dimmed; hovering it highlights the matched
              STACEY inclusion on the right. */}
          <div
            ref={rivalRef as (el: HTMLDivElement | null) => void}
            className="relative rounded-[5px] bg-white p-6 ring-1 ring-black/10 shadow-sm sm:p-8"
          >
            <div className="flex items-baseline justify-between border-b border-dashed border-black/15 pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray">
                Renting solo
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray">
                Hamburg · monthly
              </p>
            </div>

            <ul className="mt-4 space-y-2">
              {RIVAL_ITEMS.map((it) => {
                const isPaired = hovered === it.pair;
                return (
                  <li
                    key={it.label}
                    onMouseEnter={() => setHovered(it.pair)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(it.pair)}
                    onBlur={() => setHovered(null)}
                    tabIndex={0}
                    className={clsx(
                      "grid grid-cols-[1fr_auto] gap-3 rounded-[3px] border-b border-black/5 px-1.5 py-2 transition-colors last:border-b-0",
                      isPaired ? "bg-pink/10" : "hover:bg-black/[0.03]",
                    )}
                  >
                    <div>
                      <p
                        className={clsx(
                          "text-sm font-bold leading-tight line-through decoration-pink decoration-2",
                          isPaired ? "text-black" : "text-black/75",
                        )}
                      >
                        {it.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-gray">{it.sub}</p>
                    </div>
                    <p
                      className={clsx(
                        "self-start font-mono text-sm font-bold line-through decoration-pink decoration-2",
                        isPaired ? "text-black" : "text-black/55",
                      )}
                    >
                      €{fmt(it.price)}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 flex items-baseline justify-between border-t-2 border-double border-black/30 pt-4">
              <p className="text-base font-black uppercase tracking-wide">Total</p>
              <p className="font-mono text-3xl font-black tabular-nums sm:text-4xl">
                €{fmt(rivalCount)}
              </p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray">
              Plus 24-month contracts, three deposits, one Schufa-Auskunft, and an
              evening on hold with the internet provider.
            </p>
          </div>

          {/* STACEY — single number, one suite, everything in. The
              tilted pink "ALL-IN" stamp sits in the corner like an
              official seal. Inclusions list pulses on hover-pair. */}
          <div
            ref={staceyRef as (el: HTMLDivElement | null) => void}
            className="relative flex flex-col justify-between overflow-hidden rounded-[5px] bg-black p-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-8"
          >
            {/* Stamp */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-4 top-4 -rotate-12 rounded-[3px] border-2 border-pink/80 px-2 py-0.5"
            >
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-pink">
                All-in
              </p>
            </div>

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
              <p className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                One private suite.{" "}
                <span className="italic font-light text-pink">Everything in.</span>
              </p>

              {/* Inclusions list — each item has an id matching a rival
                  line item. Hovering the rival side highlights its
                  corresponding inclusion here with a pink pulse. */}
              <ul className="mt-5 space-y-1.5">
                {STACEY_INCLUDES.map((inc) => {
                  const isPaired = hovered === inc.id;
                  return (
                    <li
                      key={inc.id}
                      onMouseEnter={() => setHovered(inc.id)}
                      onMouseLeave={() => setHovered(null)}
                      className={clsx(
                        "flex items-center gap-2 rounded-[3px] px-1.5 py-1 text-sm transition-colors",
                        isPaired ? "bg-pink/15" : "hover:bg-white/[0.05]",
                      )}
                    >
                      <span
                        className={clsx(
                          "inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all",
                          isPaired ? "bg-pink scale-125" : "bg-pink/60",
                        )}
                      />
                      <span
                        className={clsx(
                          "flex-1 transition-colors",
                          isPaired ? "text-white" : "text-white/75",
                        )}
                      >
                        {inc.label}
                      </span>
                      {isPaired && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-pink">
                          ✓ in
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-8">
              <div className="flex items-baseline justify-between border-t-2 border-double border-white/30 pt-4">
                <p className="text-base font-black uppercase tracking-wide">Total</p>
                <p className="font-mono text-4xl font-black tabular-nums text-pink sm:text-5xl">
                  €{fmt(staceyCount)}
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                Cheapest Hamburg suite. From €{STACEY_TOTAL}/mo.
              </p>
            </div>
          </div>
        </div>

        {/* Savings ribbon — pink banner with the punch number(s).
            Sits below both receipts so the eye lands here last. */}
        <div
          ref={savingsRef as (el: HTMLDivElement | null) => void}
          className="mt-6 flex flex-col items-center gap-2 rounded-[5px] bg-pink px-6 py-5 text-center text-black shadow-[0_4px_18px_rgba(0,0,0,0.08)] sm:flex-row sm:justify-between sm:gap-6 sm:px-8 sm:text-left"
        >
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">
              You save
            </p>
            <p className="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              €{fmt(SAVINGS_MONTH)}/month.{" "}
              <span className="italic font-light">
                That&rsquo;s €<span className="tabular-nums">{fmt(savingsCount)}</span>/year.
              </span>
            </p>
          </div>
          <div className="text-xs leading-snug text-black/70 sm:max-w-[260px] sm:text-right">
            You skip seven contracts.<br />You start tomorrow.
          </div>
        </div>

        {/* "Almost" reveal — written like a footnote on the STACEY receipt */}
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-gray sm:text-base">
          You bring{" "}
          <span className="font-semibold text-black">your clothes</span>,{" "}
          <span className="font-semibold text-black">a toothbrush</span>, and{" "}
          <span className="font-semibold text-black">yourself</span>. We&rsquo;ve
          got the rest.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
          >
            Find your room
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
