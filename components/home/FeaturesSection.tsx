"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

// "Do the math", receipt-vs-receipt section. Trimmed to Option B:
// rival line items have no sub-text, STACEY receipt drops the 7-bullet
// inclusions list (replaced with one sentence), no hover-pair, no
// fine-print footers, no "you bring" closer. Drama stays in the two
// big numbers + the savings ribbon.

const RIVAL_ITEMS: { label: string; price: number }[] = [
  { label: "1-bed apartment, Hamburg", price: 1100 },
  { label: "Furniture, amortised", price: 120 },
  { label: "Utilities", price: 180 },
  { label: "Internet", price: 40 },
  { label: "Weekly cleaning", price: 80 },
  { label: "Maintenance buffer", price: 60 },
];
const RIVAL_TOTAL = RIVAL_ITEMS.reduce((s, i) => s + i.price, 0); // 1580
// Hamburg Mighty category, cheapest Mighty room across our Hamburg
// LONG locations (Mühlenkamp, Eppendorf, St. Pauli all = 895). Source:
// lib/data.ts priceMonthly. Move-in admin / booking-fee NOT included on
// the rival side because STACEY also charges a one-time booking fee ,
// keeping that line in would make the comparison unfair.
const STACEY_TOTAL = 895;
const SAVINGS_MONTH = RIVAL_TOTAL - STACEY_TOTAL; // 685
const SAVINGS_YEAR = SAVINGS_MONTH * 12; // 8,220

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

// Animated count-up, triggers once the element enters the viewport.
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
          const eased = 1 - Math.pow(1 - t, 3);
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
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Almost everything <span className="italic font-light">included</span>.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            Seven bills against one. We&rsquo;ll keep this short.
          </p>
        </div>

        {/* Two receipts side by side; mobile stacks them with a pink
            VS badge in between for comparison read. */}
        <div className="relative mt-12 grid gap-4 sm:gap-6 lg:grid-cols-[1fr_1fr]">
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-[0_4px_18px_rgba(0,0,0,0.18)] lg:hidden"
          >
            vs
          </span>

          {/* RIVAL, itemised solo-rent receipt, struck through */}
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

            <ul className="mt-4 space-y-2.5">
              {RIVAL_ITEMS.map((it) => (
                <li
                  key={it.label}
                  className="grid grid-cols-[1fr_auto] gap-3 border-b border-black/5 pb-2.5 last:border-b-0 last:pb-0"
                >
                  <p className="text-sm font-bold leading-tight text-black/75 line-through decoration-pink decoration-2">
                    {it.label}
                  </p>
                  <p className="self-start font-mono text-sm font-bold text-black/55 line-through decoration-pink decoration-2">
                    €{fmt(it.price)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-baseline justify-between border-t-2 border-double border-black/30 pt-4">
              <p className="text-base font-black uppercase tracking-wide">Total</p>
              <p className="font-mono text-3xl font-black tabular-nums sm:text-4xl">
                €{fmt(rivalCount)}
              </p>
            </div>
          </div>

          {/* STACEY, single number, one suite. ALL-IN stamp + one
              clean sentence describes the absorbed inclusions. */}
          <div
            ref={staceyRef as (el: HTMLDivElement | null) => void}
            className="relative flex flex-col justify-between overflow-hidden rounded-[5px] bg-black p-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-8"
          >
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

              <p className="mt-10 text-sm font-medium uppercase tracking-[0.15em] text-white/60">
                Your move-in
              </p>
              <p className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                One private suite.{" "}
                <span className="italic font-light text-pink">Almost everything in.</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                Suite, utilities, internet, cleaning, maintenance, community, and
                free transfers between cities. All on the bill below.
              </p>
            </div>

            <div className="mt-10">
              <div className="flex items-baseline justify-between border-t-2 border-double border-white/30 pt-4">
                <p className="text-base font-black uppercase tracking-wide">Total</p>
                <p className="font-mono text-4xl font-black tabular-nums text-pink sm:text-5xl">
                  €{fmt(staceyCount)}
                </p>
              </div>
              <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                Our Mighty category · Hamburg
              </p>
            </div>
          </div>
        </div>

        {/* Pink savings ribbon, the punch line */}
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
          <Link
            href="/move-in"
            className="group inline-flex flex-shrink-0 items-center gap-2 rounded-[5px] bg-black px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-80"
          >
            Find your room
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Legal hedge, illustrative comparison only, not a binding
            quote. Solo-rent figures are typical Hamburg market values
            (Q1 2026); STACEY total is the cheapest Mighty room across
            our Hamburg LONG locations and excludes the one-time
            booking fee + deposit. Booking-fee was also stripped from
            the rival side to keep the monthly comparison apples-to-
            apples. */}
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] leading-relaxed text-gray">
          Illustrative comparison · non-binding. Solo-rent values reflect typical
          Hamburg market averages; the STACEY total is the cheapest Mighty room
          in our Hamburg LONG portfolio. Final pricing depends on suite, dates,
          and city. See <Link href="/move-in" className="underline decoration-pink underline-offset-2 hover:text-black">/move-in</Link> for binding offers. Booking fee and deposit
          apply separately.
        </p>
      </div>
    </section>
  );
}
