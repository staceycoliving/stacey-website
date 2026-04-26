"use client";

// Dev-only preview, five HowItWorks layouts using device-mockup
// product walkthroughs. Open /preview manually.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";

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
    body: "Confirm your booking. The flow differs by stay type.",
    time: "Same day",
    splits: [
      {
        stayType: "SHORT" as const,
        label: "Short",
        body: "Pay the full amount upfront. No booking fee, no deposit. Your room is confirmed instantly.",
      },
      {
        stayType: "LONG" as const,
        label: "Long",
        body: "Sign your lease digitally and pay the €195 booking fee. Deposit (2× monthly rent) follows by email within 48 hours.",
      },
    ],
  },
  {
    num: "03",
    title: "Move in",
    body: "Welcome email three days before your move-in with check-in details. Keys on day one, fridge stocked, sheets made. Friday is the house dinner.",
    time: "Day one",
  },
];

/* ─── Device frames ───────────────────────────────────────────────── */

function LaptopFrame({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  return (
    <div className="mx-auto" style={{ maxWidth: `${640 * scale}px` }}>
      <div className="rounded-[10px] border-[8px] border-[#1A1A1A] bg-[#1A1A1A] shadow-[0_30px_60px_rgba(0,0,0,0.25)]">
        <div className="aspect-[16/10] overflow-hidden rounded-[3px] bg-white">
          {children}
        </div>
      </div>
      <div className="mx-auto h-2 w-[107%] -translate-x-[3.27%] rounded-b-[10px] bg-gradient-to-b from-[#2a2a2a] to-[#0d0d0d] shadow-[0_8px_18px_rgba(0,0,0,0.18)]" />
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[200px]">
      <div className="overflow-hidden rounded-[28px] border-[7px] border-[#1A1A1A] bg-[#1A1A1A] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
        <div className="relative aspect-[9/19] bg-white">
          <span className="absolute left-1/2 top-1.5 z-10 h-3 w-14 -translate-x-1/2 rounded-full bg-[#1A1A1A]" />
          {children}
        </div>
      </div>
    </div>
  );
}

function Polaroid({ src, alt, caption, rotate = "rotate-2" }: { src: string; alt: string; caption: string; rotate?: string }) {
  return (
    <div className={clsx("bg-white p-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)]", rotate)}>
      <div className="relative aspect-square overflow-hidden">
        <Image src={src} alt={alt} fill className="object-cover" sizes="320px" />
      </div>
      <p className="mt-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-gray">
        {caption}
      </p>
    </div>
  );
}

/* ─── Screen content (mocked product UI) ──────────────────────────── */

function Screen01Browse() {
  // Mimics /move-in rooms grid: filter bar + room cards.
  const rooms = [
    { name: "Mühlenkamp", price: "795", img: "/images/locations/muehlenkamp/community/01-muehlenkamp.webp" },
    { name: "Eppendorf", price: "895", img: "/images/locations/muehlenkamp/community/02-muehlenkamp.webp" },
    { name: "St. Pauli", price: "795", img: "/images/locations/muehlenkamp/community/03-muehlenkamp.webp" },
  ];
  return (
    <div className="flex h-full flex-col bg-[#FAFAFA] p-3">
      <div className="flex items-center justify-between border-b border-black/5 pb-2">
        <span className="font-mono text-[8px] font-bold tracking-widest text-black">STACEY</span>
        <div className="flex gap-1">
          <span className="rounded-[3px] bg-black px-2 py-0.5 text-[8px] font-bold text-white">Hamburg</span>
          <span className="rounded-[3px] bg-white px-2 py-0.5 text-[8px] font-semibold text-black/60 ring-1 ring-black/10">Berlin</span>
          <span className="rounded-[3px] bg-white px-2 py-0.5 text-[8px] font-semibold text-black/60 ring-1 ring-black/10">Vallendar</span>
        </div>
        <span className="font-mono text-[8px] font-bold text-pink">8 homes</span>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-3 gap-1.5">
        {rooms.map((r) => (
          <div key={r.name} className="flex flex-col overflow-hidden rounded-[3px] bg-white shadow-sm ring-1 ring-black/5">
            <div className="relative aspect-[4/3] flex-shrink-0">
              <Image src={r.img} alt={r.name} fill className="object-cover" sizes="120px" />
              <span className="absolute bottom-1 left-1 rounded-[2px] bg-pink px-1 py-0.5 text-[7px] font-black text-black">LONG</span>
            </div>
            <div className="p-1.5">
              <p className="truncate text-[9px] font-bold leading-tight">{r.name}</p>
              <p className="mt-0.5 text-[7px] text-gray">from €{r.price}/mo</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-[3px] bg-black px-2 py-1.5 text-white">
        <span className="text-[8px] font-bold">Mighty room, 1 person</span>
        <span className="rounded-[2px] bg-pink px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-black">Continue →</span>
      </div>
    </div>
  );
}

function Screen02Sign() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-black/5 px-3 py-2">
        <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-pink">Step 2 of 3</p>
        <p className="text-[11px] font-black">Sign your lease</p>
      </div>
      <div className="flex flex-1 gap-3 p-3">
        <div className="flex-1 rounded-[3px] bg-[#FAFAFA] p-2 ring-1 ring-black/5">
          <div className="space-y-0.5">
            <p className="font-mono text-[7px] uppercase tracking-widest text-pink">Lease agreement</p>
            <p className="text-[9px] font-bold leading-tight">STACEY Mühlenkamp, Mighty room</p>
          </div>
          <div className="mt-2 space-y-1 text-[7px] leading-relaxed text-gray">
            <div className="h-0.5 w-full rounded bg-black/5" />
            <div className="h-0.5 w-full rounded bg-black/5" />
            <div className="h-0.5 w-[80%] rounded bg-black/5" />
            <div className="h-0.5 w-full rounded bg-black/5" />
            <div className="h-0.5 w-[70%] rounded bg-black/5" />
            <div className="h-0.5 w-full rounded bg-black/5" />
            <div className="h-0.5 w-[85%] rounded bg-black/5" />
          </div>
          <div className="mt-3 border-t border-dashed border-black/15 pt-2">
            <p className="font-mono text-[7px] uppercase tracking-widest text-gray">Signature</p>
            <p className="mt-0.5 font-serif text-[14px] italic text-pink">Anna M.</p>
          </div>
        </div>
        <div className="flex w-[40%] flex-col justify-between rounded-[3px] bg-black p-2 text-white">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-widest text-pink">Booking fee</p>
            <p className="mt-1 text-base font-black tabular-nums">€195</p>
            <p className="mt-0.5 text-[7px] text-white/60">One-time</p>
          </div>
          <div>
            <div className="flex items-center gap-1 rounded-[2px] bg-white p-1">
              <span className="h-2 w-3 rounded-[1px] bg-gradient-to-r from-pink to-orange-400" />
              <span className="font-mono text-[7px] text-black">•••• 4242</span>
            </div>
            <button className="mt-1 w-full rounded-[2px] bg-pink py-1 text-[8px] font-black uppercase tracking-wider text-black">
              Pay & confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen03Email() {
  return (
    <div className="flex h-full flex-col bg-[#F5F5F0]">
      <div className="flex items-center gap-2 border-b border-black/5 bg-white px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-yellow-400" />
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <span className="ml-2 font-mono text-[8px] text-gray">Inbox · 1 of 3</span>
      </div>
      <div className="flex flex-1 flex-col px-3 py-2">
        <p className="font-mono text-[7px] uppercase tracking-widest text-pink">From: hello@stacey.de</p>
        <p className="text-[10px] font-black leading-tight">Welcome home, Anna 🏠</p>
        <p className="mt-0.5 font-mono text-[7px] text-gray">3 days until your move-in</p>
        <div className="mt-2 flex-1 rounded-[3px] bg-white p-2 ring-1 ring-black/5">
          <p className="text-[8px] leading-relaxed text-black">
            See you Friday. Here&rsquo;s everything you need.
          </p>
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-1 rounded-[2px] bg-[#FAFAFA] px-1.5 py-1">
              <span className="font-mono text-[6px] uppercase tracking-widest text-gray">Address</span>
              <span className="ml-auto font-mono text-[7px] font-bold">Dorotheenstr. 3, HH</span>
            </div>
            <div className="flex items-center gap-1 rounded-[2px] bg-[#FAFAFA] px-1.5 py-1">
              <span className="font-mono text-[6px] uppercase tracking-widest text-gray">Check-in</span>
              <span className="ml-auto font-mono text-[7px] font-bold">Fri 16:00</span>
            </div>
            <div className="flex items-center gap-1 rounded-[2px] bg-[#FAFAFA] px-1.5 py-1">
              <span className="font-mono text-[6px] uppercase tracking-widest text-gray">Door code</span>
              <span className="ml-auto font-mono text-[7px] font-bold">7 4 2 1 #</span>
            </div>
          </div>
          <div className="mt-1.5 rounded-[2px] bg-pink px-1.5 py-1 text-center">
            <p className="text-[7px] font-black uppercase tracking-wider text-black">Friday: house dinner, 8 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepScreen({ idx }: { idx: number }) {
  if (idx === 0) return <Screen01Browse />;
  if (idx === 1) return <Screen02Sign />;
  return <Screen03Email />;
}

/* ─── Phone-format screens (mobile-native UI for the 9:19 aspect) ─ */

function PhoneScreen01Browse() {
  // Single-column room stack instead of the desktop 3-col grid; the
  // mobile /move-in view actually looks like this.
  const rooms = [
    { name: "Mühlenkamp", price: "795", city: "Hamburg", img: "/images/locations/muehlenkamp/community/01-muehlenkamp.webp" },
    { name: "Eppendorf", price: "895", city: "Hamburg", img: "/images/locations/muehlenkamp/community/02-muehlenkamp.webp" },
  ];
  return (
    <div className="flex h-full flex-col bg-[#FAFAFA]">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-[#FAFAFA] px-3 pt-4 pb-1 text-[7px] font-bold tabular-nums">
        <span>9:41</span>
        <span className="flex gap-0.5"><span>●●●</span><span>●●</span></span>
      </div>
      {/* App header */}
      <div className="flex items-center justify-between border-b border-black/5 bg-white px-2 py-1.5">
        <span className="font-mono text-[8px] font-black tracking-widest">STACEY</span>
        <span className="font-mono text-[7px] font-bold text-pink">8 homes</span>
      </div>
      {/* City tabs */}
      <div className="flex gap-1 bg-white px-2 py-1.5">
        <span className="rounded-[3px] bg-black px-1.5 py-0.5 text-[7px] font-black text-white">Hamburg</span>
        <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[7px] font-semibold text-black/50 ring-1 ring-black/10">Berlin</span>
        <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[7px] font-semibold text-black/50 ring-1 ring-black/10">Vallendar</span>
      </div>
      {/* Room cards stacked */}
      <div className="flex-1 space-y-1.5 overflow-hidden p-2">
        {rooms.map((r) => (
          <div key={r.name} className="overflow-hidden rounded-[3px] bg-white shadow-sm ring-1 ring-black/5">
            <div className="relative aspect-[16/9]">
              <Image src={r.img} alt={r.name} fill className="object-cover" sizes="180px" />
              <span className="absolute right-1 top-1 rounded-[2px] bg-pink px-1 py-0.5 text-[6px] font-black text-black">LONG</span>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[8px] font-bold leading-tight">{r.name}</p>
              <p className="mt-0.5 text-[7px] text-gray">from €{r.price}/mo</p>
            </div>
          </div>
        ))}
      </div>
      {/* Sticky bottom CTA */}
      <div className="border-t border-black/5 bg-white p-2">
        <div className="rounded-[3px] bg-black px-2 py-1.5 text-center">
          <span className="text-[7px] font-black uppercase tracking-wider text-white">Continue →</span>
        </div>
      </div>
    </div>
  );
}

function PhoneScreen02Sign() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between bg-[#FAFAFA] px-3 pt-4 pb-1 text-[7px] font-bold tabular-nums">
        <span>9:41</span>
        <span>●●● ●●</span>
      </div>
      <div className="border-b border-black/5 px-3 py-2">
        <p className="font-mono text-[7px] font-bold uppercase tracking-widest text-pink">Step 2 of 3</p>
        <p className="text-[10px] font-black leading-tight">Sign your lease</p>
      </div>
      {/* Document preview */}
      <div className="flex-1 space-y-1.5 overflow-hidden p-2">
        <div className="rounded-[3px] bg-[#FAFAFA] p-2 ring-1 ring-black/5">
          <p className="font-mono text-[6px] uppercase tracking-widest text-pink">Lease</p>
          <p className="text-[8px] font-bold leading-tight">Mühlenkamp · Mighty</p>
          <div className="mt-1.5 space-y-1">
            {[100, 90, 95, 70, 100, 85].map((w, i) => (
              <div key={i} className="h-0.5 rounded bg-black/10" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="mt-2 border-t border-dashed border-black/15 pt-1.5">
            <p className="font-mono text-[6px] uppercase tracking-widest text-gray">Sign here</p>
            <p className="font-serif text-[12px] italic leading-none text-pink">Anna M.</p>
          </div>
        </div>
      </div>
      {/* Sticky bottom: pay box */}
      <div className="border-t border-black/5 bg-black p-2 text-white">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[6px] uppercase tracking-widest text-pink">Booking fee</p>
          <p className="text-[10px] font-black tabular-nums">€195</p>
        </div>
        <button className="mt-1 w-full rounded-[2px] bg-pink py-1 text-[8px] font-black uppercase tracking-wider text-black">
          Pay & confirm
        </button>
      </div>
    </div>
  );
}

function PhoneScreen03Email() {
  return (
    <div className="flex h-full flex-col bg-[#F5F5F0]">
      <div className="flex items-center justify-between bg-[#F5F5F0] px-3 pt-4 pb-1 text-[7px] font-bold tabular-nums">
        <span>9:41</span>
        <span>●●● ●●</span>
      </div>
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-white px-2 py-1.5">
        <span className="text-[10px] leading-none">←</span>
        <span className="font-mono text-[7px] uppercase tracking-widest text-gray">Inbox</span>
      </div>
      <div className="border-b border-black/5 bg-white px-2 py-1.5">
        <p className="font-mono text-[6px] uppercase tracking-widest text-pink">From: hello@stacey.de</p>
        <p className="mt-0.5 text-[9px] font-black leading-tight">Welcome home, Anna 🏠</p>
        <p className="font-mono text-[6px] text-gray">3 days until move-in</p>
      </div>
      <div className="flex-1 space-y-1 overflow-hidden p-2">
        <p className="text-[8px] leading-snug text-black">See you Friday. Here&rsquo;s everything.</p>
        <div className="space-y-1">
          {[
            { l: "Address", v: "Dorotheenstr. 3" },
            { l: "Check-in", v: "Fri 16:00" },
            { l: "Door code", v: "7 4 2 1 #" },
          ].map((r) => (
            <div key={r.l} className="flex items-center justify-between rounded-[2px] bg-white px-1.5 py-1 ring-1 ring-black/5">
              <span className="font-mono text-[6px] uppercase tracking-widest text-gray">{r.l}</span>
              <span className="font-mono text-[7px] font-bold">{r.v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-[2px] bg-pink px-1.5 py-1 text-center">
          <p className="text-[6px] font-black uppercase tracking-wider text-black">Friday: house dinner, 8 PM</p>
        </div>
      </div>
    </div>
  );
}

function PhoneStepScreen({ idx }: { idx: number }) {
  if (idx === 0) return <PhoneScreen01Browse />;
  if (idx === 1) return <PhoneScreen02Sign />;
  return <PhoneScreen03Email />;
}

// Responsive device frame: laptop on desktop (lg+), phone on mobile.
// User on a phone sees a phone, user on a laptop sees a laptop —
// preserves the "see what you'll do" promise of the section.
function ResponsiveDevice({ idx, scale = 1 }: { idx: number; scale?: number }) {
  return (
    <>
      <div className="hidden lg:block">
        <LaptopFrame scale={scale}>
          <StepScreen idx={idx} />
        </LaptopFrame>
      </div>
      <div className="lg:hidden">
        <PhoneFrame>
          <PhoneStepScreen idx={idx} />
        </PhoneFrame>
      </div>
    </>
  );
}

/* ─── Shared section header ──────────────────────────────────────── */

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
        See exactly what you&rsquo;ll do at each stage. From sign-up to your
        first community dinner in less than two weeks.
      </p>
    </div>
  );
}

type StepSplit = { stayType: "SHORT" | "LONG"; label: string; body: string };
type Step = (typeof STEPS)[number] & { splits?: StepSplit[] };

// Renders either the unified body text or, when `splits` is present
// (Step 02), a SHORT/LONG comparison row with the same badge style
// used everywhere else on the site (black for SHORT, pink for LONG).
function StepBody({ step, align = "left" }: { step: Step; align?: "left" | "center" }) {
  if (!step.splits) {
    return (
      <p
        className={clsx(
          "text-sm leading-relaxed text-gray sm:text-base",
          align === "center" && "mx-auto max-w-xl",
        )}
      >
        {step.body}
      </p>
    );
  }
  return (
    <div
      className={clsx(
        "space-y-2.5",
        align === "center" && "mx-auto max-w-xl text-left",
      )}
    >
      {step.splits.map((s) => (
        <div
          key={s.stayType}
          className="flex items-start gap-2.5 rounded-[5px] bg-[#FAFAFA] p-3 ring-1 ring-black/5"
        >
          <span
            className={clsx(
              "mt-0.5 flex-shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em]",
              s.stayType === "SHORT"
                ? "bg-black text-white"
                : "bg-pink text-black",
            )}
          >
            {s.label}
          </span>
          <p className="text-sm leading-relaxed text-gray">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

function Cta() {
  return (
    <div className="mt-12 flex justify-center">
      <Link
        href="/move-in"
        className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white hover:opacity-80"
      >
        Start your move-in
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
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

/* ================================================================== */
/* A, Laptop carousel (auto-cycle)                                    */
/* ================================================================== */
function VariantA() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % STEPS.length), 5000);
    return () => clearInterval(t);
  }, []);
  const step = STEPS[idx];
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <SectionHeader />
        <div className="mt-12">
          <ResponsiveDevice idx={idx} />
        </div>
        <div key={idx} className="mt-10 text-center" style={{ animation: "fadeSlide 0.4s ease-out" }}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Step {step.num} · {step.time}
          </p>
          <p className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {step.title}
          </p>
          <div className="mt-3">
            <StepBody step={step} align="center" />
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Step ${i + 1}`}
              className={clsx(
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-8 bg-black" : "w-1.5 bg-black/20 hover:bg-black/40",
              )}
            />
          ))}
        </div>
        <Cta />
      </div>
    </section>
  );
}

/* ================================================================== */
/* B, Interactive click-through                                       */
/* ================================================================== */
function VariantB() {
  const [idx, setIdx] = useState(0);
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader />
        <div className="mt-12 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {STEPS.map((s, i) => {
            const isActive = idx === i;
            return (
              <button
                key={s.num}
                onClick={() => setIdx(i)}
                className={clsx(
                  "group rounded-[5px] p-4 text-left transition-all sm:p-5",
                  isActive
                    ? "bg-black text-white shadow-md"
                    : "bg-[#FAFAFA] text-black ring-1 ring-black/5 hover:ring-black/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-black",
                      isActive ? "bg-pink text-black" : "bg-black text-white",
                    )}
                  >
                    {s.num}
                  </span>
                  <span
                    className={clsx(
                      "font-mono text-[10px] font-bold uppercase tracking-[0.2em]",
                      isActive ? "text-pink" : "text-gray",
                    )}
                  >
                    {s.time}
                  </span>
                </div>
                <p className="mt-3 text-lg font-black leading-tight">{s.title}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div key={idx} style={{ animation: "fadeSlide 0.4s ease-out" }}>
            <ResponsiveDevice idx={idx} />
          </div>
          <div key={`copy-${idx}`} style={{ animation: "fadeSlide 0.4s ease-out" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              Step {STEPS[idx].num}
            </p>
            <h3 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {STEPS[idx].title}
            </h3>
            <div className="mt-4">
              <StepBody step={STEPS[idx]} />
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              <Check size={11} />
              {STEPS[idx].time}
            </div>
          </div>
        </div>
        <Cta />
      </div>
    </section>
  );
}

/* ================================================================== */
/* C, Three laptops side by side                                      */
/* ================================================================== */
function VariantC() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader />
        <div className="mt-12 grid gap-10 sm:mt-14 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((s, i) => (
            <div key={s.num} className="text-center">
              <ResponsiveDevice idx={i} scale={0.65} />
              <div className="mt-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {s.num} · {s.time}
                </p>
                <h3 className="mt-2 text-xl font-black leading-tight sm:text-2xl">
                  {s.title}
                </h3>
                <div className="mx-auto mt-3 max-w-sm">
                  <StepBody step={s} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Cta />
      </div>
    </section>
  );
}

/* ================================================================== */
/* D, Sticky scroll storytelling                                      */
/* ================================================================== */
function VariantD() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const i = Number(visible.target.getAttribute("data-step"));
        if (!Number.isNaN(i)) setActiveIdx(i);
      },
      { threshold: [0.5, 0.75, 1] },
    );
    stepRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader />
        <div ref={containerRef} className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div key={activeIdx} style={{ animation: "fadeSlide 0.4s ease-out" }}>
              <ResponsiveDevice idx={activeIdx} />
            </div>
            <div className="mt-6 flex justify-center gap-2">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    "h-1.5 rounded-full transition-all",
                    i === activeIdx ? "w-8 bg-black" : "w-1.5 bg-black/15",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="space-y-12 lg:py-20">
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                ref={(el) => { stepRefs.current[i] = el; }}
                data-step={i}
                className={clsx(
                  "rounded-[5px] border-l-2 p-5 transition-all sm:p-6",
                  activeIdx === i
                    ? "border-pink bg-[#FAFAFA] shadow-sm"
                    : "border-black/10 opacity-60",
                )}
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {s.num} · {s.time}
                </p>
                <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  {s.title}
                </h3>
                <div className="mt-3">
                  <StepBody step={s} />
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
/* E, Mixed devices (mobile + laptop + polaroid)                      */
/* ================================================================== */
function VariantE() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader />
        <div className="mt-14 grid gap-12 lg:grid-cols-3 lg:gap-8">
          {/* Step 1, mobile */}
          <div className="text-center">
            <div className="flex justify-center">
              <PhoneFrame>
                <StepScreen idx={0} />
              </PhoneFrame>
            </div>
            <div className="mt-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Step 01 · {STEPS[0].time}
              </p>
              <h3 className="mt-2 text-2xl font-black leading-tight">{STEPS[0].title}</h3>
              <div className="mx-auto mt-3 max-w-sm">
                <StepBody step={STEPS[0]} />
              </div>
            </div>
          </div>
          {/* Step 2, laptop */}
          <div className="text-center">
            <LaptopFrame scale={0.7}>
              <StepScreen idx={1} />
            </LaptopFrame>
            <div className="mt-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Step 02 · {STEPS[1].time}
              </p>
              <h3 className="mt-2 text-2xl font-black leading-tight">{STEPS[1].title}</h3>
              <div className="mx-auto mt-3 max-w-sm">
                <StepBody step={STEPS[1]} />
              </div>
            </div>
          </div>
          {/* Step 3, polaroid */}
          <div className="text-center">
            <div className="mx-auto max-w-[260px]">
              <Polaroid
                src="/images/locations/muehlenkamp/community/05-muehlenkamp.webp"
                alt="Move-in day"
                caption="Day one · welcome home"
                rotate="-rotate-2"
              />
            </div>
            <div className="mt-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Step 03 · {STEPS[2].time}
              </p>
              <h3 className="mt-2 text-2xl font-black leading-tight">{STEPS[2].title}</h3>
              <div className="mx-auto mt-3 max-w-sm">
                <StepBody step={STEPS[2]} />
              </div>
            </div>
          </div>
        </div>
        <Cta />
      </div>
    </section>
  );
}

/* ================================================================== */
/* F, B-pattern with lifestyle photo for Step 03                      */
/*    Click-through tabs same as B; mockups for Browse + Sign; Step 3 */
/*    swaps to a real STACEY community photo. Best practice + brand   */
/*    fit (people-first closer instead of another mockup).            */
/* ================================================================== */
function VariantF() {
  const [idx, setIdx] = useState(0);
  const step3Photo = "/images/locations/eimsbuettel/community/001-community-ei.webp";
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader />
        <div className="mt-12 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {STEPS.map((s, i) => {
            const isActive = idx === i;
            return (
              <button
                key={s.num}
                onClick={() => setIdx(i)}
                className={clsx(
                  "group rounded-[5px] p-4 text-left transition-all sm:p-5",
                  isActive
                    ? "bg-black text-white shadow-md"
                    : "bg-[#FAFAFA] text-black ring-1 ring-black/5 hover:ring-black/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-black",
                      isActive ? "bg-pink text-black" : "bg-black text-white",
                    )}
                  >
                    {s.num}
                  </span>
                  <span
                    className={clsx(
                      "font-mono text-[10px] font-bold uppercase tracking-[0.2em]",
                      isActive ? "text-pink" : "text-gray",
                    )}
                  >
                    {s.time}
                  </span>
                </div>
                <p className="mt-3 text-lg font-black leading-tight">{s.title}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div key={idx} style={{ animation: "fadeSlide 0.4s ease-out" }}>
            {idx === 2 ? (
              // Step 03 = real photo, not a mockup
              <div className="relative aspect-[16/10] overflow-hidden rounded-[5px] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                <Image
                  src={step3Photo}
                  alt="Move-in day at STACEY"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 760px, 100vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
                    Day one · welcome home
                  </p>
                  <p className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    Friday is the house dinner.
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveDevice idx={idx} />
            )}
          </div>
          <div key={`copy-${idx}`} style={{ animation: "fadeSlide 0.4s ease-out" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              Step {STEPS[idx].num}
            </p>
            <h3 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {STEPS[idx].title}
            </h3>
            <div className="mt-4">
              <StepBody step={STEPS[idx]} />
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              <Check size={11} />
              {STEPS[idx].time}
            </div>
          </div>
        </div>
        <Cta />
      </div>
    </section>
  );
}

/* ================================================================== */
/* G, All lifestyle photos, no UI mockups                             */
/*    Three real STACEY photos as the visual carrier per step. Step  */
/*    numbers, captions, and bodies overlay or sit beneath. Pure     */
/*    people-first; no tech-demo language.                           */
/* ================================================================== */
function VariantG() {
  const photos = [
    {
      src: "/images/locations/muehlenkamp/community/02-muehlenkamp.webp",
      alt: "Browse a STACEY home",
    },
    {
      src: "/images/locations/muehlenkamp/jumbo/001-jumbo-mk.webp",
      alt: "Your private suite",
    },
    {
      src: "/images/locations/eimsbuettel/community/001-community-ei.webp",
      alt: "Move-in day at STACEY",
    },
  ];
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader />
        <div className="mt-12 grid gap-5 sm:mt-14 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((s, i) => (
            <article key={s.num} className="group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[5px] bg-black shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <Image
                  src={photos[i].src}
                  alt={photos[i].alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white font-mono text-base font-black text-black shadow-md sm:h-14 sm:w-14 sm:text-lg">
                  {s.num}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
                    Step {s.num} · {s.time}
                  </p>
                  <h3 className="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                    {s.title}
                  </h3>
                </div>
              </div>
              <div className="mt-4">
                <StepBody step={s} />
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
/* H, Editorial cards, no devices, no photos                          */
/*    Pure typography + step numbers + body copy. Clean, fast,        */
/*    leaves Receipts and Map as the section's tech-demo moments.     */
/* ================================================================== */
function VariantH() {
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
                className="pointer-events-none absolute -bottom-8 -right-2 select-none text-[160px] font-black leading-none tracking-tighter text-black/[0.05] sm:text-[200px]"
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
                <div className="mt-4">
                  <StepBody step={s} />
                </div>
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
/* I, Scroll-pinned step-through (B + Apple-style scrolljacking)      */
/*    Section is ~300vh tall; the inner layout sticks to the          */
/*    viewport while scroll progress drives which step is active.    */
/*    User can't skip the section without seeing all three. Tabs     */
/*    remain clickable as a jump fallback. Mobile falls back to a    */
/*    normal stacked render so we don't fight touch gestures.        */
/* ================================================================== */
function VariantI() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handle = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollableHeight = rect.height - window.innerHeight;
      if (scrollableHeight <= 0) return;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / scrollableHeight));
      setProgress(p);
      const newIdx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      setIdx((prev) => (prev === newIdx ? prev : newIdx));
    };
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        handle();
        raf = 0;
      });
    };
    handle();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", handle);
    };
  }, []);

  const scrollToStep = (i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    const scrollable = rect.height - window.innerHeight;
    // Land slightly past the start of the step's slice so the index
    // settles on it cleanly (avoid boundary thrash).
    const targetProgress = i / STEPS.length + 0.05;
    const targetY = sectionTop + scrollable * targetProgress;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} className="relative bg-white" style={{ height: "300vh" }}>
      {/* Mobile fallback: just render Variant B normally so we don't
          fight touch scroll. Hidden lg+ uses the sticky scrolljack. */}
      <div className="lg:hidden">
        <VariantB />
      </div>

      <div className="sticky top-0 hidden h-screen items-center overflow-hidden px-4 sm:px-6 lg:flex lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <SectionHeader />

          {/* Progress bar that fills as you scroll the section */}
          <div className="mx-auto mt-6 h-0.5 w-full max-w-2xl overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full bg-pink transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Step tabs, scroll-driven active state */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((s, i) => {
              const isActive = idx === i;
              return (
                <button
                  key={s.num}
                  onClick={() => scrollToStep(i)}
                  className={clsx(
                    "group rounded-[5px] p-3 text-left transition-all",
                    isActive
                      ? "bg-black text-white shadow-md"
                      : "bg-[#FAFAFA] text-black ring-1 ring-black/5 hover:ring-black/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-black",
                        isActive ? "bg-pink text-black" : "bg-black text-white",
                      )}
                    >
                      {s.num}
                    </span>
                    <span
                      className={clsx(
                        "font-mono text-[9px] font-bold uppercase tracking-[0.2em]",
                        isActive ? "text-pink" : "text-gray",
                      )}
                    >
                      {s.time}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-black leading-tight">{s.title}</p>
                </button>
              );
            })}
          </div>

          {/* Device + body, swap with active step */}
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
            <div key={`device-${idx}`} style={{ animation: "fadeSlide 0.4s ease-out" }}>
              <ResponsiveDevice idx={idx} />
            </div>
            <div key={`copy-${idx}`} style={{ animation: "fadeSlide 0.4s ease-out" }}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Step {STEPS[idx].num}
              </p>
              <h3 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {STEPS[idx].title}
              </h3>
              <div className="mt-4">
                <StepBody step={STEPS[idx]} />
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                <Check size={11} />
                {STEPS[idx].time}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Page wrapper ───────────────────────────────────────────────── */

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · take 6
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          How it works,{" "}
          <span className="italic font-light">eight directions</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          A-E nutzen UI-Mockups der echten STACEY-UI in Device-Frames.
          F-H probieren brand-fit Alternativen: Lifestyle-Fotos statt
          (oder zusätzlich zu) Mockups, oder ganz ohne Devices.
        </p>
      </div>

      <VariantLabel
        n="A"
        title="Laptop Carousel (auto-cycle)"
        desc="Ein Laptop, drei Screens cyclen alle 5s. Pagination-Dots klickbar. Apple-clean, passiv konsumierbar."
      />
      <VariantA />

      <VariantLabel
        n="B"
        title="Interactive Click-Through"
        desc="Drei Step-Tabs oben, klickbar. Laptop-Mockup links, Body-Text rechts wechselt synchron. Engagement-stark wie ein Produkt-Demo."
      />
      <VariantB />

      <VariantLabel
        n="C"
        title="Three Laptops Side-by-Side"
        desc="Drei Laptops nebeneinander, jeder mit seinem Screen + Caption. Statisch parallel, alles auf einen Blick scanbar. Solider Klassiker."
      />
      <VariantC />

      <VariantLabel
        n="D"
        title="Sticky Scroll Storytelling"
        desc="Laptop pinned links, Step-Cards rechts scrollen vorbei. Aktive Card highlighted, Laptop-Screen wechselt mit. Apple-style scrollytelling."
      />
      <VariantD />

      <VariantLabel
        n="E"
        title="Mixed Devices (mobile + laptop + polaroid)"
        desc="Step 1 als Mobile-Phone (Browse), Step 2 als Laptop (Sign), Step 3 als Polaroid (Move-in Foto). Editorial, magazin-spread, mutigste Variante."
      />
      <VariantE />

      <VariantLabel
        n="F"
        title="Click-Through + Lifestyle Photo for Step 03 (best practice + brand fit)"
        desc="Wie B (Click-Through Tabs), aber Step 03 swappt Mockup gegen ein echtes STACEY-Foto vom Common Space. Closer wird emotional/people-first statt noch ein UI-Screen. Mein favorisierter Hybrid."
      />
      <VariantF />

      <VariantLabel
        n="G"
        title="All Lifestyle Photos, no UI mockups"
        desc="Drei echte STACEY-Fotos in 3-col Grid mit Step-Number-Bubbles. Pure people-first, keine tech-demo Sprache. Lässt Receipts + Map als die einzigen 'tech demos' der Seite stehen."
      />
      <VariantG />

      <VariantLabel
        n="H"
        title="Editorial Cards, no devices, no photos"
        desc="Drei klare Cards mit riesigen Watermark-Numbers, Title, Body. Keine Devices, keine Photos. Schnellste, sauberste Lösung. Airbnb-style, fast forschungs-zen."
      />
      <VariantH />

      <VariantLabel
        n="I"
        title="Scroll-Pinned Step-Through (B + Apple-style scrolljacking)"
        desc="Section ist 300vh hoch, der Inhalt sticky-pinned. Während du scrollst bleibt die Seite stehen und steppt durch alle drei Steps durch. User kann nicht skippen ohne alles gesehen zu haben. Tabs bleiben klickbar als Jump-Fallback. Mobile fällt auf normales B-Layout zurück."
      />
      <VariantI />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          Pick A bis I. Ich verdrahte die Wahl als neuen Default.
        </p>
      </div>
    </main>
  );
}
