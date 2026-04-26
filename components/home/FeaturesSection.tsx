"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Bath,
  BedDouble,
  ChefHat,
  KeyRound,
  Laptop,
  Layers,
  Sofa,
  Sparkles,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import FadeIn from "@/components/ui/FadeIn";

// What's included grid. Replaced the old "Do the math" Receipts
// comparison: that math was Hamburg/LONG-specific, hard to maintain,
// and brushed up against unfair-competition rules. This section works
// for both stay types, lower wartung, atmospheric brand voice.
//
// Pricing anchor lives in the sub-headline using the actual cheapest
// rates from lib/data.ts (€45/night SHORT, €595/mo LONG). Update those
// numbers here whenever the cheapest priceFrom in any location changes.
//
// Photos are intentionally absent: the homepage already carries plenty
// of imagery (hero, locations, video, map, about). This section earns
// its weight through clarity, not more pictures.

type Scope = "ALL" | "SHORT" | "LONG";

type Inclusion = {
  title: string;
  body: string;
  icon: LucideIcon;
  scope: Scope;
};

const INCLUSIONS: Inclusion[] = [
  {
    title: "Private furnished suite",
    body: "Move-in ready. Fully furnished, everything sorted. You bring clothes and a toothbrush.",
    icon: BedDouble,
    scope: "ALL",
  },
  {
    title: "Communal kitchen",
    body: "Full cookware, daily essentials topped up. Cook, gather, repeat.",
    icon: ChefHat,
    scope: "ALL",
  },
  {
    title: "Living rooms & lounges",
    body: "Sofas to sink into, screens for film nights, somewhere that’s not your room.",
    icon: Sofa,
    scope: "ALL",
  },
  {
    title: "Workspace corners",
    body: "Quiet nooks and focus zones for the days you actually have to work.",
    icon: Laptop,
    scope: "ALL",
  },
  {
    title: "Community events",
    body: "Yoga, drinks, walks, monthly hangouts. Show up if you want, skip if you don’t.",
    icon: Users,
    scope: "ALL",
  },
  {
    title: "WiFi",
    body: "Internet in every suite and every common space. Reliable enough for work calls.",
    icon: Wifi,
    scope: "ALL",
  },
  {
    title: "All bills in",
    body: "Power, water, heating, all included. One number on the invoice, no meters to read.",
    icon: Zap,
    scope: "ALL",
  },
  {
    title: "Weekly cleaning",
    body: "Common areas done every week. Your suite is yours to keep how you like.",
    icon: Sparkles,
    scope: "ALL",
  },
  {
    title: "Mobile key",
    body: "Salto or Kiwi app on your phone unlocks the door. No fumbling, no lost keys.",
    icon: KeyRound,
    scope: "ALL",
  },
  {
    title: "Linens",
    body: "Bed sheets and pillows in every suite, no shopping trip needed.",
    icon: Layers,
    scope: "ALL",
  },
  {
    title: "City transfers",
    body: "Want to switch cities later? Members get priority on any STACEY room that opens up elsewhere.",
    icon: ArrowLeftRight,
    scope: "LONG",
  },
  {
    title: "Towels",
    body: "Hotel-style towels at the door for short stays. Pack lighter.",
    icon: Bath,
    scope: "SHORT",
  },
];

function ScopeBadge({ scope }: { scope: Scope }) {
  if (scope === "ALL") return null;
  return (
    <span
      className={clsx(
        "inline-block rounded-[3px] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em]",
        scope === "SHORT" ? "bg-black text-white" : "bg-pink text-black",
      )}
    >
      {scope === "SHORT" ? "Short stays" : "Long stays"}
    </span>
  );
}

function InclusionCard({ inc }: { inc: Inclusion }) {
  const Icon = inc.icon;
  return (
    <article className="flex flex-col rounded-[5px] bg-white p-5 ring-1 ring-black/8 shadow-[0_4px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:ring-black/15 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-pink/15 text-pink">
          <Icon size={22} strokeWidth={2.2} />
        </span>
        {inc.scope !== "ALL" && <ScopeBadge scope={inc.scope} />}
      </div>
      <h3 className="mt-4 text-base font-extrabold leading-tight tracking-tight lg:text-lg">
        {inc.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray lg:text-base">{inc.body}</p>
    </article>
  );
}

export default function FeaturesSection() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            What&rsquo;s included
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Almost <span className="italic font-light">everything</span> included.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            From <span className="font-bold text-black">&euro;45/night</span> for short stays,{" "}
            <span className="font-bold text-black">&euro;595/mo</span> for long stays. One bill,
            the suite, the space, the people. You bring clothes.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {INCLUSIONS.map((inc) => (
            <InclusionCard key={inc.title} inc={inc} />
          ))}
        </div>

        <div className="mt-12 flex justify-center sm:mt-16">
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
          >
            See what&rsquo;s available
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
