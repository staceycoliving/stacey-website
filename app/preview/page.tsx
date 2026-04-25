"use client";

// Dev-only preview — comparing 4 mega-menu variants for the Hamburg
// dropdown. Each preview shows the pill with the dropdown OPEN
// (in production it opens on hover). Open /preview manually.

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { locations } from "@/lib/data";

const HAMBURG_LOCS = [
  ...locations.filter((l) => l.city === "hamburg" && l.stayType === "SHORT"),
  ...locations.filter((l) => l.city === "hamburg" && l.stayType === "LONG"),
];

const CITIES = [
  { name: "Hamburg", slug: "hamburg" },
  { name: "Berlin", slug: "berlin" },
  { name: "Vallendar", slug: "vallendar" },
];

// ── Shared scaffolds ─────────────────────────────────────────

function StageWithDropdown({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[600px] overflow-hidden">
      <Image src="/images/website-hero.webp" alt="" fill className="object-cover" sizes="100vw" />
      {/* Pill with Hamburg button, fixed at top */}
      <div className="absolute inset-x-4 top-6 z-10 flex justify-center sm:inset-x-8">
        <div className="flex w-full max-w-4xl items-center justify-between gap-4 rounded-[5px] bg-black/60 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.25)] ring-1 ring-white/10 backdrop-blur-xl">
          <div className="relative h-9 w-28 shrink-0">
            <Image
              src="/images/stacey-logo-new-white-001.webp"
              alt="STACEY"
              fill
              className="object-contain object-left"
              sizes="120px"
            />
          </div>
          <div className="hidden items-center gap-1 lg:flex relative">
            {CITIES.map((c, i) => (
              <button
                key={c.slug}
                className={clsx(
                  "flex items-center gap-1 rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-colors",
                  i === 0
                    ? "bg-white/10 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {c.name}
                <ChevronDown
                  size={11}
                  className={clsx("transition-transform duration-200", i === 0 && "rotate-180")}
                />
              </button>
            ))}
            {/* Dropdown anchored under Hamburg button */}
            <div className="absolute left-0 top-full pt-3">{children}</div>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-[4px] bg-pink px-5 py-2 text-sm font-bold text-black hover:scale-[1.04] transition-transform">
            Move in
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ n, title, desc }: { n: string; title: string; desc?: string }) {
  return (
    <div className="bg-black px-6 py-4">
      <div className="mx-auto max-w-7xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Variant {n}
        </p>
        <p className="mt-1 text-base font-extrabold text-white sm:text-lg">{title}</p>
        {desc && <p className="mt-1 text-xs text-white/60">{desc}</p>}
      </div>
    </div>
  );
}

const PinkPulseDot = () => (
  <span className="relative flex h-1.5 w-1.5">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-70" />
    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
  </span>
);

// ── Variant 0 — Baseline (current white) ─────────────────────

function Dropdown0_Baseline() {
  return (
    <div className="rounded-[5px] bg-white p-4 shadow-2xl ring-1 ring-[#E5E5E5]" style={{ width: "360px" }}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray">
        Hamburg · {HAMBURG_LOCS.length} locations
      </p>
      <div className="space-y-1">
        {HAMBURG_LOCS.map((loc) => (
          <div
            key={loc.slug}
            className="flex items-center gap-3 rounded-[5px] p-2 transition-all hover:bg-[#F0F0F0]"
          >
            <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-[3px]">
              <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="56px" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{loc.name}</p>
              <p className="text-[11px] text-gray">
                from €{loc.priceFrom}
                {loc.stayType === "SHORT" ? "/night" : "/mo"}
              </p>
            </div>
            <span
              className={clsx(
                "rounded-[5px] px-2 py-0.5 text-[9px] font-bold",
                loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white",
              )}
            >
              {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Variant 1 — Dark-glass aesthetic match ───────────────────

function Dropdown1_DarkMatch() {
  return (
    <div
      className="rounded-[5px] bg-black/85 p-4 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl"
      style={{ width: "360px" }}
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
        Hamburg · {HAMBURG_LOCS.length} locations
      </p>
      <div className="space-y-1">
        {HAMBURG_LOCS.map((loc) => (
          <div
            key={loc.slug}
            className="flex items-center gap-3 rounded-[5px] p-2 transition-all hover:bg-white/10"
          >
            <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-[3px]">
              <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="56px" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{loc.name}</p>
              <p className="text-[11px] text-white/60">
                from €{loc.priceFrom}
                {loc.stayType === "SHORT" ? "/night" : "/mo"}
              </p>
            </div>
            <span
              className={clsx(
                "rounded-[5px] px-2 py-0.5 text-[9px] font-bold",
                loc.stayType === "SHORT" ? "bg-white text-black" : "bg-pink text-white",
              )}
            >
              {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Variant 2 — Dark-glass + bigger images + live "X rooms" ──

function Dropdown2_BigPlusLive({
  stats,
}: {
  stats: Record<string, { available: number }>;
}) {
  return (
    <div
      className="rounded-[5px] bg-black/85 p-4 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl"
      style={{ width: "440px" }}
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
        Hamburg · {HAMBURG_LOCS.length} locations
      </p>
      <div className="space-y-2">
        {HAMBURG_LOCS.map((loc) => {
          const avail = stats[loc.slug]?.available ?? 0;
          return (
            <div
              key={loc.slug}
              className="flex items-center gap-3 rounded-[5px] p-2 transition-all hover:bg-white/10"
            >
              <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-[3px]">
                <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="112px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{loc.name}</p>
                <p className="text-[11px] text-white/60">
                  from €{loc.priceFrom}
                  {loc.stayType === "SHORT" ? "/night" : "/mo"}
                </p>
                {avail > 0 && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-pink">
                    <PinkPulseDot />
                    {avail} {avail === 1 ? "room" : "rooms"} available
                  </span>
                )}
              </div>
              <span
                className={clsx(
                  "rounded-[5px] px-2 py-0.5 text-[9px] font-bold",
                  loc.stayType === "SHORT" ? "bg-white text-black" : "bg-pink text-white",
                )}
              >
                {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Variant 3 — All of #2 + 2-col grid + active state + kicker ─

function Dropdown3_TwoCol({
  stats,
  activeSlug,
  totalMembers,
}: {
  stats: Record<string, { available: number; newResidents: number }>;
  activeSlug: string;
  totalMembers: number;
}) {
  return (
    <div
      className="rounded-[5px] bg-black/85 p-4 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl"
      style={{ width: "560px" }}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
          Hamburg · {HAMBURG_LOCS.length} locations
        </p>
        <p className="text-[10px] font-medium text-white/40">+ {totalMembers} members</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {HAMBURG_LOCS.map((loc) => {
          const avail = stats[loc.slug]?.available ?? 0;
          const isActive = loc.slug === activeSlug;
          return (
            <div
              key={loc.slug}
              className={clsx(
                "flex flex-col gap-2 overflow-hidden rounded-[5px] p-2 transition-all hover:bg-white/10",
                isActive && "bg-white/5 ring-1 ring-pink/50",
              )}
            >
              <div className="relative aspect-[3/2] overflow-hidden rounded-[3px]">
                <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="240px" />
                <div className="absolute left-1.5 top-1.5">
                  <span
                    className={clsx(
                      "rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white",
                    )}
                  >
                    {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={clsx(
                    "truncate text-sm",
                    isActive ? "font-extrabold text-white" : "font-bold text-white",
                  )}
                >
                  {loc.name}
                </p>
                <p className="shrink-0 text-[10px] font-bold text-white/70">
                  €{loc.priceFrom}
                  {loc.stayType === "SHORT" ? "/n" : "/mo"}
                </p>
              </div>
              {avail > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-pink">
                  <PinkPulseDot />
                  {avail} {avail === 1 ? "room" : "rooms"}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-white/40">Fully booked</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function PreviewPage() {
  const [stats, setStats] = useState<Record<string, { available: number; newResidents: number }>>({});

  useEffect(() => {
    fetch("/api/locations/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok) setStats(res.data ?? {});
      })
      .catch(() => {});
  }, []);

  const totalHamburgMembers = HAMBURG_LOCS.reduce(
    (sum, loc) => sum + (stats[loc.slug]?.newResidents ?? 0),
    0,
  );

  return (
    <main className="bg-white pt-6">
      <div className="mx-auto max-w-3xl px-6 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Mega-menu — <span className="italic font-light">dropdown ideas</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Each variant shows the Hamburg dropdown forced open under the
          floating pill. Live availability comes from /api/locations/stats.
        </p>
      </div>

      <Label
        n="0"
        title="Baseline — current white dropdown (40×56 thumbnails)"
        desc="What ships now. Visual jolt from dark-glass pill to bright-white panel."
      />
      <StageWithDropdown>
        <Dropdown0_Baseline />
      </StageWithDropdown>

      <Label
        n="1"
        title="Dark-glass match (same sizes, same content)"
        desc="Just style — bg-black/85 + backdrop-blur. Pill and dropdown read as one composed unit."
      />
      <StageWithDropdown>
        <Dropdown1_DarkMatch />
      </StageWithDropdown>

      <Label
        n="2"
        title="Dark-glass + bigger images (80×112) + live rooms-available"
        desc="Premium feel + actionable live data. Wider dropdown (440px). Each row gets a pink-pulse 'X rooms available' chip."
      />
      <StageWithDropdown>
        <Dropdown2_BigPlusLive stats={stats} />
      </StageWithDropdown>

      <Label
        n="3"
        title="Editorial 2-col grid for Hamburg + active state + members kicker"
        desc="Big 3:2 image cards. Hamburg's 6 locations fit a 3-row × 2-col grid (560px wide). Active location (Alster mocked) gets pink ring."
      />
      <StageWithDropdown>
        <Dropdown3_TwoCol
          stats={stats}
          activeSlug="alster"
          totalMembers={totalHamburgMembers}
        />
      </StageWithDropdown>

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
          — Pick the winner. I&apos;d also wire Berlin / Vallendar to the same style. —
        </p>
      </div>
    </main>
  );
}
