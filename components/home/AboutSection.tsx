"use client";

import Image from "next/image";
import FadeIn from "@/components/ui/FadeIn";

// Team-story closer, mirrors the VideoSection split layout: editorial
// column left (eyebrow, headline, body, stat-strip), 16:9 team photo
// right with the press-logo strip stacked underneath it. Mobile
// collapses to a centered stack ending on the press strip.
//
// Press logo data + sizing matches the /partners page press bar so the
// brand reads consistent across pages.

const STATS = [
  { value: "8", label: "Homes" },
  { value: "3", label: "Cities" },
  { value: "295+", label: "Members" },
  { value: "2019", label: "Founded" },
];

// Press publications. Default URLs point at each publication's homepage,
// replace with concrete article URLs once we have them.
const PRESS = [
  { name: "Die Welt", src: "/images/press/die-welt.svg", url: "https://www.welt.de" },
  { name: "Hamburger Abendblatt", src: "/images/press/hamburger-abendblatt.svg", url: "https://www.abendblatt.de" },
  { name: "Handelsblatt", src: "/images/press/handelsblatt.svg", url: "https://www.handelsblatt.com" },
];

function StatStrip({ align = "center" }: { align?: "center" | "left" }) {
  return (
    <div
      className={
        align === "left"
          ? "grid max-w-md grid-cols-4 gap-3 sm:gap-4"
          : "mx-auto grid max-w-sm grid-cols-4 gap-3 sm:max-w-md sm:gap-4"
      }
    >
      {STATS.map((s, i) => (
        <div key={s.label} className="relative text-center">
          {i > 0 && (
            <span
              aria-hidden
              className="absolute -left-1.5 top-1 bottom-1 w-px bg-pink/30 sm:-left-2"
            />
          )}
          <p className="text-2xl font-black tracking-tight text-black sm:text-3xl">
            {s.value}
          </p>
          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink sm:text-[11px]">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function PressStrip() {
  return (
    <div>
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">
        As featured in
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:gap-x-12">
        {/* SVGs ship with fill="white" for use over dark backgrounds.
            On the light About section we invert them to black via
            brightness-0. Default opacity-60 reads as dezent grey, hover
            takes them to full black with a slight lift, which doubles
            as the click-affordance for the external article link. */}
        {PRESS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${p.name} article about STACEY (opens in new tab)`}
            className="group relative h-6 w-28 brightness-0 opacity-60 transition-all duration-300 hover:-translate-y-0.5 hover:opacity-100 sm:h-7 sm:w-32"
          >
            <Image src={p.src} alt={p.name} fill className="object-contain" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function AboutSection() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-6xl">
          {/* MOBILE, classic centered stack: pink chip → headline → body
              → stats → photo → press logos. No "Meet the team" CTA
              because that page does not exist yet. */}
          <div className="mx-auto max-w-3xl text-center lg:hidden">
            <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[11px] font-bold uppercase text-white">
              Hamburg · since 2019
            </p>
            <h2 className="mt-3 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
              Built by us, for the way{" "}
              <span className="italic font-light">we</span> wanted to live.
            </h2>
            <div className="mx-auto mt-5 max-w-md space-y-3.5 text-left text-sm leading-relaxed text-gray sm:text-base">
              <p>
                STACEY started in Hamburg, in 2019. Born from the friction
                of finding a flat: bureaucracy, scattered listings, high
                setup costs, and the wrong flatmates.
              </p>
              <p>
                We wanted shared apartments done properly. One hassle-free
                sign-up, design that feels like home, people you&rsquo;d
                actually want to share a kitchen with.
              </p>
              <p>
                We started with one apartment. Today, eight homes across
                three cities, with more on the way.
              </p>
            </div>

            <div className="mt-8">
              <StatStrip align="center" />
            </div>

            <div className="mt-8">
              <div className="relative aspect-video w-full overflow-hidden rounded-[8px] bg-black/5 ring-1 ring-black/12 shadow-[0_24px_60px_rgba(0,0,0,0.14)]">
                <Image
                  src="/images/stacey-team.webp"
                  alt="The STACEY team"
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            </div>

            <div className="mt-8">
              <PressStrip />
            </div>
          </div>

          {/* DESKTOP split: editorial column left, photo + press strip
              stacked in right column. */}
          <div className="mx-auto hidden max-w-6xl items-center gap-16 lg:grid lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                Hamburg · since 2019
              </p>

              <h2 className="mt-5 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
                Built by us, for the way{" "}
                <span className="italic font-light">we</span> wanted to live.
              </h2>

              <div className="mt-6 max-w-md space-y-4 text-base leading-relaxed text-gray">
                <p>
                  STACEY started in Hamburg, in 2019. Born from the friction
                  of finding a flat: bureaucracy, scattered listings, high
                  setup costs, and the wrong flatmates.
                </p>
                <p>
                  We wanted shared apartments done properly. One hassle-free
                  sign-up, design that feels like home, people you&rsquo;d
                  actually want to share a kitchen with.
                </p>
                <p>
                  We started with one apartment. Today, eight homes across
                  three cities, with more on the way.
                </p>
              </div>

              <div className="mt-8">
                <StatStrip align="left" />
              </div>
            </div>

            <div>
              <div className="relative block w-full overflow-hidden rounded-[8px] bg-black/5 ring-1 ring-black/12 shadow-[0_30px_80px_rgba(0,0,0,0.14)]">
                <div className="relative aspect-video">
                  <Image
                    src="/images/stacey-team.webp"
                    alt="The STACEY team"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 700px, 100vw"
                  />
                </div>
              </div>

              <div className="mt-10">
                <PressStrip />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
