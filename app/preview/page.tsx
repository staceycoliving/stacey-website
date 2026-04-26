"use client";

// Internal preview, "Stufe 2" page-bg approach: drop #FAFAFA section
// backgrounds entirely, everything sits on white, cards earn definition
// through stronger ring + shadow chrome, and only the final brand-CTA
// stays black. Subtle pink hairlines mark section boundaries since
// there's no bg colour change to do that work anymore.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Bath,
  BedDouble,
  ChefHat,
  KeyRound,
  Laptop,
  Layers,
  Play,
  Plus,
  Sofa,
  Sparkles,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

/* ─── What's included data ───────────────────────────────────────── */

type Scope = "ALL" | "SHORT" | "LONG";
type Inclusion = { title: string; body: string; icon: LucideIcon; scope: Scope };

const INCLUSIONS: Inclusion[] = [
  { title: "Private furnished suite", body: "Move-in ready. Fully furnished, everything sorted. You bring clothes and a toothbrush.", icon: BedDouble, scope: "ALL" },
  { title: "Communal kitchen", body: "Full cookware, daily essentials topped up. Cook, gather, repeat.", icon: ChefHat, scope: "ALL" },
  { title: "Living rooms & lounges", body: "Sofas to sink into, screens for film nights, somewhere that’s not your room.", icon: Sofa, scope: "ALL" },
  { title: "Workspace corners", body: "Quiet nooks and focus zones for the days you actually have to work.", icon: Laptop, scope: "ALL" },
  { title: "Community events", body: "Yoga, drinks, walks, monthly hangouts. Show up if you want, skip if you don’t.", icon: Users, scope: "ALL" },
  { title: "WiFi", body: "Internet in every suite and every common space. Reliable enough for work calls.", icon: Wifi, scope: "ALL" },
  { title: "All bills in", body: "Power, water, heating, all included. One number on the invoice, no meters to read.", icon: Zap, scope: "ALL" },
  { title: "Weekly cleaning", body: "Common areas done every week. Your suite is yours to keep how you like.", icon: Sparkles, scope: "ALL" },
  { title: "Mobile key", body: "Salto or Kiwi app on your phone unlocks the door. No fumbling, no lost keys.", icon: KeyRound, scope: "ALL" },
  { title: "Linens", body: "Bed sheets and pillows in every suite, no shopping trip needed.", icon: Layers, scope: "ALL" },
  { title: "City transfers", body: "Want to switch cities later? Members get priority on any STACEY room that opens up elsewhere.", icon: ArrowLeftRight, scope: "LONG" },
  { title: "Towels", body: "Hotel-style towels at the door for short stays. Pack lighter.", icon: Bath, scope: "SHORT" },
];

const FAQ = [
  { q: "How long do I have to stay?", a: "Up to 180 nights short-stay. From 3 months long-stay, with 3 months notice." },
  { q: "What’s actually included in the rent?", a: "Furnished private suite, weekly cleaning of common areas, internet, all utilities, and community events." },
  { q: "Can I bring my partner?", a: "Yes. Our Jumbo and Studio rooms are couple-friendly and priced for two occupants." },
  { q: "What about pets?", a: "STACEY homes are pet-free so the shared kitchens and common areas stay comfortable for everyone." },
  { q: "Why is this cheaper than renting alone?", a: "We share fixed costs across more people: building, internet, cleaning, furniture, maintenance." },
];

const INTERVIEWS = [
  { src: "/images/interview-1.mp4", thumb: "/images/interview-1-thumb.webp", label: "Member story" },
  { src: "/images/interview-2.mp4", thumb: "/images/interview-2-thumb.webp", label: "Member story" },
  { src: "/images/interview-3.mp4", thumb: "/images/interview-3-thumb.webp", label: "Member story" },
];

/* ─── Variant labels ─────────────────────────────────────────────── */

function VariantLabel({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="bg-[#1A1A1A] px-6 py-4">
      <div className="mx-auto max-w-7xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Stufe 2 preview
        </p>
        <p className="mt-1 text-base font-extrabold text-white sm:text-lg">{title}</p>
        {desc && <p className="mt-1 text-xs text-white/60">{desc}</p>}
      </div>
    </div>
  );
}

/* ─── Section divider hairline (replaces bg colour change) ────────── */

function PinkHairline() {
  return (
    <div className="mx-auto h-px max-w-2xl"
      style={{
        backgroundImage: "linear-gradient(to right, transparent, #FCB0C0 35%, #FCB0C0 65%, transparent)",
      }}
    />
  );
}

/* ─── Reusable card chrome ───────────────────────────────────────── */

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
      <h3 className="mt-4 text-base font-extrabold leading-tight tracking-tight">
        {inc.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray">{inc.body}</p>
    </article>
  );
}

/* ─── Locations carousel mock (white bg, stronger card chrome) ────── */

