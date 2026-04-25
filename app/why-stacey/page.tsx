"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sofa,
  Users,
  Calendar,
  Package,
  Sparkles,
  Wifi,
  ArrowLeftRight,
  WashingMachine,
  Wrench,
  Play,
  X,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { features } from "@/lib/data";

const iconMap: Record<string, React.ReactNode> = {
  sofa: <Sofa size={28} />,
  users: <Users size={28} />,
  calendar: <Calendar size={28} />,
  package: <Package size={28} />,
  sparkles: <Sparkles size={28} />,
  wifi: <Wifi size={28} />,
  arrowLeftRight: <ArrowLeftRight size={28} />,
  washingMachine: <WashingMachine size={28} />,
  wrench: <Wrench size={28} />,
};

// All three member interviews live here now (homepage only shows the
// hero one). Click a card → modal video player.
const STORIES = [
  {
    name: "Jihane",
    age: 28,
    desc: "Moved from Lebanon to Berlin",
    quote: "Strangers became neighbors. Neighbors became family.",
    video: "/images/interview-3.mp4",
    thumb: "/images/interview-3-thumb.webp",
  },
  {
    name: "Daniel",
    age: 24,
    desc: "First time in Hamburg, for studies",
    quote: "I came for the room. Stayed for the people on the third floor.",
    video: "/images/interview-1.mp4",
    thumb: "/images/interview-1-thumb.webp",
  },
  {
    name: "Christian",
    age: 31,
    desc: "Relocated to Hamburg for work",
    quote: "No furniture trucks. No deposit drama. I unpacked in an hour.",
    video: "/images/interview-2.mp4",
    thumb: "/images/interview-2-thumb.webp",
  },
];

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

export default function WhyStaceyPage() {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pb-16 pt-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Who would want to live their{" "}
            <span className="italic font-light text-pink">life alone?</span>
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Coliving for young professionals in Hamburg, Berlin and Vallendar.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Our <span className="italic font-light">mission</span>
          </h2>
          <p className="mt-4 leading-relaxed text-gray">
            STACEY members often spend significantly less than they would on a
            comparable studio apartment in the same city — and gain a real
            community in return. For us it is not primarily about the money. It
            is about creating an international community of young professionals
            who share a home, a philosophy, and plenty of good evenings.
          </p>
          <p className="mt-4 leading-relaxed text-gray">
            Living at STACEY means you&apos;re always invited and never
            obligated. Join the community dinner or close your door — both are
            perfectly fine. The move-in process is fast and paperless; just
            bring your personal belongings.
          </p>
        </div>
      </section>

      {/* Team story — moved from the homepage AboutSection. Editorial
          treatment with stat tiles + the long-form team copy. */}
      <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[5px] order-2 lg:order-1">
              <Image
                src="/images/stacey-team.webp"
                alt="The STACEY team"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Hamburg, since 2019
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                The story behind{" "}
                <span className="italic font-light">STACEY</span>.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray">
                Founded in Hamburg in 2019 with a simple mission: make city
                living better. We believe that home is more than four walls —
                it&rsquo;s the people you share it with.
              </p>
              <p className="mt-3 text-base leading-relaxed text-gray">
                From our first apartment in Winterhude to locations across
                Germany, we&rsquo;re building a community of like-minded people
                who value connection, convenience and beautiful spaces.
              </p>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { n: "8", l: "Homes" },
              { n: "3", l: "Cities" },
              { n: "300+", l: "Members" },
              { n: "1", l: "Promise" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-[5px] bg-white p-5 text-center ring-1 ring-black/5 shadow-sm sm:p-6"
              >
                <p className="text-3xl font-black leading-none tracking-tight sm:text-5xl">
                  {s.n}
                </p>
                <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            What you <span className="italic font-light">get</span>
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                title: "Private & Shared Spaces",
                text: "Your own furnished bedroom — bedding included — plus generous common areas: living rooms, work zones and kitchens stocked with essentials. Move-in ready from day one.",
              },
              {
                title: "Most Services Included",
                text: "Weekly professional cleaning of common areas, WiFi, on-site laundry facilities and repair and maintenance handled by our team. One bill covers the rental essentials. Laundry and the German broadcasting fee (GEZ / Rundfunkbeitrag) are handled separately by each member.",
              },
              {
                title: "A Real Community",
                text: "Every location has a Community Manager who helps you settle in and organises community get-togethers — from shared dinners to casual evenings. Members stay connected across our cities, and you can apply to transfer between STACEY locations whenever availability allows.",
              },
            ].map((value) => (
              <div key={value.title} className="rounded-[5px] bg-white p-6 shadow-sm">
                <h3 className="font-medium">{value.title}</h3>
                <p className="mt-2 text-sm text-gray">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            What makes STACEY special
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-background p-6 text-left shadow-sm"
              >
                <div className="text-pink">{iconMap[f.icon]}</div>
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-gray">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Member stories — moved from the homepage TestimonialsSection.
          All three interviews shown in a grid; click a card → modal. */}
      <section id="stories" className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              Member stories
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              In their own{" "}
              <span className="italic font-light">words</span>.
            </h2>
            <p className="mt-3 text-sm text-gray sm:text-base">
              Three members. Three stories. Click a card to play.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {STORIES.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setPlaying(s.video)}
                className="group relative aspect-[3/4] overflow-hidden rounded-[5px] bg-black text-left shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Image
                  src={s.thumb}
                  alt={s.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 640px) 33vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/0" />
                <span className="absolute right-3 top-3 rounded-[3px] bg-pink px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black">
                  0{i + 1} / 03
                </span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
                    <Play size={20} className="ml-1 fill-black text-black" />
                  </span>
                </span>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span
                    aria-hidden
                    className="font-serif text-4xl leading-none text-pink/80"
                  >
                    &ldquo;
                  </span>
                  <p className="-mt-1 text-sm font-light italic leading-snug text-white/95 sm:text-base">
                    {s.quote}
                  </p>
                  <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
                    {s.name}, {s.age}
                  </p>
                  <p className="mt-0.5 text-[11px] italic text-white/70">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-pink py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Become part of STACEY
          </h2>
          <p className="mt-3 text-white/80">
            Find your new home in Hamburg, Berlin, or Vallendar.
          </p>
          <Link
            href="/move-in"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-base font-medium text-pink transition-transform hover:scale-105"
          >
            Join us
          </Link>
        </div>
      </section>

      <Footer />
      {playing && <VideoModal src={playing} onClose={() => setPlaying(null)} />}
    </motion.div>
  );
}
