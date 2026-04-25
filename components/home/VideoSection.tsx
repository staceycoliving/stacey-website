"use client";

import { useState } from "react";
import FadeIn from "@/components/ui/FadeIn";

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">
      <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            {/* Video left — bigger play button, slightly stronger
                shadow now that this sits in prime real estate. */}
            <div id="stacey-video" className="relative aspect-video overflow-hidden rounded-[5px] shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              {!playing ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/video-thumbnail.webp"
                    alt="Life at STACEY"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
                  <button
                    onClick={() => setPlaying(true)}
                    className="group absolute inset-0 flex items-center justify-center"
                    aria-label="Play video"
                  >
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-2xl transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20">
                      <div className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="relative ml-1 h-7 w-7 text-black sm:h-8 sm:w-8"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                  </button>
                </>
              ) : (
                <video
                  autoPlay
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full"
                >
                  <source src="/images/life-at-stacey.mp4" type="video/mp4" />
                </video>
              )}
            </div>

            {/* Text right — eyebrow + bigger editorial headline so this
                section earns its prime homepage slot. */}
            <div className="text-center lg:text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Life at STACEY
              </p>
              <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                More than a place to{" "}
                <span className="italic font-light">sleep.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-gray lg:mx-0">
                Community events, shared dinners, coworking spaces, and friendships
                that last. This is what coliving at STACEY feels like.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
