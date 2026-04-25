"use client";

// Dev-only preview — focused on Variant 6 (recently moved-in avatars +
// available rooms). Compares different placements of price · available ·
// avatars so we can lock in the final card layout. Not in the navbar.

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import HeroHeadline from "@/components/home/HeroHeadline";
import { locations } from "@/lib/data";

const STATS: Record<
  string,
  { rooms: number; sqm: string; members: number; available: number; newResidents: number }
> = {
  muehlenkamp: { rooms: 30, sqm: "16-26", members: 28, available: 3, newResidents: 2 },
  eppendorf: { rooms: 22, sqm: "14-22", members: 19, available: 2, newResidents: 1 },
  downtown: { rooms: 18, sqm: "18-32", members: 16, available: 4, newResidents: 0 },
  alster: { rooms: 12, sqm: "16-30", members: 11, available: 1, newResidents: 1 },
  "st-pauli": { rooms: 24, sqm: "15-24", members: 22, available: 2, newResidents: 3 },
  eimsbuettel: { rooms: 16, sqm: "14-22", members: 14, available: 5, newResidents: 0 },
  mitte: { rooms: 14, sqm: "16-28", members: 12, available: 1, newResidents: 0 },
  vallendar: { rooms: 20, sqm: "14-22", members: 17, available: 4, newResidents: 2 },
};

const MEMBER_AVATARS = [
  "/images/members/member-1.jpeg",
  "/images/members/member-2.jpeg",
  "/images/members/member-3.jpeg",
  "/images/interview-1-thumb.webp",
  "/images/interview-2-thumb.webp",
];

const AVATARS = MEMBER_AVATARS;

// ─── Hero (locked) ────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative flex min-h-[max(88vh,640px)] items-center justify-center overflow-hidden pb-36 pt-24 sm:pt-32">
      <Image
        src="/images/website-hero.webp"
        alt=""
        fill
        className="hero-ken-burns object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/55" />
      <div className="relative z-30 w-full px-5 text-center sm:px-6">
        <HeroHeadline />
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
          className="mx-auto mt-5 max-w-xl text-sm font-medium leading-snug text-white/80 sm:mt-6 sm:text-lg"
        >
          Rooms come furnished. Friends come included.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.35, ease: "easeOut" }}
          className="mx-auto mt-5 flex flex-col items-center justify-center gap-2 sm:mt-8 sm:flex-row sm:gap-3"
        >
          <div className="flex -space-x-2">
            {AVATARS.map((src, i) => (
              <span
                key={i}
                className="relative inline-block h-8 w-8 overflow-hidden rounded-full ring-2 ring-white/90 shadow-md sm:h-10 sm:w-10"
              >
                <Image src={src} alt="" fill className="object-cover" sizes="48px" />
              </span>
            ))}
          </div>
          <span className="text-[11px] font-semibold text-white/90 sm:text-xs">
            + 295 more members
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.55, ease: "easeOut" }}
          className="mx-auto mt-8 max-w-md sm:mt-12"
        >
          <p className="mb-4 text-sm font-semibold text-white sm:mb-5 sm:text-lg">
            How long do you want to stay?
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <div className="w-full rounded-[5px] border-2 border-white bg-white/10 px-6 py-3.5 text-sm font-extrabold tracking-wide text-white backdrop-blur-sm sm:flex sm:w-auto sm:min-w-[210px] sm:flex-col sm:gap-0.5 sm:px-8 sm:py-4 sm:text-base">
              <span>SHORT</span>
              <span className="text-xs font-medium sm:text-sm">
                <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>up to 3 months
              </span>
            </div>
            <div className="w-full rounded-[5px] border-2 border-white bg-white/10 px-6 py-3.5 text-sm font-extrabold tracking-wide text-white backdrop-blur-sm sm:flex sm:w-auto sm:min-w-[210px] sm:flex-col sm:gap-0.5 sm:px-8 sm:py-4 sm:text-base">
              <span>LONG</span>
              <span className="text-xs font-medium sm:text-sm">
                <span className="sm:hidden">&nbsp;&middot;&nbsp;</span>stay 3+ months
              </span>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}

// ─── Reusable bits ───────────────────────────────────────────

const cardClass =
  "group relative w-[85vw] flex-shrink-0 overflow-hidden rounded-[5px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:w-[340px]";

function StayBadge({ stayType }: { stayType: "SHORT" | "LONG" }) {
  return (
    <span
      className={`rounded-[5px] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${
        stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white"
      }`}
    >
      {stayType === "SHORT" ? "SHORT" : "LONG"}
    </span>
  );
}

