"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Play, X } from "lucide-react";
import { clsx } from "clsx";

// Cinematic "Life at STACEY" section. Background video loops muted with
// a strong gradient + radial vignette so the headline reads in any
// frame. Foreground rotates real member quotes (pink decorative quote
// marks bracket the text), with a multi-avatar strip showing the whole
// crew and a highlight ring on the currently quoted member.
//
// Sound-toggle pill bottom-right unmutes the background loop without
// opening the modal — modal opens via the "Watch the film" CTA which
// plays the full video with controls.
//
// Section is min-h-[70vh] so it still reads as a destination moment
// but doesn't dominate the page like 85vh did.

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
    text: "Sunday brunch on the rooftop. I was here three weeks before I realised these people had become friends.",
    name: "Tom",
    age: 31,
    where: "Alster",
    since: "May 2024",
    avatar: "/images/members/member-3.jpeg",
  },
  {
    text: "Coworking that actually feels like home, not WeWork. The kitchen is the office.",
    name: "Lisa",
    age: 28,
    where: "Eppendorf",
    since: "Mar 2025",
    avatar: "/images/members/member-7.jpeg",
  },
  {
    text: "I came for six weeks. Stayed fourteen months.",
    name: "Daniel",
    age: 29,
    where: "Mitte",
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

export default function VideoSection() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const ref = useRef<HTMLVideoElement | null>(null);

  // Rotate through quotes every 5s.
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const q = QUOTES[idx];

  const toggleSound = () => {
    if (!ref.current) return;
    const next = !muted;
    ref.current.muted = next;
    // Unmuting requires a play attempt to satisfy autoplay policies.
    if (!next) ref.current.play().catch(() => {});
    setMuted(next);
  };

  return (
    <section
      id="stacey-video"
      className="relative flex min-h-[70vh] items-center overflow-hidden bg-black py-20 sm:py-24"
    >
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Stronger gradient + radial vignette so headline+quote read in
          any video frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/70" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      {/* Floating sound toggle — equalizer-bar visualiser. Bars
          animate (eqBar1/2/3 keyframes in globals.css) while audio is
          on; static + dimmed when muted. The visual itself tells the
          state without relying on the icon alone. */}
      <button
        onClick={toggleSound}
        className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-md transition-all hover:bg-black/80 sm:bottom-6 sm:right-6 sm:text-sm"
        aria-label={muted ? "Unmute background video" : "Mute background video"}
      >
        <span className="flex items-end gap-[3px]" aria-hidden>
          <span
            className={clsx(
              "w-[3px] rounded-sm bg-pink",
              muted ? "h-2 opacity-50" : "h-3 origin-bottom",
            )}
            style={!muted ? { animation: "eqBar1 0.9s ease-in-out infinite" } : undefined}
          />
          <span
            className={clsx(
              "w-[3px] rounded-sm bg-pink",
              muted ? "h-3 opacity-50" : "h-4 origin-bottom",
            )}
            style={!muted ? { animation: "eqBar2 0.7s ease-in-out infinite" } : undefined}
          />
          <span
            className={clsx(
              "w-[3px] rounded-sm bg-pink",
              muted ? "h-2 opacity-50" : "h-3 origin-bottom",
            )}
            style={!muted ? { animation: "eqBar3 1.1s ease-in-out infinite" } : undefined}
          />
        </span>
        {muted ? "Add sound" : "Sound on"}
      </button>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
        >
          Life at STACEY
        </p>
        <h2
          className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}
        >
          More than a place to <span className="italic font-light">sleep.</span>
        </h2>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
          Press play. Or just listen for a sec.
        </p>

        {/* Rotating quote with pink decorative quote-marks. The `key`
            forces a re-mount on rotation so the fadeSlide keyframe
            (defined in globals.css) replays each time. */}
        <div
          key={idx}
          className="relative mt-10"
          style={{ animation: "fadeSlide 0.5s ease-out" }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-6 font-serif text-7xl leading-none text-pink/70 sm:-left-6 sm:text-8xl"
          >
            &ldquo;
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -right-2 font-serif text-7xl leading-none text-pink/70 sm:-right-6 sm:text-8xl"
          >
            &rdquo;
          </span>
          <p
            className="mx-auto max-w-2xl text-lg italic font-light text-white/95 sm:text-xl"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}
          >
            {q.text}
          </p>

          {/* Multi-avatar strip — quoted member highlighted, rest dimmed */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {QUOTES.map((other, i) => {
                const active = i === idx;
                return (
                  <span
                    key={other.name}
                    className={clsx(
                      "relative inline-block overflow-hidden rounded-full transition-all duration-500",
                      active
                        ? "z-10 h-12 w-12 ring-2 ring-pink shadow-[0_0_0_3px_rgba(252,176,192,0.25)]"
                        : "h-8 w-8 opacity-50 ring-2 ring-white/30",
                    )}
                  >
                    <Image src={other.avatar} alt="" fill className="object-cover" sizes="48px" />
                  </span>
                );
              })}
            </div>
            <p
              className="text-xs font-medium text-white/80"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
            >
              {q.name}, {q.age} · {q.where} · since {q.since}
            </p>
          </div>
        </div>

        {/* Pagination dots — user-controlled story browsing */}
        <div className="mt-8 flex justify-center gap-1.5">
          {QUOTES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Story ${i + 1}`}
              className={clsx(
                "h-1.5 rounded-full transition-all duration-300",
                i === idx ? "w-6 bg-pink" : "w-1.5 bg-white/30 hover:bg-white/60",
              )}
            />
          ))}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="group mt-10 inline-flex items-center gap-2 rounded-[5px] bg-white px-6 py-3 text-sm font-bold text-black shadow-2xl transition-all duration-300 hover:scale-[1.04] sm:text-base"
        >
          <Play size={14} className="fill-black" />
          Watch the film
          <ArrowRight
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </button>
      </div>

      {open && <VideoModal onClose={() => setOpen(false)} />}
    </section>
  );
}
