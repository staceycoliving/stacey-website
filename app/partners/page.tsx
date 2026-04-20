import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  Zap,
  Building2,
  MapPin,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FadeIn from "@/components/ui/FadeIn";
import PartnersForm from "@/components/partners/PartnersForm";

export const metadata: Metadata = {
  title: "For Partners",
  description:
    "Partner with STACEY Coliving. Long-term master lease, no vacancy risk, a proven operator running short-stay and long-stay under one brand in Hamburg, Berlin and Vallendar.",
  alternates: { canonical: "/partners" },
};

const kpis = [
  { value: "9", label: "Locations" },
  { value: "3", label: "Cities" },
  { value: "300+", label: "Members" },
  { value: "2019", label: "Since" },
];

const benefits = [
  {
    icon: <Shield size={20} />,
    title: "Predictable income",
    text:
      "One master lease covers the entire building. We pay you every month — regardless of occupancy. You transfer tenant and vacancy risk to us.",
  },
  {
    icon: <Clock size={20} />,
    title: "Up to 20-year leases",
    text:
      "Long-term master agreements with option periods. Planning certainty for your asset and alignment between operator and owner.",
  },
  {
    icon: <Zap size={20} />,
    title: "Short + Long under one brand",
    text:
      "We run both formats — often in the same city. Higher blended occupancy, optimal pricing per season, and a much more resilient cashflow than pure-play competitors.",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Higher yield per sqm",
    text:
      "Furnished coliving and serviced-apartments typically generate materially higher rent per square meter than traditional lettings in the same location. We'll model the delta on your specific asset.",
  },
  {
    icon: <Users size={20} />,
    title: "Hands-off operations",
    text:
      "Marketing, leasing, onboarding, cleaning, maintenance, community — all on us. No more tenant complaints or move-out inspections on your side.",
  },
  {
    icon: <CheckCircle2 size={20} />,
    title: "Compliance first",
    text:
      "We operate within short-term rental, Fremdenverkehr and residential regulations of each city. Audit-ready bookkeeping, GDPR-compliant data, eIDAS lease signatures.",
  },
];

const featuredProjects = [
  {
    name: "Mühlenkamp",
    city: "Hamburg",
    year: 2019,
    suites: 74,
    format: "Long-stay",
    heroImage: "/images/locations/muehlenkamp/community/01-muehlenkamp.webp",
    story:
      "Our flagship. A converted commercial building in Winterhude turned into 74 private suites and 150 m² of community space. Home to dozens of professionals and founders from 30+ countries.",
  },
  {
    name: "Mitte",
    city: "Berlin",
    year: 2023,
    suites: 65,
    format: "Long-stay",
    heroImage: "/images/locations/berlin-mitte/community/13-berlin.webp",
    story:
      "On Fischerinsel between Alexanderplatz and Museumsinsel. The most central coliving address in Berlin — studios and shared flats with mostly 1:1 roommate ratios. Filled within weeks of opening.",
  },
  {
    name: "Alster",
    city: "Hamburg",
    year: 2022,
    suites: 13,
    format: "Short-stay",
    heroImage: "/images/locations/alster/community/01-community-al.webp",
    story:
      "A converted office in St. Georg, run purely as short-stay. Demonstrates our dual-format capability — same brand, same standards, different revenue profile.",
  },
];

const propertyFit = [
  {
    icon: <Building2 size={20} />,
    title: "Size",
    text: "Entire buildings or self-contained wings with 20+ bedrooms. Sweet spot: 40–120 suites.",
  },
  {
    icon: <Users size={20} />,
    title: "Layout",
    text: "Minimum bathroom ratio 1:4. Residential or convertible commercial zoning both work.",
  },
  {
    icon: <MapPin size={20} />,
    title: "Location",
    text: "Central, walkable neighborhoods close to public transport, restaurants and employers.",
  },
  {
    icon: <Shield size={20} />,
    title: "Markets",
    text: "Hamburg, Berlin, Vallendar — plus selected Tier-1 and Tier-2 German and European cities.",
  },
];

const press = [
  { name: "Die Welt", src: "/images/press/die-welt.svg" },
  { name: "Hamburger Abendblatt", src: "/images/press/hamburger-abendblatt.svg" },
  { name: "Handelsblatt", src: "/images/press/handelsblatt.svg" },
];

