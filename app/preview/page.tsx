"use client";

// Dev-only preview, Testimonials (T1/T2/T3) + About (A1/A2/A3/A4)
// variants for the homepage closing block. Open /preview manually.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { clsx } from "clsx";

const TESTIMONIALS = [
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

function VariantLabel({
  n,
  title,
  desc,
}: {
  n: string;
  title: string;
  desc?: string;
}) {
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

function VideoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
      >
        Close
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

/* ================================================================== */
/* T1, Editorial Story Strip
   Three horizontal bands stacked, alternating polaroid-left / quote-
   right. Click polaroid → modal video. Pink quote-marks bracket each
   pull-quote. Magazine-spread vibe.
/* ================================================================== */
function T1() {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Member stories
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            What it actually feels like to{" "}
            <span className="italic font-light">live</span> here.
          </h2>
          <p className="mt-3 text-sm text-gray sm:text-base">
            Three members. Three stories. Click a polaroid to play.
          </p>
        </div>

        <div className="mt-16 space-y-12 sm:space-y-20">
          {TESTIMONIALS.map((t, i) => {
            const reversed = i % 2 === 1;
            const rotate = i % 2 === 0 ? "-rotate-2" : "rotate-1";
            return (
              <div
                key={t.name}
                className="grid items-center gap-8 sm:grid-cols-2 sm:gap-12 lg:gap-16"
              >
                {/* Polaroid */}
                <button
                  onClick={() => setPlaying(t.video)}
                  className={clsx(
                    "group relative w-full max-w-[420px] justify-self-center bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-transform duration-500 hover:rotate-0 hover:scale-[1.02] sm:p-4",
                    rotate,
                    reversed && "sm:order-2",
                  )}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-black">
                    <Image
                      src={t.thumb}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="(min-width: 640px) 420px, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <span className="absolute right-3 top-3 rounded-[3px] bg-pink px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black">
                      0{i + 1} / 03
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
                        <Play size={20} className="ml-1 fill-black text-black" />
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-gray">
                    {t.name} · {t.desc.split(",")[0]}
                  </p>
                </button>

                {/* Pull-quote */}
                <div className={clsx(reversed && "sm:order-1")}>
                  <span
                    aria-hidden
                    className="block font-serif text-7xl leading-none text-pink/60 sm:text-8xl"
                  >
                    &ldquo;
                  </span>
                  <p className="mt-2 text-2xl font-light italic leading-tight text-black sm:text-4xl">
                    {t.quote}
                  </p>
                  <span
                    aria-hidden
                    className="mt-2 block text-right font-serif text-7xl leading-none text-pink/60 sm:text-8xl"
                  >
                    &rdquo;
                  </span>
                  <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em]">
                    {t.name}, {t.age}
                  </p>
                  <p className="mt-1 text-xs italic text-gray">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {playing && <VideoModal src={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
}

/* ================================================================== */
/* T2, Single Hero Interview + Link-Out
   One big cinematic interview (Jihane), full-bleed thumbnail with
   gradient + pull-quote overlaid. Single play button. Below: a tiny
   "See all member stories →" link to a dedicated /members page.
   Cuts the section to ~50% of the current height.
/* ================================================================== */
function T2() {
  const [playing, setPlaying] = useState<string | null>(null);
  const featured = TESTIMONIALS[0];
  return (
    <section className="bg-black px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
            Member stories
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            One story.{" "}
            <span className="italic font-light">In her own words.</span>
          </h2>
        </div>

        <button
          onClick={() => setPlaying(featured.video)}
          className="group relative mt-12 block aspect-[16/9] w-full overflow-hidden rounded-[5px] bg-black"
        >
          <Image
            src={featured.thumb}
            alt={featured.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl transition-transform group-hover:scale-110 sm:h-24 sm:w-24">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
              <Play size={28} className="relative ml-1 fill-black text-black" />
            </span>
          </span>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-left sm:p-10">
            <span
              aria-hidden
              className="font-serif text-5xl leading-none text-pink sm:text-7xl"
            >
              &ldquo;
            </span>
            <p className="-mt-3 max-w-2xl text-2xl font-light italic leading-tight text-white sm:text-4xl">
              {featured.quote}
            </p>
            <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-pink">
              {featured.name}, {featured.age} · {featured.desc}
            </p>
          </div>
        </button>

        <div className="mt-8 text-center">
          <Link
            href="/members"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-pink"
          >
            See all member stories
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
      {playing && <VideoModal src={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
}

/* ================================================================== */
/* T3, Quote-First, Video Secondary
   The pull-quote is the star: huge italic centred text bracketed by
   pink quote-marks. Underneath, a horizontal strip of three small
   video thumbnails. Click a thumb → quote + featured member rotates
   AND modal opens. Quote is the brand statement; videos are evidence.
/* ================================================================== */
function T3() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const active = TESTIMONIALS[activeIdx];
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
          Member stories
        </p>
        <div className="mt-8">
          <span
            aria-hidden
            className="block font-serif text-8xl leading-none text-pink/70 sm:text-[140px]"
          >
            &ldquo;
          </span>
          <p
            key={activeIdx}
            className="mx-auto -mt-4 max-w-3xl text-3xl font-light italic leading-[1.15] tracking-tight text-black sm:text-5xl lg:text-6xl"
            style={{ animation: "fadeSlide 0.4s ease-out" }}
          >
            {active.quote}
          </p>
          <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-black">
           , {active.name}, {active.age}
          </p>
          <p className="mt-1 text-xs italic text-gray">{active.desc}</p>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-3">
        {TESTIMONIALS.map((t, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={t.name}
              onClick={() => {
                if (isActive) setPlaying(t.video);
                else setActiveIdx(i);
              }}
              className={clsx(
                "group relative aspect-[4/5] overflow-hidden rounded-[5px] bg-black transition-all",
                isActive ? "ring-2 ring-pink shadow-[0_8px_30px_rgba(252,176,192,0.45)]" : "ring-1 ring-black/10 opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={t.thumb}
                alt={t.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 640px) 240px, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-xl">
                    <Play size={16} className="ml-0.5 fill-black text-black" />
                  </span>
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 text-left">
                <p className="text-xs font-bold text-white">{t.name}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-gray">
        {activeIdx === 0 ? "Click a face to switch the quote · click again to play" : "Click again to play the interview"}
      </p>
      {playing && <VideoModal src={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
}

/* ================================================================== */
/* A1, Editorial Manifesto + Stat Tiles
   Pink eyebrow, italic-keyword headline, 4 stat tiles in a row,
   1-line manifesto, small team-photo strip, "Meet the team" link.
   Replaces the soft "we believe home is more than four walls" copy.
/* ================================================================== */
function A1() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
          Hamburg, since 2019
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          We build homes for people who&rsquo;d rather{" "}
          <span className="italic font-light">meet someone</span> than scroll someone.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-gray sm:text-base">
          Six years, three cities, and a single thesis: city living should be
          about the people, not the paperwork.
        </p>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: "8", l: "Homes" },
            { n: "3", l: "Cities" },
            { n: "300+", l: "Members" },
            { n: "1", l: "Promise" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-[5px] bg-white p-5 ring-1 ring-black/5 shadow-sm sm:p-6"
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

        <div className="relative mx-auto mt-12 aspect-[16/6] max-w-3xl overflow-hidden rounded-[5px]">
          <Image
            src="/images/stacey-team.webp"
            alt="The STACEY team"
            fill
            className="object-cover"
            sizes="(min-width: 640px) 768px, 100vw"
          />
        </div>

        <div className="mt-8">
          <Link
            href="/why-stacey"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-80"
          >
            Meet the team
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* A2, Postcard from Hamburg
   Tilted polaroid-style postcard, centred, with team photo + handwritten-
   feel overlay text + a postage-stamp graphic. "Greetings from
   Hamburg" tonality. Pairs with the boarding-pass / journey DNA.
/* ================================================================== */
function A2() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
          A note from us
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          Greetings from{" "}
          <span className="italic font-light">Hamburg</span>.
        </h2>
      </div>

      <div className="mx-auto mt-14 max-w-2xl">
        <div className="relative -rotate-1 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.15)] sm:p-8">
          {/* Postage stamp */}
          <div className="absolute right-4 top-4 -rotate-6 rounded-[3px] border-2 border-dashed border-pink bg-white px-2 py-1 text-center sm:right-6 sm:top-6">
            <p className="font-mono text-[8px] font-black uppercase tracking-[0.15em] text-pink">
              Stacey
            </p>
            <p className="font-mono text-[14px] font-black leading-none">2019</p>
            <p className="font-mono text-[7px] uppercase tracking-[0.15em] text-gray">
              Hamburg ★ DE
            </p>
          </div>

          <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr] sm:gap-8">
            <div className="relative aspect-square overflow-hidden rounded-[3px]">
              <Image
                src="/images/stacey-team.webp"
                alt="The STACEY team"
                fill
                className="object-cover"
                sizes="180px"
              />
            </div>
            <div className="text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray">
                Postmarked Hamburg · 2019
              </p>
              <p className="mt-3 text-base leading-relaxed text-black sm:text-lg">
                We started small in Winterhude, one apartment, eight friends,
                and the simple idea that city living should feel less like a
                contract and more like coming home.
              </p>
              <p className="mt-3 text-base leading-relaxed text-black sm:text-lg">
                Six years later, we&rsquo;re in three cities, with hundreds of
                members. The mission hasn&rsquo;t changed.
              </p>
              <p className="mt-4 italic text-sm text-pink">, Team STACEY</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-black/10 pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray">
              ✉ Hamburg · Berlin · Vallendar
            </p>
            <Link
              href="/why-stacey"
              className="inline-flex items-center gap-1 text-sm font-semibold text-black hover:text-pink"
            >
              Meet the team
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* A3, Founder Quote Spread
   One big italic founder quote front-and-centre, small team photo as
   supporting visual, "Since 2019, Hamburg" tagline. Eliminates the
   soft community copy in favour of a punchier 1-line manifesto.
/* ================================================================== */
function A3() {
  return (
    <section className="bg-black px-4 py-20 text-white sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid items-center gap-12 sm:grid-cols-[1fr_240px] sm:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              Since 2019, Hamburg
            </p>
            <span
              aria-hidden
              className="mt-6 block font-serif text-7xl leading-none text-pink/60 sm:text-9xl"
            >
              &ldquo;
            </span>
            <p className="-mt-3 text-3xl font-light italic leading-tight tracking-tight sm:text-5xl">
              Home isn&rsquo;t a contract.{" "}
              <span className="text-pink">It&rsquo;s the people on your floor.</span>
            </p>
            <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              Team STACEY
            </p>
            <p className="mt-1 text-xs italic text-white/50">
              Founders · Hamburg · 2019
            </p>
            <Link
              href="/why-stacey"
              className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-pink"
            >
              The full story
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-[5px] sm:justify-self-end">
            <Image
              src="/images/stacey-team.webp"
              alt="The STACEY team"
              fill
              className="object-cover"
              sizes="(min-width: 640px) 240px, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* A4, Cut Entirely (Footer Liner Mock)
   Show what the footer brand-statement line would look like if About
   moves to /about. The homepage section vanishes; only this remains.
/* ================================================================== */
function A4() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[5px] border border-dashed border-black/15 p-6 text-center sm:p-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray">
            Mock, appears in the Footer instead of as a section
          </p>
          <p className="mt-4 text-base font-semibold leading-relaxed text-black sm:text-lg">
            STACEY is Hamburg-based, founded 2019.{" "}
            <span className="italic font-light text-pink">
              Coliving for people who&rsquo;d rather meet someone than scroll someone.
            </span>{" "}
            <Link
              href="/why-stacey"
              className="underline decoration-pink underline-offset-4 hover:text-black/70"
            >
              The full story →
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-gray">
          The page becomes 1 section shorter. Brand presence stays via the
          footer line + the dedicated <code className="rounded bg-[#F5F5F5] px-1">/why-stacey</code> route.
        </p>
      </div>
    </section>
  );
}

export default function PreviewPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · take 3
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Closing block ,{" "}
          <span className="italic font-light">Testimonials + About</span>
        </h1>
        <p className="mt-3 text-sm text-gray">
          Drei Testimonial-Layouts (T1/T2/T3), vier About-Optionen
          (A1/A2/A3/A4 cut). Pick a Testimonial-Variante und eine About-Variante
          oder About-Cut. Ich verdrahte die Wahl als neuen Default.
        </p>
      </div>

      <VariantLabel
        n="T1"
        title="Editorial Story Strip, three polaroid + pull-quote bands"
        desc="Drei horizontale Bänder gestapelt, alternierend Polaroid links/rechts. Magazin-Spread. Klick aufs Polaroid öffnet das Interview-Video im Lightbox."
      />
      <T1 />

      <VariantLabel
        n="T2"
        title="Single Hero Interview + Link-Out"
        desc="EIN cinematic Interview groß (Jihane). Pull-Quote überlagert. Tiny Link 'See all member stories →' zur eigenen /members Seite. Halbiert die Sektion."
      />
      <T2 />

      <VariantLabel
        n="T3"
        title="Quote-First, typography hero, video as evidence"
        desc="Riesiges italic Pull-Quote als Hero-Statement. Drei kleine Video-Thumbs als Strip darunter. Klick auf Thumb wechselt das Quote; nochmaliger Klick öffnet das Video. Maximale Lesbarkeit."
      />
      <T3 />

      <VariantLabel
        n="A1"
        title="Editorial Manifesto + Stat Tiles"
        desc="Pink eyebrow + italic-keyword headline. 4 Stat-Tiles (8 homes / 3 cities / 300+ members / 1 promise). Wide team-photo. Konkret, brand-statement-stark."
      />
      <A1 />

      <VariantLabel
        n="A2"
        title="Postcard from Hamburg"
        desc="Polaroid-Style schräg gekippte Postkarte mit Team-Foto + Briefmarken-Stempel + handschriftlichem Tone. Charmant, matcht die Boarding-Pass-Journey-DNA."
      />
      <A2 />

      <VariantLabel
        n="A3"
        title="Founder Quote Spread, black + bold"
        desc="Eine große italic Quote als Manifest auf schwarzem Grund. Kleines Team-Foto rechts als visual anchor. Eliminiert weiches 'community' Copy zugunsten eines 1-Zeilen-Statements."
      />
      <A3 />

      <VariantLabel
        n="A4"
        title="Cut entirely, fold into Footer"
        desc="About-Sektion verschwindet komplett. Stattdessen ein 1-Zeilen Brand-Statement im Footer + eigene /why-stacey Seite für die volle Story. Macht die Homepage 1 Sektion kürzer."
      />
      <A4 />

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-gray">
         , Pick eine Testimonial-Variante (T1/T2/T3) und eine About-Variante
          (A1/A2/A3) oder A4 cut. Sag mir die Kombi. ,
        </p>
      </div>
    </main>
  );
}
