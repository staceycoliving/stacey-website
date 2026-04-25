"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, X } from "lucide-react";

// Compact testimonial, single hero interview (Jihane) with the pull-
// quote overlaid, plus a "More member stories →" link out to
// /why-stacey where all three interviews live in full. Cuts the
// homepage testimonial block to ~50% of its previous height.
const FEATURED = {
  name: "Jihane",
  age: 28,
  desc: "Moved from Lebanon to Berlin",
  quote: "Strangers became neighbors. Neighbors became family.",
  video: "/images/interview-3.mp4",
  thumb: "/images/interview-3-thumb.webp",
};

function VideoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <video
        autoPlay
        controls
        playsInline
        className="max-h-[90vh] w-full max-w-5xl rounded-[5px]"
        onClick={(e) => e.stopPropagation()}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

export default function TestimonialsSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="bg-black px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Member stories
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            One story.{" "}
            <span className="italic font-light">In her own words.</span>
          </h2>
        </div>

        <button
          onClick={() => setPlaying(true)}
          className="group relative mt-12 block aspect-[16/9] w-full overflow-hidden rounded-[5px] bg-black"
        >
          <Image
            src={FEATURED.thumb}
            alt={FEATURED.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl transition-transform group-hover:scale-110 sm:h-24 sm:w-24">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
              <Play size={28} className="relative ml-1 fill-black text-black" />
            </span>
          </span>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-left sm:p-10">
            <span
              aria-hidden
              className="font-serif text-5xl leading-none text-pink sm:text-7xl"
            >
              &ldquo;
            </span>
            <p className="-mt-3 max-w-2xl text-2xl font-light italic leading-tight text-white sm:text-4xl">
              {FEATURED.quote}
            </p>
            <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-pink">
              {FEATURED.name}, {FEATURED.age} · {FEATURED.desc}
            </p>
          </div>
        </button>

        <div className="mt-8 text-center">
          <Link
            href="/why-stacey#stories"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-pink"
          >
            More member stories
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
      {playing && <VideoModal src={FEATURED.video} onClose={() => setPlaying(false)} />}
    </section>
  );
}
