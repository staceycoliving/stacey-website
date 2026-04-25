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
    body: "Sign your lease digitally and pay the €195 booking fee on the same day. Your room is locked in. For long stays the deposit of 2× monthly rent follows by email and is due within 48 hours.",
    time: "Same day + 48h for deposit",
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
          <LaptopFrame>
            <StepScreen idx={idx} />
          </LaptopFrame>
        </div>
        <div key={idx} className="mt-10 text-center" style={{ animation: "fadeSlide 0.4s ease-out" }}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Step {step.num} · {step.time}
          </p>
          <p className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {step.title}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray sm:text-base">{step.body}</p>
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
            <LaptopFrame>
              <StepScreen idx={idx} />
            </LaptopFrame>
          </div>
          <div key={`copy-${idx}`} style={{ animation: "fadeSlide 0.4s ease-out" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              Step {STEPS[idx].num}
            </p>
            <h3 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {STEPS[idx].title}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-gray">{STEPS[idx].body}</p>
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
              <LaptopFrame scale={0.65}>
                <StepScreen idx={i} />
              </LaptopFrame>
              <div className="mt-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                  Step {s.num} · {s.time}
                </p>
                <h3 className="mt-2 text-xl font-black leading-tight sm:text-2xl">
                  {s.title}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray">
                  {s.body}
                </p>
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
              <LaptopFrame>
                <StepScreen idx={activeIdx} />
              </LaptopFrame>
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
                <p className="mt-3 text-sm leading-relaxed text-gray sm:text-base">{s.body}</p>
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
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray">
                {STEPS[0].body}
              </p>
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
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray">
                {STEPS[1].body}
              </p>
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
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray">
                {STEPS[2].body}
              </p>
            </div>
          </div>
        </div>
        <Cta />
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
          Internal preview · take 5
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          How it works,{" "}
          <span className="italic font-light">five product walkthroughs</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Echte Steps mit Mockups der echten STACEY-UI (Browse, Sign + pay,
          Welcome email). Mockups sind Tailwind-gerendert, nicht abfotografiert
          aber match-up der finalen Seite. Pick eine Variante.
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

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          Pick A, B, C, D, oder E. Ich verdrahte als neuen Default.
        </p>
      </div>
    </main>
  );
}
