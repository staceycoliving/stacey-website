"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";
import FadeIn from "@/components/ui/FadeIn";

// Variant C, side-by-side product walkthrough. Three laptop frames
// in a row on desktop, stacked on mobile. Inside each frame: a real
// screenshot of the live STACEY UI for that step, captured via
// headless Chrome from /move-in (Step 01) and dedicated snap routes
// at /preview/snap/* (Step 02 SHORT, Step 02 LONG, Step 03 email).
// Step 02 has a SHORT vs LONG toggle so a visitor sees both flows.
// To re-capture: see scripts/howitworks-screenshots.sh (or the
// Chrome --headless commands documented in the section's commit).

/* ─── Device frame + screenshot helper ───────────────────────────── */

function LaptopFrame({
  src,
  alt,
  position = "top",
}: {
  src: string;
  alt: string;
  // Where to anchor the cover crop. The 1280x800 captures have content
  // that lands near the top, so we anchor there to avoid losing the
  // primary subject when the frame's aspect 16:10 trims the edges.
  position?: "top" | "center";
}) {
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
            {/* Step 01: real screenshot of /move-in (Hamburg LONG, 1 person) */}
            <article className="text-center">
              <LaptopFrame
                src="/images/howitworks/01-browse.webp"
                alt="STACEY move-in page showing Hamburg long-stay rooms"
                position="top"
              />
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

            {/* Step 02 with SHORT/LONG toggle, swaps the laptop screenshot */}
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

              <LaptopFrame
                src={
                  step02StayType === "SHORT"
                    ? "/images/howitworks/02-short.webp"
                    : "/images/howitworks/02-long.webp"
                }
                alt={
                  step02StayType === "SHORT"
                    ? "STACEY short-stay booking summary before payment"
                    : "STACEY long-stay lease signing screen"
                }
                position="center"
              />
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

            {/* Step 03: real welcome email screenshot */}
            <article className="text-center">
              <LaptopFrame
                src="/images/howitworks/03-email.webp"
                alt="STACEY welcome email with check-in details"
                position="top"
              />
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
