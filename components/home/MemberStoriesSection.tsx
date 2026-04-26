"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

// Member-stories transitional band, sits between FAQ and FinalCta as a
// thin social-proof beat. Intentionally NOT a section-with-headline,
// it doesn't claim peer status with What's-Included / About / FAQ. Just
// three clickable interview thumbs with the per-card "Member story"
// badge providing all the context needed. Full set + transcripts live
// on /why-stacey#stories.

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

export default function MemberStoriesSection() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {INTERVIEWS.map((iv) => (
              <button
                key={iv.src}
                onClick={() => setOpen(iv.src)}
                className="group relative block w-full overflow-hidden rounded-[8px] bg-black ring-1 ring-black/12 shadow-[0_12px_36px_rgba(0,0,0,0.10)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,0,0,0.18)]"
              >
                <div className="relative aspect-video">
                  <Image
                    src={iv.thumb}
                    alt={iv.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 640px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110">
                      <Play size={18} className="ml-0.5 fill-black text-black" strokeWidth={0} />
                    </span>
                  </span>
                  <span className="absolute bottom-3 left-3 inline-block rounded-[3px] bg-pink px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    {iv.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {open && <InterviewModal src={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
