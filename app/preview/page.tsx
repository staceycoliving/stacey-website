"use client";

// Dev-only preview, three layouts for the homepage HowItWorks
// section. Same content (Pick your suite, Sign + pay, Move in) in
// distinct visual treatments. Open /preview manually.

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Pick your suite",
    body: "Browse cities, pick a room, choose your move-in date. Sign up online in about ten minutes. We hold your suite while you complete the next steps.",
    time: "~10 min",
  },
  {
    num: "02",
    title: "Sign + pay",
    body: "Sign your lease digitally, pay the €195 booking fee, and your room is locked in. For long stays the deposit of 2× monthly rent follows by email and is due within 48 hours.",
    time: "Same day",
  },
  {
    num: "03",
    title: "Move in",
    body: "Welcome email three days before your move-in with check-in details. Keys on day one, fridge stocked, sheets made. Friday is the house dinner.",
    time: "Day one",
  },
];

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

function SectionHeader() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
        How it works
      </p>
      <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
        Three steps to <span className="italic font-light">home</span>.
      </h2>
      <p className="mt-3 text-sm text-gray sm:text-base">
        From sign-up to your first community dinner in less than two weeks.
      </p>
    </div>
  );
}

function Cta() {
  return (
    <div className="mt-10 flex justify-center sm:mt-12">
      <Link
        href="/move-in"
        className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-80"
      >
        Start your move-in
        <ArrowRight
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

/* ================================================================== */
/* H1, Editorial 3-Col with Watermark Numbers
   Three clean cards in a 3-col grid. Each card has a huge translucent
   step number as a watermark behind the content, pink eyebrow,
   bold title, body, mono time caption. Closest to the existing site's
   card vocabulary (Receipts, Teasers); safe and premium.
/* ================================================================== */
function H1() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader />
        <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((s) => (
            <article
              key={s.num}
              className="group relative overflow-hidden rounded-[5px] bg-[#FAFAFA] p-6 ring-1 ring-black/5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-8"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-6 -right-2 select-none text-[140px] font-black leading-none tracking-tighter text-black/[0.05] sm:text-[180px]"
              >
                {s.num}
              </span>
              <div className="relative">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {s.num}
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray sm:text-base">
                  {s.body}
                </p>
                <p className="mt-6 inline-flex items-center gap-1.5 rounded-[3px] bg-black px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  {s.time}
                </p>
              </div>
            </article>
          ))}
        </div>
        <Cta />
      </div>
    </section>
  );
}

/* ================================================================== */
/* H2, Horizontal Pink-Line Timeline
   Three numbered nodes connected by a pink dashed line on desktop
   (vertical rail on mobile). Each node is a circle with the step
   number; the content sits in a clean card directly below. The line
   plus the circles read as a literal journey, which matches the
   homepage's "your journey to home" framing without aviation cosplay.
/* ================================================================== */
function H2() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader />

        <div className="relative mt-16 sm:mt-20">
          {/* Desktop: horizontal dashed line behind the circles */}
          <div
            aria-hidden
            className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px lg:block"
            style={{
              backgroundImage:
                "linear-gradient(to right, #FCB0C0 50%, transparent 50%)",
              backgroundSize: "12px 1px",
              backgroundRepeat: "repeat-x",
            }}
          />
          {/* Mobile: vertical dashed line on the left */}
          <div
            aria-hidden
            className="absolute bottom-0 left-7 top-7 w-px lg:hidden"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, #FCB0C0 50%, transparent 50%)",
              backgroundSize: "1px 12px",
              backgroundRepeat: "repeat-y",
            }}
          />

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-6">
            {STEPS.map((s) => (
              <div key={s.num} className="relative pl-20 lg:pl-0">
                {/* Numbered circle */}
                <span className="absolute left-0 top-0 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-black font-mono text-base font-black text-white ring-4 ring-white lg:left-1/2 lg:-translate-x-1/2">
                  {s.num}
                </span>
                {/* Card */}
                <div className="rounded-[5px] bg-[#FAFAFA] p-5 ring-1 ring-black/5 shadow-sm sm:p-6 lg:mt-20 lg:text-center">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
                    Step {s.num} · {s.time}
                  </p>
                  <h3 className="mt-2 text-xl font-black leading-tight tracking-tight sm:text-2xl">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Cta />
      </div>
    </section>
  );
}

/* ================================================================== */
/* H3, Vertical Bands with Giant Numbers
   Three full-width horizontal bands stacked. Left half: a massive
   01/02/03 in display weight. Right half: eyebrow, title, body,
   mono time caption. Magazine-spread feel. The boldest of the three,
   relies on whitespace and type weight rather than card chrome.
/* ================================================================== */
function H3() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader />
        <div className="mt-14 divide-y divide-black/10 sm:mt-16">
          {STEPS.map((s, i) => (
            <article
              key={s.num}
              className="grid items-center gap-6 py-10 sm:gap-10 sm:py-14 lg:grid-cols-[280px_1fr] lg:gap-16"
            >
              <div className="flex items-baseline gap-3 lg:block">
                <span className="block text-[120px] font-black leading-[0.8] tracking-tighter text-black sm:text-[180px] lg:text-[200px]">
                  {s.num}
                </span>
                {i === 0 && (
                  <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink lg:mt-3 lg:block">
                    Start
                  </span>
                )}
                {i === STEPS.length - 1 && (
                  <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink lg:mt-3 lg:block">
                    Home
                  </span>
                )}
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {s.num} · {s.time}
                </p>
                <h3 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                  {s.title}
                </h3>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-gray sm:text-lg">
                  {s.body}
                </p>
              </div>
            </article>
          ))}
        </div>
        <Cta />
      </div>
    </section>
  );
}

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · take 4
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          How it works,{" "}
          <span className="italic font-light">three layouts</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Drei Darstellungen der gleichen drei Steps (Pick your suite, Sign +
          pay, Move in). Selbe Content, unterschiedliche visuelle Wucht. Pick
          eine.
        </p>
      </div>

      <VariantLabel
        n="H1"
        title="Editorial 3-Col with Watermark Numbers"
        desc="Drei klare Cards in einer 3-col-Grid. Riesige translucent Stempelnummern als Watermark im Hintergrund, pink eyebrow, bold title, body, schwarzes Mono-Time-Pill. Konservativ, premium, passt zu Receipts und Teasers."
      />
      <H1 />

      <VariantLabel
        n="H2"
        title="Horizontal Pink-Line Timeline"
        desc="Drei Zahlen-Kreise auf einer pink gestrichelten Linie verbunden. Cards drunter. Auf Mobile vertikales Rail links. Liest als wörtliche Reise statt nur als Card-Grid."
      />
      <H2 />

      <VariantLabel
        n="H3"
        title="Vertical Bands with Giant Numbers"
        desc="Drei full-width Bänder gestapelt. Links riesige 01/02/03 in Display-Weight, rechts editorial Body. Magazin-Spread Feeling, lebt von Weißraum und Type-Weight. Mutigste Option."
      />
      <H3 />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          Pick H1, H2, oder H3. Ich verdrahte die Wahl als neuen Default.
        </p>
      </div>
    </main>
  );
}