export default function PartnersPage() {
  return (
    <>
      <Navbar />

      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pt-28">
        {/* Decorative BG image */}
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <Image
            src="/images/locations/muehlenkamp/community/04-muehlenkamp.webp"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/80 via-[#1A1A1A]/60 to-[#1A1A1A]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-20 text-center sm:px-6 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-pink">
            For Real Estate Partners
          </p>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            We lease. We operate.<br />
            <span className="italic font-light">You just collect rent.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            STACEY designs, leases and manages multifamily properties as
            full-building coliving operators. One master lease, long-term
            cashflow, zero tenant headaches.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#inquiry"
              className="inline-flex items-center gap-2 rounded-[5px] bg-pink px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-95"
            >
              Start the conversation <ArrowRight size={15} />
            </Link>
            <a
              href="mailto:booking@stacey.de"
              className="text-sm font-semibold text-white/70 hover:text-white"
            >
              or email booking@stacey.de
            </a>
          </div>
        </div>

        {/* KPI Bar — Boarding Pass style */}
        <div className="relative mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="relative overflow-hidden rounded-[5px] border-2 border-dashed border-white/20 bg-white/[0.04] p-5 text-center backdrop-blur-sm"
              >
                <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#1A1A1A]" />
                <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#1A1A1A]" />
                <p className="text-3xl font-extrabold text-white sm:text-4xl">
                  {k.value}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {k.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRESS BAR ─────────────────────────────────── */}
      <section className="bg-white py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
            As featured in
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
            {press.map((p) => (
              <div key={p.name} className="relative h-7 w-32 grayscale">
                <Image
                  src={p.src}
                  alt={p.name}
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE OPPORTUNITY ─────────────────────────────── */}
      <section className="bg-[#FAFAFA] py-20">
        <FadeIn>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2 sm:gap-14">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[5px]">
                <Image
                  src="/images/locations/berlin-mitte/community/14-berlin.webp"
                  alt="STACEY Berlin Mitte community space"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
                  The opportunity
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  The fastest-growing<br />
                  <span className="italic font-light">rental segment.</span>
                </h2>
                <p className="mt-5 text-sm leading-relaxed text-gray">
                  Europe&apos;s cities are structurally under-supplied for the way
                  young professionals actually want to live today: furnished,
                  digital, community-driven, flexible in duration. Owners who
                  adapt unlock higher rent per square meter and far more
                  resilient occupancy curves.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray">
                  STACEY sits at the intersection of{" "}
                  <strong className="text-black">serviced apartments</strong>{" "}
                  (short-stay) and{" "}
                  <strong className="text-black">coliving</strong> (long-stay)
                  — and we run both, since 2019.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── THE EDGE: Short + Long split ───────────────── */}
      <section className="bg-white py-20">
        <FadeIn>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
                Our edge
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Two business models,<br />
                <span className="italic font-light">one asset.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray">
                Pure-play operators can only optimize for one revenue curve.
                We blend both — stabilising income across cycles.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto_1fr]">
              {/* Long stay card */}
              <div className="rounded-[5px] border border-lightgray bg-white p-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
                  Long-stay
                </p>
                <h3 className="mt-3 text-2xl font-extrabold tracking-tight">
                  Coliving, <span className="italic font-light">3+ months.</span>
                </h3>
                <ul className="mt-5 space-y-2.5 text-sm text-gray">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink" />
                    <span>Stable base occupancy of long-term members</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink" />
                    <span>Lower churn, deep community effects</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink" />
                    <span>Monthly billing, SEPA direct debit</span>
                  </li>
                </ul>
              </div>

              {/* Plus sign */}
              <div className="hidden items-center justify-center md:flex">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink/20 text-2xl font-extrabold text-black">
                  +
                </div>
              </div>

              {/* Short stay card */}
              <div className="rounded-[5px] border border-lightgray bg-white p-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
                  Short-stay
                </p>
                <h3 className="mt-3 text-2xl font-extrabold tracking-tight">
                  Serviced, <span className="italic font-light">from 5 nights.</span>
                </h3>
                <ul className="mt-5 space-y-2.5 text-sm text-gray">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink" />
                    <span>Premium per-night rates in peak season</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink" />
                    <span>Business + leisure travel mix</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink" />
                    <span>Channel distribution + direct bookings</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── BENEFITS ────────────────────────────────────── */}
      <section className="bg-[#FAFAFA] py-20">
        <FadeIn>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
                Why STACEY
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Built around<br />
                <span className="italic font-light">owner economics.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                Our entire business model is designed so that your building
                performs better with us than without us — structurally, not
                just on a good month.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b) => (
                <div
                  key={b.title}
                  className="group rounded-[5px] bg-white p-6 transition-transform duration-200 hover:-translate-y-1"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink/20 text-black">
                    {b.icon}
                  </span>
                  <h3 className="mt-4 text-base font-bold">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray">
                    {b.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── FEATURED PROJECTS ───────────────────────────── */}
      <section className="bg-white py-20">
        <FadeIn>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
              Selected projects
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              What we&apos;ve<br />
              <span className="italic font-light">already built.</span>
            </h2>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {featuredProjects.map((p) => (
                <div
                  key={p.name}
                  className="group relative overflow-hidden rounded-[5px] bg-[#1A1A1A]"
                >
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={p.heroImage}
                      alt={`STACEY ${p.name}`}
                      fill
                      className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/50 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <span className="inline-block rounded-[5px] bg-pink px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                      {p.format}
                    </span>
                    <h3 className="mt-3 text-2xl font-extrabold tracking-tight">
                      {p.name}
                    </h3>
                    <p className="text-sm font-semibold text-white/60">
                      {p.city} · Opened {p.year} · {p.suites} suites
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-white/75">
                      {p.story}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── PROPERTY FIT ────────────────────────────────── */}
      <section className="bg-[#FAFAFA] py-20">
        <FadeIn>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
                Property fit
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                What we<br />
                <span className="italic font-light">look for.</span>
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {propertyFit.map((r) => (
                <div
                  key={r.title}
                  className="rounded-[5px] bg-white p-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink/20 text-black">
                    {r.icon}
                  </span>
                  <h3 className="mt-3 text-sm font-bold">{r.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray">
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── INQUIRY FORM ────────────────────────────────── */}
      <section id="inquiry" className="bg-white py-20">
        <FadeIn>
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
              Start the conversation
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tell us about your<br />
              <span className="italic font-light">property.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray">
              We typically respond within a few business days. For anything
              urgent, write directly to{" "}
              <a
                href="mailto:booking@stacey.de"
                className="font-semibold text-black hover:text-pink"
              >
                booking@stacey.de
              </a>
              .
            </p>
            <div className="mt-8">
              <PartnersForm />
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── CLOSING CTA ─────────────────────────────────── */}
      <section className="bg-pink py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Our members call us <span className="italic font-light">home.</span>
          </h2>
          <p className="mt-3 text-white/80">
            Let&apos;s make yours their next one.
          </p>
          <Link
            href="#inquiry"
            className="mt-8 inline-flex items-center gap-2 rounded-[5px] bg-white px-8 py-3.5 text-sm font-semibold text-pink transition-transform hover:scale-105"
          >
            Get in touch <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
