import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

// Boarding-pass-styled "How it works" section. Each step is a real
// boarding-pass shape with mono data fields (DEPARTURE / GATE / TIME),
// a perforated stub on the right with the step number, and a richer
// body than the previous 20-word stub. Aviation tonality matches the
// "your journey to home" framing and bridges the Map → Receipts pivot
// with a soft-sell beat.

type Pass = {
  num: string;
  label: string;
  title: string;
  body: string;
  from: string;
  to: string;
  time: string;
};

const PASSES: Pass[] = [
  {
    num: "01",
    label: "Departure",
    title: "Browse & sign up",
    body: "Pick a city, browse our suites, create a free account. Takes about ten minutes. No Schufa, no salary slip, no guarantor required up front. Just enough to know you. Hold a suite for 48 hours while you decide.",
    from: "Hesitation",
    to: "Discovery",
    time: "~10 min",
  },
  {
    num: "02",
    label: "Gate",
    title: "Pick your suite",
    body: "Within one working day, your community manager calls you. We&rsquo;ll walk through the suites available for your move-in date, answer the questions Google can&rsquo;t, and unlock our booking platform. Most members decide in 2 to 3 days.",
    from: "Discovery",
    to: "Decision",
    time: "1 to 3 days",
  },
  {
    num: "03",
    label: "Arrival",
    title: "Move in. Belong.",
    body: "Sign your lease digitally, transfer the deposit, pick up your keys on day one. The fridge is stocked, the sheets are made. By Friday&rsquo;s community dinner, you&rsquo;ll know half the house, and someone will already be planning the weekend.",
    from: "Decision",
    to: "Home",
    time: "Move-in day",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="relative bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      {/* Subtle aviation graph-paper backdrop. Lives behind the content
          to give the section a flight-deck feel without competing for
          attention. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1A1A1A 1px, transparent 1px), linear-gradient(to bottom, #1A1A1A 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <FadeIn>
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              <Plane size={11} className="-rotate-12" />
              Boarding pass · Your journey home
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Three stops to{" "}
              <span className="italic font-light">home</span>.
            </h2>
            <p className="mt-3 text-sm text-gray sm:text-base">
              One-way ticket. No layovers. No baggage fees. From sign-up to
              your first community dinner in less than two weeks.
            </p>
          </div>

          {/* Three boarding passes. On desktop a faint pink dotted
              flight-path SVG would connect them, but the visual rhythm
              of the cards already implies progression, keeping it
              clean here. */}
          <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 lg:grid-cols-3 lg:gap-6">
            {PASSES.map((p) => (
              <article
                key={p.num}
                className="relative overflow-hidden rounded-[5px] bg-[#FAFAFA] shadow-[0_2px_18px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
              >
                {/* Top header strip, mono labels, the boarding-pass header */}
                <div className="flex items-center justify-between bg-black px-4 py-2 text-white">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
                    Stacey · {p.label}
                  </p>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                    Pass {p.num}
                  </p>
                </div>

                {/* Main pass body + perforated stub on the right */}
                <div className="grid grid-cols-[1fr_auto]">
                  <div className="p-5 sm:p-6">
                    {/* Data fields row */}
                    <div className="grid grid-cols-3 gap-3 border-b border-dashed border-black/15 pb-4">
                      <div>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gray">
                          From
                        </p>
                        <p className="mt-0.5 font-mono text-[13px] font-bold uppercase text-black">
                          {p.from}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gray">
                          To
                        </p>
                        <p className="mt-0.5 font-mono text-[13px] font-bold uppercase text-black">
                          {p.to}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gray">
                          Time
                        </p>
                        <p className="mt-0.5 font-mono text-[13px] font-bold uppercase text-black">
                          {p.time}
                        </p>
                      </div>
                    </div>

                    {/* Title + body, the substance per step */}
                    <h3 className="mt-4 text-xl font-black leading-tight sm:text-2xl">
                      {p.title}
                    </h3>
                    <p
                      className="mt-2 text-sm leading-relaxed text-gray"
                      dangerouslySetInnerHTML={{ __html: p.body }}
                    />
                  </div>

                  {/* Stub, vertical, with big number + perforation */}
                  <div className="relative flex w-12 flex-col items-center justify-between border-l-2 border-dashed border-black/15 bg-[#F0F0F0] py-5 sm:w-16">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gray [writing-mode:vertical-rl]">
                      Pass {p.num}
                    </p>
                    <p className="text-3xl font-black text-black sm:text-4xl">
                      {p.num}
                    </p>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-pink [writing-mode:vertical-rl]">
                      {p.label}
                    </p>
                  </div>
                </div>

                {/* Perforation circles, punched into the divider edge */}
                <div className="pointer-events-none absolute right-12 top-9 h-3 w-3 -translate-x-1/2 rounded-full bg-white sm:right-16" />
                <div className="pointer-events-none absolute bottom-2 right-12 h-3 w-3 -translate-x-1/2 rounded-full bg-white sm:right-16" />
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3 sm:mt-14">
            <Link
              href="/move-in"
              className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              <Plane size={14} className="-rotate-12" />
              Board now
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray">
              Confirmed seats remaining · 23 across 8 homes
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
