"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";
import FadeIn from "@/components/ui/FadeIn";

// Variant C, side-by-side product walkthrough. Real screenshots of
// the live STACEY UI inside breakpoint-aware device frames: LaptopFrame
// at lg+ with the desktop captures, PhoneFrame on smaller screens with
// the mobile captures. Step 02 has a SHORT/LONG toggle. Step 03 swaps
// the device for a FramedPrint (clean photo card with caption) since
// move-in is the physical moment, not a screen.
//
// To re-capture screenshots:
// - Step 01 desktop: headless-chrome /move-in?stayType=LONG&city=hamburg&persons=1&moveIn=YYYY-MM-DD
// - Step 02 SHORT mobile: headless-chrome /preview/snap/sign-short at 400x820
// - Step 02 SHORT desktop: same route at 1280x800
// - Step 02 LONG and Step 01 mobile: captured manually for proper
//   responsive rendering. Stored in public/images/howitworks/.

/* ─── Frames: Laptop (lg+) and Phone (mobile) ───────────────────── */

function LaptopFrame({ src, alt, position = "top" }: { src: string; alt: string; position?: "top" | "center" }) {
  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="rounded-[8px] border-[6px] border-[#1A1A1A] bg-[#1A1A1A] shadow-[0_24px_50px_rgba(0,0,0,0.22)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[2px] bg-white">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            style={{ objectPosition: position === "top" ? "top center" : "center" }}
            sizes="(min-width: 1024px) 440px, 100vw"
          />
        </div>
      </div>
      <div className="mx-auto h-1.5 w-[107%] -translate-x-[3.27%] rounded-b-[8px] bg-gradient-to-b from-[#2a2a2a] to-[#0d0d0d] shadow-[0_6px_14px_rgba(0,0,0,0.15)]" />
    </div>
  );
}

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-[230px]">
      <div className="overflow-hidden rounded-[28px] border-[7px] border-[#1A1A1A] bg-[#1A1A1A] shadow-[0_22px_44px_rgba(0,0,0,0.25)]">
        <div className="relative aspect-[9/19] bg-white">
          <span className="absolute left-1/2 top-1.5 z-10 h-3 w-14 -translate-x-1/2 rounded-full bg-[#1A1A1A]" />
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            style={{ objectPosition: "top center" }}
            sizes="230px"
          />
        </div>
      </div>
    </div>
  );
}

// Responsive mockup: phone on mobile, laptop on desktop. Same total
// visual footprint as the row above so the three steps line up.
function ResponsiveMockup({
  desktop,
  mobile,
  alt,
  position = "top",
}: {
  desktop: string;
  mobile: string;
  alt: string;
  position?: "top" | "center";
}) {
  return (
    <>
      <div className="hidden lg:block">
        <LaptopFrame src={desktop} alt={alt} position={position} />
      </div>
      <div className="lg:hidden">
        <PhoneFrame src={mobile} alt={alt} />
      </div>
    </>
  );
}

// Step 03: clean framed-print card (no device bezel). Same outer
// dimensions and shadow profile as the laptop/phone frames so the
// row reads as visual triplets. The white print margin + mono caption
// signals "physical photo" not "screen".
function FramedPrint({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <>
      {/* Desktop: 16:10 framed photo, matches laptop footprint */}
      <div className="hidden lg:block">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="rounded-[8px] bg-white p-2.5 shadow-[0_24px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-black">
              <Image
                src={src}
                alt={alt}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 440px, 100vw"
              />
            </div>
            <p className="mt-2 px-1 pb-0.5 text-center font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-gray">
              {caption}
            </p>
          </div>
        </div>
      </div>
      {/* Mobile: 9:19 framed photo, matches phone footprint */}
      <div className="mx-auto w-[230px] lg:hidden">
        <div className="rounded-[16px] bg-white p-2 shadow-[0_22px_44px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
          <div className="relative aspect-[9/19] overflow-hidden rounded-[10px] bg-black">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
              sizes="230px"
            />
          </div>
          <p className="mt-1.5 px-1 pb-0.5 text-center font-mono text-[8px] font-bold uppercase tracking-[0.25em] text-gray">
            {caption}
          </p>
        </div>
      </div>
    </>
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
            <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold uppercase text-white">
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
            {/* Step 01: laptop on desktop, phone on mobile */}
            <article className="text-center">
              <ResponsiveMockup
                desktop="/images/howitworks/01-browse.webp"
                mobile="/images/howitworks/01-browse-mobile.webp"
                alt="STACEY move-in page showing Hamburg long-stay rooms"
                position="top"
              />
              <div className="mt-6">
                <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white">
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

            {/* Step 02 with SHORT/LONG toggle, swaps the screenshot. Both
                desktop and mobile sources update together. */}
            <article className="text-center">
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

              <ResponsiveMockup
                desktop={
                  step02StayType === "SHORT"
                    ? "/images/howitworks/02-short.webp"
                    : "/images/howitworks/02-long.webp"
                }
                mobile={
                  step02StayType === "SHORT"
                    ? "/images/howitworks/02-short-mobile.webp"
                    : "/images/howitworks/02-long-mobile.webp"
                }
                alt={
                  step02StayType === "SHORT"
                    ? "STACEY short-stay booking summary before payment"
                    : "STACEY long-stay lease signing screen"
                }
                position="top"
              />
              <div className="mt-6">
                <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white">
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

            {/* Step 03: framed photo print, no device frame. Move-in is
                the physical moment, not a screen. */}
            <article className="text-center">
              <FramedPrint
                src="/images/locations/eimsbuettel/community/001-community-ei.webp"
                alt="STACEY move-in day, common space"
                caption="Day one · welcome home"
              />
              <div className="mt-6">
                <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white">
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
