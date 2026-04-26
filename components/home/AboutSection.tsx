"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

// Team-story closer, mirrors the VideoSection split layout: editorial
// column left (eyebrow, headline, body, CTA), 16:9 team photo right
// with the same card chrome as the video player. Mobile collapses to a
// classic centered stack.
//
// The member-interview strip used to live at the bottom of this section,
// it now lives in MemberStoriesSection right before the FinalCtaSection
// so social proof lands immediately before the conversion ask.

export default function AboutSection() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-7xl">
          {/* MOBILE, classic centered stack mirroring the VideoSection
              mobile pattern: pink chip → headline → body → photo → CTA. */}
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

            <Link
              href="/why-stacey"
              className="group mt-8 inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-80"
            >
              Meet the team
              <ArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          {/* DESKTOP split, mirrors the VideoSection layout: editorial
              column left, 16:9 team photo right. */}
          <div className="mx-auto hidden max-w-7xl items-center gap-16 lg:grid lg:grid-cols-[1fr_1.15fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="block h-8 w-[3px] rounded-full bg-pink" />
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-pink">
                  Hamburg · since 2019
                </p>
              </div>

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

              <Link
                href="/why-stacey"
                className="group mt-8 inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-80"
              >
                Meet the team
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
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
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