function PriceChip({
  loc,
  hoverDark = true,
}: {
  loc: (typeof locations)[number];
  hoverDark?: boolean;
}) {
  return (
    <span
      className={`rounded-[5px] bg-white/90 px-2.5 py-1 text-xs font-bold text-black shadow-sm backdrop-blur-sm ${hoverDark ? "transition-colors duration-300 group-hover:bg-black group-hover:text-white" : ""}`}
    >
      from &euro;{loc.priceFrom}
      {loc.stayType === "SHORT" ? "/night" : "/mo"}
    </span>
  );
}

function PriceInline({ loc }: { loc: (typeof locations)[number] }) {
  return (
    <span className="inline-block rounded-[5px] bg-white/20 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm">
      from &euro;{loc.priceFrom}
      {loc.stayType === "SHORT" ? "/night" : "/mo"}
    </span>
  );
}

function AvailableLine({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
      </span>
      <span className="text-[11px] font-semibold text-white">
        {count} {count === 1 ? "room" : "rooms"} available now
      </span>
    </div>
  );
}

function AvailableChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-pink px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-md">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      {count} {count === 1 ? "room" : "rooms"}
    </span>
  );
}

function AvatarsLine({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {MEMBER_AVATARS.slice(0, Math.min(3, count + 1)).map((src, i) => (
          <span
            key={i}
            className="relative inline-block h-7 w-7 overflow-hidden rounded-full ring-2 ring-white/90"
          >
            <Image src={src} alt="" fill className="object-cover" sizes="28px" />
          </span>
        ))}
      </div>
      <span className="text-[11px] font-medium text-white/85">
        {count} new {count === 1 ? "resident" : "residents"} this month
      </span>
    </div>
  );
}

function CityKicker({ city }: { city: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
      {city === "hamburg" ? "Hamburg" : city === "berlin" ? "Berlin" : "Vallendar"}
    </p>
  );
}

function NameBig({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-1 text-2xl font-extrabold leading-tight text-white sm:text-[1.625rem]">
      {children}
    </h3>
  );
}

