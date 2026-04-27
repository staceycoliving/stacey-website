"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, X } from "lucide-react";

// Brand-final CTA, gives the "OUR MEMBERS CALL US HOME" claim its own
// stage right before the footer. The three member-interview thumbs
// land directly under the claim as visual proof: claim says "our
// members call us home", thumbs show three of those members literally
// telling that story. Then the subline + Find-your-room CTA close out.
//
// The claim's animated gradient (claimFill keyframe) is in globals.css.

const INTERVIEWS = [
  {
    src: "/images/interview-1.mp4",
    thumb: "/images/interview-1-thumb.webp",
    label: "Member story",
  },
  {
    src: "/images/interview-2.mp4",
    thumb: "/images/interview-2-thumb.webp",
    label: "Member story",
  },
  {
    src: "/images/interview-3.mp4",
    thumb: "/images/interview-3-thumb.webp",
    label: "Member story",
  },
];

function InterviewModal({ src, onClose }: { src: string; onClose: () => void }) {
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
        className="max-h-[90vh] w-full max-w-4xl rounded-[5px]"
        onClick={(e) => e.stopPropagation()}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

function ThumbCard({
  iv,
  onPlay,
}: {
  iv: (typeof INTERVIEWS)[number];
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      className="group relative block w-full overflow-hidden rounded-[8px] bg-black ring-1 ring-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:ring-pink/50 hover:shadow-[0_18px_48px_rgba(252,176,192,0.18)]"
    >
      <div className="relative aspect-video">
        <Image
          src={iv.thumb}
          alt={iv.label}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width: 640px) 33vw, 80vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110 sm:h-14 sm:w-14">
            <Play size={16} className="ml-0.5 fill-black text-black sm:hidden" strokeWidth={0} />
            <Play size={18} className="ml-0.5 hidden fill-black text-black sm:block" strokeWidth={0} />
          </span>
        </span>
        <span className="absolute bottom-3 left-3 inline-block rounded-[3px] bg-pink px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
          {iv.label}
        </span>
      </div>
    </button>
  );
}

export default function FinalCtaSection() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="relative overflow-hidden bg-[#1A1A1A] px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
      {/* Soft pink corner glows for atmosphere behind the claim. Pure
          decoration, pointer-events-none. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-pink/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-pink/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl text-center">
        <p
          className="text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl sm:tracking-[0.04em] lg:text-7xl"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) var(--fill), #FCB0C0 var(--fill), #FCB0C0 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "claimFill 5s ease-in-out infinite",
          }}
        >
          OUR MEMBERS<br />CALL US HOME.
        </p>

        {/* Member-stories proof strip directly under the claim. Mobile
            uses a horizontal swipe carousel matching Locations/Map
            mobile DNA, Desktop renders a 3-column grid. The claim says
            "our members call us home", these thumbs show three of them
            telling that story. */}
        <div className="relative mt-12 sm:mt-14">
          {/* Mobile carousel, full-bleed swipe with peek */}
          <div className="-mx-4 sm:hidden">
            <div
              className="flex gap-3 overflow-x-auto px-[10%] pb-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" }}
            >
              {INTERVIEWS.map((iv) => (
                <div
                  key={iv.src}
                  className="w-[80%] flex-shrink-0 snap-center"
                >
                  <ThumbCard iv={iv} onPlay={() => setOpen(iv.src)} />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop, 3-column grid centred under the claim */}
          <div className="mx-auto hidden max-w-4xl sm:block">
            <div className="grid gap-5 sm:grid-cols-3">
              {INTERVIEWS.map((iv) => (
                <ThumbCard key={iv.src} iv={iv} onPlay={() => setOpen(iv.src)} />
              ))}
            </div>
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-md text-base text-white/55 sm:mt-14 sm:text-lg">
          Eight homes. Three cities. One vision.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-pink px-8 py-4 text-sm font-bold text-black shadow-[0_12px_30px_rgba(252,176,192,0.35)] transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_16px_40px_rgba(252,176,192,0.45)] sm:text-base"
          >
            Find your room
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>

      {open && <InterviewModal src={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
