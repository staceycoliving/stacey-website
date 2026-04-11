"use client";

import { useState } from "react";
import Image from "next/image";
import FadeIn from "@/components/ui/FadeIn";

type Testimonial = {
  name: string;
  desc: string;
  video: string;
  thumb: string;
  quote?: string;
};

const TESTIMONIALS: Testimonial[] = [
  { name: "Daniel", desc: "First time in Hamburg for studies", video: "/images/interview-1.mp4", thumb: "/images/interview-1-thumb.webp" },
  { name: "Christian", desc: "Relocated to Hamburg for work", video: "/images/interview-2.mp4", thumb: "/images/interview-2-thumb.webp" },
  { name: "Jihane", desc: "Moved from Lebanon to Berlin", video: "/images/interview-3.mp4", thumb: "/images/interview-3-thumb.webp", quote: "Strangers became neighbors and neighbors became family." },
];

export default function TestimonialsSection() {
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightPlaying, setSpotlightPlaying] = useState<number | null>(null);

  const spotlightMember = TESTIMONIALS[spotlightIndex];
  const smallMembers = TESTIMONIALS.filter((_, i) => i !== spotlightIndex);

  return (
    <section className="bg-white py-20">
      <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Hear from our <span className="italic font-light">members</span>
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Spotlight */}
            <div className="sm:col-span-2 sm:row-span-2">
              {(() => {
                const isPlaying = spotlightPlaying === spotlightIndex;
                return (
                  <div className="relative h-full overflow-hidden rounded-[5px]">
                    {!isPlaying ? (
                      <>
                        <Image
                          src={spotlightMember.thumb}
                          alt={spotlightMember.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 60vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <button
                          onClick={() => setSpotlightPlaying(spotlightIndex)}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-110 sm:h-16 sm:w-16">
                            <div className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                            <svg viewBox="0 0 24 24" fill="currentColor" className="relative ml-1 h-6 w-6 text-black"><polygon points="5,3 19,12 5,21" /></svg>
                          </div>
                        </button>
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                          <p className="text-xl font-extrabold text-white sm:text-2xl">{spotlightMember.name}</p>
                          <p className="mt-1 text-sm text-white/80 sm:text-base">{spotlightMember.desc}</p>
                          {spotlightMember.quote && (
                            <p className="mt-2 text-sm italic leading-relaxed text-white/90">
                              &ldquo;{spotlightMember.quote}&rdquo;
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <video
                        key={spotlightMember.video}
                        autoPlay
                        controls
                        playsInline
                        className="absolute inset-0 h-full w-full rounded-[5px]"
                      >
                        <source src={spotlightMember.video} type="video/mp4" />
                      </video>
                    )}
                  </div>
                );
              })()}
            </div>
            {/* Small cards */}
            {smallMembers.map((t) => {
              const originalIndex = TESTIMONIALS.indexOf(t);
              return (
                <button
                  key={t.name}
                  onClick={() => { setSpotlightIndex(originalIndex); setSpotlightPlaying(null); }}
                  className="group relative overflow-hidden rounded-[5px] text-left transition-all"
                >
                  <div className="relative aspect-video">
                    <Image
                      src={t.thumb}
                      alt={t.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition-transform group-hover:scale-110">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4 text-black"><polygon points="5,3 19,12 5,21" /></svg>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-3" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-[11px] text-white/80">{t.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
