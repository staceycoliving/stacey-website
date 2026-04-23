"use client";

import { useState } from "react";
import FadeIn from "@/components/ui/FadeIn";

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="bg-white py-20">
      <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
            {/* Video left */}
            <div id="stacey-video" className="relative aspect-video overflow-hidden rounded-[5px]">
              {!playing ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/video-thumbnail.webp"
                    alt="Life at STACEY"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/15" />
                  <button
                    onClick={() => setPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-110 sm:h-16 sm:w-16">
                      <div className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                      <svg viewBox="0 0 24 24" fill="currentColor" className="relative ml-1 h-6 w-6 text-black"><polygon points="5,3 19,12 5,21" /></svg>
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

            {/* Text right */}
            <div className="text-center sm:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                More than a place<br />to <span className="italic font-light">sleep.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray">
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
