"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileText, Lock, Check } from "lucide-react";
import { clsx } from "clsx";
import FadeIn from "@/components/ui/FadeIn";

// Variant C, side-by-side product walkthrough. Three laptop frames in
// a row on desktop, three phone frames stacked on mobile. Inside each
// frame: an accurate mockup of the actual STACEY UI for that step,
// not a placeholder. Step 02 has a SHORT vs LONG toggle so a visitor
// sees both flows from one section.

/* ─── Device frames ───────────────────────────────────────────────── */

function LaptopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="rounded-[8px] border-[6px] border-[#1A1A1A] bg-[#1A1A1A] shadow-[0_24px_50px_rgba(0,0,0,0.22)]">
        <div className="aspect-[16/10] overflow-hidden rounded-[2px] bg-white">
          {children}
        </div>
      </div>
      <div className="mx-auto h-1.5 w-[107%] -translate-x-[3.27%] rounded-b-[8px] bg-gradient-to-b from-[#2a2a2a] to-[#0d0d0d] shadow-[0_6px_14px_rgba(0,0,0,0.15)]" />
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[220px]">
      <div className="overflow-hidden rounded-[28px] border-[7px] border-[#1A1A1A] bg-[#1A1A1A] shadow-[0_22px_44px_rgba(0,0,0,0.25)]">
        <div className="relative aspect-[9/19] bg-white">
          <span className="absolute left-1/2 top-1.5 z-10 h-3 w-14 -translate-x-1/2 rounded-full bg-[#1A1A1A]" />
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 01: /move-in search results (Hamburg LONG, 1 person) ───── */

const SEARCH_LOCATIONS = [
  {
    name: "Mühlenkamp",
    address: "Dorotheenstraße 3, Winterhude",
    img: "/images/locations/muehlenkamp/community/01-muehlenkamp.webp",
    rooms: [
      { name: "Mighty", price: 895, size: "8 m²", img: "/images/locations/muehlenkamp/jumbo/001-jumbo-mk.webp" },
      { name: "Premium", price: 1090, size: "13 m²", img: "/images/locations/muehlenkamp/premium/001-premium-mk.webp" },
    ],
  },
  {
    name: "St. Pauli",
    address: "Detlev-Bremer-Straße 2",
    img: "/images/locations/muehlenkamp/community/02-muehlenkamp.webp",
    rooms: [
      { name: "Mighty", price: 895, size: "8 m²", img: "/images/locations/muehlenkamp/community/03-muehlenkamp.webp" },
    ],
  },
];