function PhotoBg({ loc }: { loc: (typeof locations)[number] }) {
  return (
    <>
      <Image
        src={loc.images[0]}
        alt={loc.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="340px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
    </>
  );
}

function FindRoomCTA() {
  return (
    <Link
      href="/move-in"
      className="group relative flex w-[85vw] flex-shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-black shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] sm:w-[340px]"
    >
      <div className="relative flex aspect-[3/4] flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          FIND
          <br />
          YOUR
          <br />
          ROOM
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-white px-6 py-3 text-sm font-bold text-black transition-transform duration-300 group-hover:scale-110">
          <ArrowRight size={16} />
        </div>
      </div>
    </Link>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-[#FAFAFA] pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto pb-4">{children}</div>
      </div>
    </section>
  );
}

function VariantLabel({ letter, title, desc }: { letter: string; title: string; desc?: string }) {
  return (
    <div className="bg-black px-6 py-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
        Layout {letter}
      </p>
      <p className="mt-1 text-base font-extrabold text-white sm:text-lg">{title}</p>
      {desc && <p className="mt-1 text-xs text-white/60">{desc}</p>}
    </div>
  );
}

// ─── Layout A — Price top-right · all bottom info ───
// Top-left: SHORT badge · Top-right: price chip
// Bottom: city → name → avatars+residents → rooms-available
function CardA({ loc }: { loc: (typeof locations)[number] }) {
  const s = STATS[loc.slug];
  return (
    <div className="relative aspect-[3/4] overflow-hidden">
      <PhotoBg loc={loc} />
      <div className="absolute left-3 top-3"><StayBadge stayType={loc.stayType} /></div>
      <div className="absolute right-3 top-3"><PriceChip loc={loc} /></div>
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <CityKicker city={loc.city} />
        <NameBig>{loc.name}</NameBig>
        {s.newResidents > 0 && <div className="mt-3"><AvatarsLine count={s.newResidents} /></div>}
        {s.available > 0 && (
          <div className={s.newResidents > 0 ? "mt-2" : "mt-3"}>
            <AvailableLine count={s.available} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Layout B — Rooms top-right · price bottom inline ───
// Pink "X rooms" chip is the headline scarcity signal up top.
// Price stays inside the bottom block as a frosted-glass pill.
function CardB({ loc }: { loc: (typeof locations)[number] }) {
  const s = STATS[loc.slug];
  return (
    <div className="relative aspect-[3/4] overflow-hidden">
      <PhotoBg loc={loc} />
      <div className="absolute left-3 top-3"><StayBadge stayType={loc.stayType} /></div>
      {s.available > 0 && (
        <div className="absolute right-3 top-3"><AvailableChip count={s.available} /></div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <CityKicker city={loc.city} />
        <NameBig>{loc.name}</NameBig>
        {s.newResidents > 0 && <div className="mt-3"><AvatarsLine count={s.newResidents} /></div>}
        <div className={s.newResidents > 0 ? "mt-3" : "mt-3"}>
          <PriceInline loc={loc} />
        </div>
      </div>
    </div>
  );
}

// ─── Layout C — Both corners carry chips · bottom story-only ───
// Top-left badge + bottom-left chip stack OFF — instead: top-left
// SHORT, top-right rooms-available chip, price moves to BOTTOM-RIGHT
// inside the bottom-area opposite the avatars.
function CardC({ loc }: { loc: (typeof locations)[number] }) {
  const s = STATS[loc.slug];
  return (
    <div className="relative aspect-[3/4] overflow-hidden">
      <PhotoBg loc={loc} />
      <div className="absolute left-3 top-3"><StayBadge stayType={loc.stayType} /></div>
      {s.available > 0 && (
        <div className="absolute right-3 top-3"><AvailableChip count={s.available} /></div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <CityKicker city={loc.city} />
        <NameBig>{loc.name}</NameBig>
        <div className="mt-3 flex items-end justify-between gap-3">
          {s.newResidents > 0 ? (
            <AvatarsLine count={s.newResidents} />
          ) : (
            <span />
          )}
          <PriceInline loc={loc} />
        </div>
      </div>
    </div>
  );
}

// ─── Layout D — Stacked top-left · price top-right · bottom is people ───
// SHORT badge AND rooms-available chip stack vertically top-left.
// Price sits top-right alone. Bottom area is purely the "who lives
// here" story (city, name, avatars).
function CardD({ loc }: { loc: (typeof locations)[number] }) {
  const s = STATS[loc.slug];
  return (
    <div className="relative aspect-[3/4] overflow-hidden">
      <PhotoBg loc={loc} />
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        <StayBadge stayType={loc.stayType} />
        {s.available > 0 && <AvailableChip count={s.available} />}
      </div>
      <div className="absolute right-3 top-3"><PriceChip loc={loc} /></div>
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <CityKicker city={loc.city} />
        <NameBig>{loc.name}</NameBig>
        {s.newResidents > 0 && <div className="mt-3"><AvatarsLine count={s.newResidents} /></div>}
      </div>
    </div>
  );
}

// ─── Layout E — Minimal top · everything bottom (single block) ───
// Only SHORT badge top-left. All info compact at bottom: city, name,
// avatars, and a single info row "X rooms · €Y/mo".
function CardE({ loc }: { loc: (typeof locations)[number] }) {
  const s = STATS[loc.slug];
  return (
    <div className="relative aspect-[3/4] overflow-hidden">
      <PhotoBg loc={loc} />
      <div className="absolute left-3 top-3"><StayBadge stayType={loc.stayType} /></div>
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <CityKicker city={loc.city} />
        <NameBig>{loc.name}</NameBig>
        {s.newResidents > 0 && <div className="mt-3"><AvatarsLine count={s.newResidents} /></div>}
        <div className="mt-3 flex items-center gap-3">
          {s.available > 0 && <AvailableLine count={s.available} />}
          {s.available > 0 && <span className="h-3 w-px bg-white/30" />}
          <span className="text-[11px] font-bold text-white">
            from &euro;{loc.priceFrom}
            {loc.stayType === "SHORT" ? "/night" : "/mo"}
          </span>
        </div>
      </div>
    </div>
  );
}

function CardCarousel({ Card }: { Card: React.ComponentType<{ loc: (typeof locations)[number] }> }) {
  return (
    <Section>
      {locations.map((loc) => (
        <Link key={loc.slug} href={`/locations/${loc.slug}`} className={cardClass}>
          <Card loc={loc} />
        </Link>
      ))}
      <FindRoomCTA />
    </Section>
  );
}

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <VariantLabel
        letter="A"
        title="Price top-right · everything else bottom"
        desc="SHORT-left · price-right · bottom: city → name → avatars → rooms"
      />
      <HeroSection />
      <CardCarousel Card={CardA} />

      <VariantLabel
        letter="B"
        title="Rooms top-right (urgency-forward) · price inline at bottom"
        desc="SHORT-left · pink rooms-chip right · bottom: city → name → avatars → price"
      />
      <HeroSection />
      <CardCarousel Card={CardB} />

      <VariantLabel
        letter="C"
        title="Rooms top-right · price bottom-right opposite avatars"
        desc="SHORT-left · rooms-right · bottom row splits: avatars left, price right"
      />
      <HeroSection />
      <CardCarousel Card={CardC} />

      <VariantLabel
        letter="D"
        title="Stacked top-left (badge + rooms) · price top-right · bottom = people only"
        desc="SHORT and rooms stack top-left · price top-right · bottom is pure social proof"
      />
      <HeroSection />
      <CardCarousel Card={CardD} />

      <VariantLabel
        letter="E"
        title="Minimal corners · everything bottom (compact)"
        desc="Only SHORT-left · bottom: city → name → avatars → 'X rooms · €Y' single row"
      />
      <HeroSection />
      <CardCarousel Card={CardE} />
    </main>
  );
}
