"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { clsx } from "clsx";

// Split-layout video moment between Locations and Map. Click-to-play
// player on the right (custom poster + pulsing pink play button), an
// editorial column on the left with headline + a single member quote
// + an avatar strip that doubles as manual pagination. No background
// loop, no auto-rotation, no sound-toggle, all of which fought against
// the content and entered the page as 2018-era dressing.
//
// Mobile drops the quote/avatar column entirely and uses a classic
// pink-chip header → headline → subline → full-width player stack.

const VIDEO_SRC = "/images/life-at-stacey.mp4";

const QUOTES = [
  {
    text: "Moved to Hamburg for work. Found my crew in 72 hours.",
    name: "Anna",
    age: 26,
    where: "Mühlenkamp",
    since: "Aug 2024",
    avatar: "/images/members/member-2.jpeg",
  },
  {
    text: "No hidden fees, no surprise utility bills, no awkward landlord calls. I could finally focus on life instead of my rental contract.",
    name: "Zheng",
    age: 30,
    where: "Downtown",
    since: "May 2024",
    avatar: "/images/members/member-3.jpeg",
  },
  {
    text: "Most serviced apartments feel like hotels pretending to be homes. STACEY actually feels like a place you live in.",
    name: "Lisa",
    age: 36,
    where: "Eppendorf",
    since: "Mar 2025",
    avatar: "/images/members/member-7.jpeg",
  },
  {
    text: "I came for six weeks. Stayed fourteen months.",
    name: "Gaby",
    age: 24,
    where: "St. Pauli",
    since: "Jan 2024",
    avatar: "/images/members/member-16.jpeg",
  },
];

function VideoModal({ onClose }: { onClose: () => void }) {
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
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// Desktop player surface: looping muted video so the home feels alive,
// poster as the still fallback for first paint and prefers-reduced-motion.
// The actual sound + controls happen in the modal on click.
function LoopingPlayer() {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return (
      <Image
        src="/images/video-thumbnail.webp"
        alt="Life at STACEY"
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        sizes="(min-width: 1024px) 700px, 100vw"
      />
    );
  }
  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/images/video-thumbnail.webp"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
    >
      <source src={VIDEO_SRC} type="video/mp4" />
    </video>
  );
}

// Center play button with a slowly expanding pink ring (same easing as
// the location-map markers, so the brand pulse reads consistent across
// the site).
function PulsingPlay({ size = "lg" }: { size?: "lg" | "md" }) {
  const dim = size === "lg" ? "h-20 w-20" : "h-14 w-14";
  const icon = size === "lg" ? 26 : 18;
  return (
    <span className="pointer-events-none relative flex items-center justify-center">
      <span
        className={clsx("absolute rounded-full bg-pink/50", dim)}
        style={{ animation: "stacey-marker-ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }}
      />
      <span
        className={clsx(
          "relative flex items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110",
          dim,
        )}
      >
        <Play size={icon} className="ml-1 fill-black text-black" strokeWidth={0} />
      </span>
    </span>
  );
}

export default function VideoSection() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(3);
  const q = QUOTES[idx];

  return (
    <section
      id="stacey-video"
      className="relative overflow-hidden bg-black px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      {/* MOBILE, classic stack: pink chip → headline → subline → player */}
      <div className="mx-auto max-w-3xl text-center lg:hidden">
        <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold uppercase text-white">
          Life at STACEY
        </p>
        <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
          More than a place to <span className="italic font-light">sleep.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/60 sm:text-base">
          Ninety seconds. The home, the people, an ordinary Friday.
        </p>

        <button
          onClick={() => setOpen(true)}
          className="group relative mt-8 block w-full overflow-hidden rounded-[8px] shadow-[0_24px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          <div className="relative aspect-video">
            <Image
              src="/images/video-thumbnail.webp"
              alt="Life at STACEY"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
            <span className="absolute inset-0 flex items-center justify-center">
              <PulsingPlay size="md" />
            </span>
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-[3px] bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              90 sec
            </span>
          </div>
        </button>
      </div>

      {/* DESKTOP, split layout: editorial column left, video player right */}
      <div className="mx-auto hidden max-w-7xl items-center gap-16 lg:grid lg:grid-cols-[1fr_1.15fr]">
        <div>
          {/* Eyebrow with vertical pink line, breaks the pink-chip pattern
              that repeats elsewhere on the homepage. */}
          <div className="flex items-center gap-3">
            <span className="block h-8 w-[3px] rounded-full bg-pink" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              Life at STACEY
            </p>
          </div>

          <h2 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight text-white lg:text-6xl">
            More than a place to{" "}
            <span className="italic font-light">sleep.</span>
          </h2>

          <p className="mt-4 max-w-md text-base text-white/60">
            Ninety seconds. The home, the people, an ordinary Friday.
          </p>

          <div
            key={idx}
            className="relative mt-10"
            style={{ animation: "fadeSlide 0.4s ease-out" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -left-6 -top-6 font-serif text-8xl leading-none text-pink/60"
            >
              &ldquo;
            </span>
            <p className="relative max-w-md pl-2 text-xl italic font-light leading-snug text-white/95">
              {q.text}
            </p>
          </div>

          {/* Avatar strip = pagination. Click a face to switch the quote. */}
          <div className="mt-7 flex items-center gap-4">
            <div className="flex -space-x-2">
              {QUOTES.map((other, i) => {
                const active = i === idx;
                return (
                  <button
                    key={other.name}
                    onClick={() => setIdx(i)}
                    aria-label={`Quote from ${other.name}`}
                    className={clsx(
                      "relative inline-block overflow-hidden rounded-full transition-all duration-300",
                      active
                        ? "z-10 h-12 w-12 ring-2 ring-pink shadow-[0_0_0_3px_rgba(252,176,192,0.25)]"
                        : "h-9 w-9 opacity-55 ring-2 ring-white/30 hover:opacity-90",
                    )}
                  >
                    <Image src={other.avatar} alt="" fill className="object-cover" sizes="48px" />
                  </button>
                );
              })}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{q.name}, {q.age}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">
                {q.where} · since {q.since}
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => setOpen(true)}
            className="group relative block w-full overflow-hidden rounded-[8px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
          >
            <div className="relative aspect-video">
              <LoopingPlayer />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
              <span className="absolute inset-0 flex items-center justify-center">
                <PulsingPlay size="lg" />
              </span>
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-[3px] bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                90 sec · the film
              </span>
            </div>
          </button>
        </div>
      </div>

      {open && <VideoModal onClose={() => setOpen(false)} />}
    </section>
  );
}