const MOCK_LOCATIONS = [
  { name: "Mühlenkamp", city: "Hamburg", price: 895, stayType: "LONG", image: "/images/locations/muehlenkamp/community/01-muehlenkamp.webp" },
  { name: "Eppendorf", city: "Hamburg", price: 895, stayType: "LONG", image: "/images/locations/eppendorf/community/001-community-ew.webp" },
  { name: "Mitte", city: "Berlin", price: 995, stayType: "LONG", image: "/images/locations/berlin-mitte/community/13-berlin.webp" },
  { name: "Alster", city: "Hamburg", price: 45, stayType: "SHORT", image: "/images/locations/alster/community/01-community-al.webp" },
  { name: "Downtown", city: "Hamburg", price: 48, stayType: "SHORT", image: "/images/locations/downtown/community/000-community-dt.webp" },
  { name: "Vallendar", city: "Vallendar", price: 595, stayType: "LONG", image: "/images/locations/vallendar/community/001-community-va.webp" },
];

function LocationsSection() {
  return (
    <section className="bg-white pb-12 pt-8 sm:pb-16 lg:pb-20">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {MOCK_LOCATIONS.map((loc) => (
            <article
              key={loc.name}
              className="group relative w-[85vw] flex-shrink-0 snap-start overflow-hidden rounded-[5px] bg-white ring-1 ring-black/8 shadow-[0_6px_22px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:ring-black/15 hover:shadow-[0_16px_36px_rgba(0,0,0,0.10)] sm:w-[340px]"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image src={loc.image} alt={loc.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="340px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute left-3 top-3">
                  <span className={clsx("rounded-[5px] px-3 py-1.5 text-xs font-black uppercase tracking-wider", loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white")}>
                    {loc.stayType}
                  </span>
                </div>
                <div className="absolute right-3 top-3">
                  <span className="rounded-[5px] bg-white/90 px-2.5 py-1 text-xs font-bold text-black backdrop-blur-sm">
                    from &euro;{loc.price}{loc.stayType === "SHORT" ? "/night" : "/mo"}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{loc.city}</p>
                  <h3 className="mt-1 text-2xl font-extrabold leading-tight text-white sm:text-[1.625rem]">{loc.name}</h3>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── What's included (white bg, stronger card chrome) ───────────── */

function WhatsIncludedSection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold uppercase text-white">
          What&rsquo;s included
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          Almost <span className="italic font-light">everything</span> in.
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
    </section>
  );
}

/* ─── FAQ on white bg, accordion gets a stronger outer frame ──────── */

function FAQSectionMock() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            Five questions
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            The things people <span className="italic font-light">actually</span> ask.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            Straight answers, no marketing speak.
          </p>
        </div>

        <div className="mt-10 divide-y divide-black/10 rounded-[5px] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.06)] ring-1 ring-black/8 sm:mt-12">
          {FAQ.map((qa, i) => {
            const isOpen = open === i;
            return (
              <div key={qa.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FAFAFA] sm:px-6 sm:py-5"
                >
                  <span className="flex items-center gap-3">
                    <span className={clsx("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-black transition-colors", isOpen ? "bg-pink text-black" : "bg-black text-white")}>
                      0{i + 1}
                    </span>
                    <span className="text-base font-bold leading-tight sm:text-lg">{qa.q}</span>
                  </span>
                  <span className={clsx("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all", isOpen ? "rotate-45 bg-black text-white" : "bg-[#F0F0F0] text-black")}>
                    <Plus size={14} strokeWidth={2.5} />
                  </span>
                </button>
                <div className={clsx("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pl-14 sm:px-6 sm:pb-6 sm:pl-16">
                      <p className="text-sm leading-relaxed text-gray sm:text-base">{qa.a}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── About on white bg, stronger photo card chrome ──────────────── */

function AboutSectionMock() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto hidden max-w-7xl items-center gap-16 lg:grid lg:grid-cols-[1fr_1.15fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="block h-8 w-[3px] rounded-full bg-pink" />
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Hamburg · since 2019
              </p>
            </div>
            <h2 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight lg:text-6xl">
              Built by us, for the way <span className="italic font-light">we</span> wanted to live.
            </h2>
            <div className="mt-6 max-w-md space-y-4 text-base leading-relaxed text-gray">
              <p>STACEY started in Hamburg, in 2019. Born from the friction of finding a flat: bureaucracy, scattered listings, high setup costs, and the wrong flatmates.</p>
              <p>We wanted shared apartments done properly. One hassle-free sign-up, design that feels like home, people you&rsquo;d actually want to share a kitchen with.</p>
            </div>
            <Link href="#" className="group mt-8 inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-80">
              Meet the team
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div>
            {/* Stronger card chrome on white bg, ring 12% + bigger shadow
                so the photo lifts off the page even without a grey
                container behind it. */}
            <div className="relative block w-full overflow-hidden rounded-[8px] bg-black/5 ring-1 ring-black/12 shadow-[0_30px_80px_rgba(0,0,0,0.14)]">
              <div className="relative aspect-video">
                <Image src="/images/stacey-team.webp" alt="The STACEY team" fill className="object-cover" sizes="(min-width: 1024px) 700px, 100vw" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Member stories thin band on white bg ───────────────────────── */

function MemberStoriesBand() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {INTERVIEWS.map((iv) => (
            <button
              key={iv.src}
              onClick={() => setOpen(iv.src)}
              className="group relative block w-full overflow-hidden rounded-[8px] bg-black ring-1 ring-black/12 shadow-[0_12px_36px_rgba(0,0,0,0.10)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,0,0,0.18)]"
            >
              <div className="relative aspect-video">
                <Image src={iv.thumb} alt={iv.label} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 640px) 33vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110">
                    <Play size={18} className="ml-0.5 fill-black text-black" strokeWidth={0} />
                  </span>
                </span>
                <span className="absolute bottom-3 left-3 inline-block rounded-[3px] bg-pink px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-white">
                  {iv.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur" onClick={() => setOpen(null)}>
          <button onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <X size={20} />
          </button>
          <video autoPlay controls playsInline className="max-h-[90vh] w-full max-w-4xl rounded-[5px]" onClick={(e) => e.stopPropagation()}>
            <source src={open} type="video/mp4" />
          </video>
        </div>
      )}
    </section>
  );
}

/* ─── Final CTA (unchanged, black brand crescendo) ───────────────── */

function FinalCtaMock() {
  return (
    <section className="relative overflow-hidden bg-black px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-pink/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-pink/10 blur-3xl" />
      <div className="relative mx-auto max-w-5xl text-center">
        <p
          className="text-[2.5rem] font-extrabold uppercase leading-[1.05] tracking-[0.04em] sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
          style={{
            background: "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) var(--fill), #FCB0C0 var(--fill), #FCB0C0 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "claimFill 5s ease-in-out infinite",
          }}
        >
          OUR MEMBERS<br />CALL US HOME.
        </p>
        <p className="mx-auto mt-8 max-w-md text-sm text-white/55 sm:text-base">
          Eight homes. Three cities. One vision.
        </p>
        <div className="mt-10 flex justify-center">
          <Link href="#" className="group inline-flex items-center gap-2 rounded-[5px] bg-pink px-8 py-4 text-sm font-bold text-black shadow-[0_12px_30px_rgba(252,176,192,0.35)] transition-all duration-200 hover:scale-[1.03] sm:text-base">
            Find your room
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Page wrapper ───────────────────────────────────────────────── */

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · Stufe 2 backgrounds
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Alles weiß, kein #FAFAFA mehr. Cards bekommen stärkere Definition.
        </h1>
        <p className="mt-3 text-sm text-gray">
          Section-Bg-Greys komplett raus. Cards earnen Definition durch
          stärkere Ring (12% statt 5%) + medium Shadows. Section-Trennung
          läuft über Padding und subtile Pink-Hairlines statt Bg-Wechsel.
          Final-CTA bleibt schwarz als einziger Brand-Akzent. Scroll durch
          fünf representative Sektionen + den schwarzen Closer, sag
          obs trägt oder ob die Page zu monoton wird.
        </p>
      </div>

      <VariantLabel
        title="Locations carousel"
        desc="Cards mit ring-1 ring-black/8 + shadow-[0_6px_22px], hover verstärkt beides. Auf weißem Bg statt grauem (#FAFAFA)."
      />
      <LocationsSection />
      <PinkHairline />

      <VariantLabel
        title="What's included"
        desc="Icon-Cards mit ring + medium shadow auf weißem Bg, vorher hatten sie grauen Bg um sich. Pink-Icon-Boxen poppen jetzt mehr."
      />
      <WhatsIncludedSection />
      <PinkHairline />

      <VariantLabel
        title="FAQ"
        desc="Akkordeon kriegt einen stärkeren Outer-Frame (ring + medium shadow) damit es als Container auf weißem Bg trägt."
      />
      <FAQSectionMock />
      <PinkHairline />

      <VariantLabel
        title="About team-story split"
        desc="Photo-Card kriegt stärkeren Ring (12%) + tieferer Shadow damit das Foto nicht im weißen Bg verschwimmt."
      />
      <AboutSectionMock />
      <PinkHairline />

      <VariantLabel
        title="Member stories transitional band"
        desc="Drei Thumb-Cards mit verstärkter Card-Chrome auf weißem Bg, weniger Padding (py-12)."
      />
      <MemberStoriesBand />

      <VariantLabel
        title="Final CTA"
        desc="Bleibt unverändert schwarz. Einziger Brand-Akzent-Bg in der ganzen Page. Stärkster Kontrast nach all dem Weiß, Crescendo-Effekt verdoppelt sich."
      />
      <FinalCtaMock />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          Trägt das? Oder fehlt das Grau für visuelle Pause?
          Sag&rsquo;s, dann verdrahte ich Stufe 2 als neuen Default oder
          rolle&rsquo;s zurück.
        </p>
        <Link href="/" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-pink">
          Back to homepage
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