function Screen01Browse() {
  return (
    <div className="flex h-full flex-col bg-[#FAFAFA] text-[7px]">
      {/* Sticky filter bar (matches the actual /move-in chrome) */}
      <div className="flex items-center justify-between border-b border-black/5 bg-white px-2 py-1.5">
        <div className="flex items-center gap-1">
          <span className="rounded-[2px] bg-pink px-1 py-0.5 font-mono text-[6px] font-black uppercase tracking-wider text-black">LONG</span>
          <span className="font-mono text-[7px] font-bold">Hamburg</span>
          <span className="text-gray">·</span>
          <span className="text-gray">1 person</span>
          <span className="text-gray">·</span>
          <span className="font-mono text-[7px] font-bold">15 May</span>
        </div>
        <span className="font-mono text-[6px] uppercase tracking-widest text-gray">Sort: price ↑</span>
      </div>

      {/* Locations stacked, each with rooms below */}
      <div className="flex-1 space-y-2 overflow-hidden p-2">
        {SEARCH_LOCATIONS.map((loc) => (
          <div key={loc.name} className="rounded-[3px] bg-white p-1.5 shadow-sm ring-1 ring-black/5">
            {/* Location row */}
            <div className="flex items-center gap-1.5">
              <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-[2px]">
                <Image src={loc.img} alt={loc.name} fill className="object-cover" sizes="24px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px] font-extrabold leading-tight">{loc.name}</p>
                <p className="truncate text-[6px] text-gray">{loc.address}</p>
              </div>
            </div>

            {/* Room category cards */}
            <div className="mt-1 grid grid-cols-2 gap-1">
              {loc.rooms.map((room) => (
                <div key={room.name} className="overflow-hidden rounded-[2px] bg-[#FAFAFA] ring-1 ring-black/5">
                  <div className="relative aspect-[16/9]">
                    <Image src={room.img} alt={room.name} fill className="object-cover" sizes="120px" />
                    <span className="absolute right-0.5 top-0.5 rounded-[1px] bg-pink px-0.5 py-0 text-[5px] font-black text-white">€{room.price}</span>
                  </div>
                  <div className="px-1 pb-1 pt-0.5">
                    <p className="text-[7px] font-bold leading-tight">{room.name}</p>
                    <p className="text-[6px] text-gray">{room.size}</p>
                  </div>
                </div>
              ))}
              {loc.rooms.length === 1 && <div className="aspect-[16/9] rounded-[2px] bg-[#FAFAFA]/50" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 02: SHORT booking summary OR LONG lease signing ───────── */

function Screen02SignShort() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-black/5 px-2 py-1.5">
        <p className="font-mono text-[6px] font-bold uppercase tracking-widest text-pink">Final step · short stay</p>
        <p className="text-[10px] font-black leading-tight">Confirm your booking</p>
      </div>
      <div className="flex-1 space-y-1 p-2">
        {/* Room summary */}
        <div className="flex items-center gap-1.5 rounded-[2px] bg-[#FAFAFA] p-1.5 ring-1 ring-black/5">
          <div className="relative h-6 w-8 flex-shrink-0 overflow-hidden rounded-[2px]">
            <Image src="/images/locations/muehlenkamp/jumbo/001-jumbo-mk.webp" alt="" fill className="object-cover" sizes="32px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[7px] font-bold leading-tight">Alster · Mighty</p>
            <p className="text-[6px] text-gray">12-17 May · 5 nights · 1 guest</p>
          </div>
        </div>
        {/* Price breakdown */}
        <div className="space-y-0.5 rounded-[2px] bg-white p-1.5 ring-1 ring-black/5">
          <div className="flex items-baseline justify-between text-[6px]">
            <span className="text-gray">€95 × 5 nights</span>
            <span className="font-mono font-bold">€475</span>
          </div>
          <div className="flex items-baseline justify-between text-[6px]">
            <span className="text-gray">City tax</span>
            <span className="font-mono font-bold">€19</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-dashed border-black/15 pt-0.5 text-[7px]">
            <span className="font-black">Total</span>
            <span className="font-mono font-black">€494</span>
          </div>
        </div>
      </div>
      {/* Sticky pay bar */}
      <div className="border-t border-black/5 bg-black p-1.5">
        <button className="w-full rounded-[2px] bg-pink py-1.5 text-[7px] font-black uppercase tracking-wider text-black">
          Pay €494 securely →
        </button>
        <p className="mt-1 text-center font-mono text-[5px] uppercase tracking-widest text-white/50">
          Powered by Stripe
        </p>
      </div>
    </div>
  );
}

function Screen02SignLong() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-black/5 px-2 py-1.5">
        <p className="font-mono text-[6px] font-bold uppercase tracking-widest text-pink">Step 2 of 3 · long stay</p>
        <p className="text-[10px] font-black leading-tight italic">Let&rsquo;s make it official</p>
      </div>
      <div className="flex-1 p-2">
        <div className="overflow-hidden rounded-[2px] bg-white ring-1 ring-black/5">
          {/* Doc header */}
          <div className="flex items-center gap-1 border-b border-black/5 bg-[#FAFAFA] px-1.5 py-1">
            <div className="flex h-3 w-2.5 items-center justify-center rounded-[1px] bg-white ring-1 ring-black/10">
              <FileText size={6} className="text-black" />
            </div>
            <div className="min-w-0">
              <p className="text-[6px] font-bold leading-tight">Lease agreement · PDF</p>
              <p className="text-[5px] text-gray">Personalized · generated now</p>
            </div>
          </div>
          {/* Body */}
          <div className="space-y-1 p-1.5">
            <div className="space-y-0.5">
              {[100, 90, 95, 70, 100, 85].map((w, i) => (
                <div key={i} className="h-0.5 rounded bg-black/8" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="flex items-center justify-between rounded-[1px] bg-[#FAFAFA] px-1 py-1">
              <span className="flex items-center gap-0.5 font-mono text-[5px] uppercase tracking-widest text-gray">
                <Lock size={6} /> Yousign · secure
              </span>
              <span className="font-mono text-[5px] font-bold text-pink">~2 min</span>
            </div>
            <button className="w-full rounded-[2px] bg-black py-1 text-[7px] font-black uppercase tracking-wider text-white">
              Open signing page →
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[5px] text-gray">
          €195 booking fee follows · deposit by email in 48h
        </p>
      </div>
    </div>
  );
}

function Step02Mockup({ stayType }: { stayType: "SHORT" | "LONG" }) {
  return stayType === "SHORT" ? <Screen02SignShort /> : <Screen02SignLong />;
}

/* ─── Step 03: Welcome email (no door code, mobile key reference) ── */

function Screen03Email() {
  return (
    <div className="flex h-full flex-col bg-[#F5F5F0]">
      <div className="flex items-center gap-1 border-b border-black/5 bg-white px-2 py-1">
        <span className="text-[8px] leading-none">←</span>
        <span className="font-mono text-[6px] uppercase tracking-widest text-gray">Inbox · 1 of 1</span>
      </div>
      <div className="border-b border-black/5 bg-white px-2 py-1.5">
        <p className="font-mono text-[6px] uppercase tracking-widest text-pink">From: hello@stacey.de</p>
        <p className="text-[9px] font-black leading-tight">Welcome home, Anna</p>
        <p className="font-mono text-[6px] text-gray">3 days until your move-in</p>
      </div>
      <div className="flex-1 space-y-1 overflow-hidden p-2">
        <p className="text-[7px] leading-snug text-black">See you Friday. Here&rsquo;s what you need.</p>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between rounded-[2px] bg-white px-1.5 py-1 ring-1 ring-black/5">
            <span className="font-mono text-[5px] uppercase tracking-widest text-gray">Address</span>
            <span className="font-mono text-[6px] font-bold">Dorotheenstr. 3</span>
          </div>
          <div className="flex items-center justify-between rounded-[2px] bg-white px-1.5 py-1 ring-1 ring-black/5">
            <span className="font-mono text-[5px] uppercase tracking-widest text-gray">Check-in</span>
            <span className="font-mono text-[6px] font-bold">Fri from 16:00</span>
          </div>
          <div className="flex items-center justify-between rounded-[2px] bg-white px-1.5 py-1 ring-1 ring-black/5">
            <span className="font-mono text-[5px] uppercase tracking-widest text-gray">Your key</span>
            <span className="font-mono text-[6px] font-bold">Salto Mobile app</span>
          </div>
        </div>
        <div className="rounded-[2px] bg-pink px-1.5 py-1 text-center">
          <p className="text-[5px] font-black uppercase tracking-wider text-black">Friday: house dinner, 8 PM</p>
        </div>
        <p className="text-[5px] leading-snug text-gray">
          Your community manager Lena will meet you in the lobby. Welcome to STACEY.
        </p>
      </div>
    </div>
  );
}

/* ─── Section ─────────────────────────────────────────────────────── */

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
      { stayType: "SHORT" as const, label: "Short", body: "Pay the full amount upfront. No booking fee, no deposit. Your room is confirmed instantly." },
      { stayType: "LONG" as const, label: "Long", body: "Sign your lease digitally and pay the €195 booking fee. Deposit (2× monthly rent) follows by email within 48 hours." },
    ],
  },
  {
    num: "03",
    title: "Move in",
    body: "Welcome email three days before your move-in with check-in details. Your key is unlocked in the Salto or Kiwi mobile app. Friday is the house dinner.",
    time: "Day one",
  },
];

type StepDef = (typeof STEPS)[number] & {
  splits?: { stayType: "SHORT" | "LONG"; label: string; body: string }[];
};

function StepBody({ step }: { step: StepDef }) {
  if (!step.splits) {
    return <p className="text-sm leading-relaxed text-gray">{step.body}</p>;
  }
  return (
    <div className="space-y-2">
      {step.splits.map((s) => (
        <div
          key={s.stayType}
          className="flex items-start gap-2 rounded-[5px] bg-white p-2.5 ring-1 ring-black/5"
        >
          <span
            className={clsx(
              "mt-0.5 flex-shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em]",
              s.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-black",
            )}
          >
            {s.label}
          </span>
          <p className="text-xs leading-relaxed text-gray">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function HowItWorksSection() {
  const [step02StayType, setStep02StayType] = useState<"SHORT" | "LONG">("LONG");

  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-7xl">
          {/* Editorial header, matches the rest of the site's DNA */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Three steps to <span className="italic font-light">home</span>.
            </h2>
            <p className="mt-3 text-sm text-gray sm:text-base">
              See exactly what you&rsquo;ll do at each stage. From sign-up to
              your first community dinner in less than two weeks.
            </p>
          </div>

          {/* Three steps, side by side on desktop, stacked on mobile.
              Each step has its real STACEY UI mocked up inside the
              device frame, plus the editorial caption underneath. */}
          <div className="mt-12 grid gap-12 sm:mt-16 lg:grid-cols-3 lg:gap-8">
            {/* Step 01 */}
            <article className="text-center">
              <div className="hidden lg:block">
                <LaptopFrame>
                  <Screen01Browse />
                </LaptopFrame>
              </div>
              <div className="lg:hidden">
                <PhoneFrame>
                  <Screen01Browse />
                </PhoneFrame>
              </div>
              <div className="mt-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {STEPS[0].num} · {STEPS[0].time}
                </p>
                <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  {STEPS[0].title}
                </h3>
                <div className="mx-auto mt-3 max-w-sm text-left">
                  <StepBody step={STEPS[0]} />
                </div>
              </div>
            </article>

            {/* Step 02 with SHORT/LONG toggle */}
            <article className="text-center">
              {/* Toggle sits above the device frame */}
              <div className="mb-3 flex justify-center">
                <div className="inline-flex rounded-[5px] bg-[#FAFAFA] p-1 ring-1 ring-black/10">
                  {(["SHORT", "LONG"] as const).map((t) => {
                    const isActive = step02StayType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setStep02StayType(t)}
                        className={clsx(
                          "rounded-[3px] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                          isActive
                            ? t === "SHORT"
                              ? "bg-black text-white shadow-sm"
                              : "bg-pink text-black shadow-sm"
                            : "text-black/50 hover:text-black",
                        )}
                      >
                        {t === "SHORT" ? "Short stay" : "Long stay"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:block">
                <LaptopFrame>
                  <Step02Mockup stayType={step02StayType} />
                </LaptopFrame>
              </div>
              <div className="lg:hidden">
                <PhoneFrame>
                  <Step02Mockup stayType={step02StayType} />
                </PhoneFrame>
              </div>
              <div className="mt-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {STEPS[1].num} · {STEPS[1].time}
                </p>
                <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  {STEPS[1].title}
                </h3>
                <div className="mx-auto mt-3 max-w-sm text-left">
                  <StepBody step={STEPS[1]} />
                </div>
              </div>
            </article>

            {/* Step 03 */}
            <article className="text-center">
              <div className="hidden lg:block">
                <LaptopFrame>
                  <Screen03Email />
                </LaptopFrame>
              </div>
              <div className="lg:hidden">
                <PhoneFrame>
                  <Screen03Email />
                </PhoneFrame>
              </div>
              <div className="mt-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {STEPS[2].num} · {STEPS[2].time}
                </p>
                <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  {STEPS[2].title}
                </h3>
                <div className="mx-auto mt-3 max-w-sm text-left">
                  <StepBody step={STEPS[2]} />
                </div>
              </div>
            </article>
          </div>

          {/* CTA */}
          <div className="mt-14 flex justify-center">
            <Link
              href="/move-in"
              className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              <Check size={14} />
              Start your move-in
              <ArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
