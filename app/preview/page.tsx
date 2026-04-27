"use client";

// Internal preview, Option C for the /move-in sticky filter bar:
// collapse the current always-expanded pill row into a single summary
// chip that shows the user's current search ("Long stay · Hamburg ·
// May 1 · 1 person · [Edit]"). Tap the chip to slide down a full
// search-editor panel inline. Pattern modelled on Airbnb's mobile
// search header. Faux navbar + faux page content frame the chip so
// the sticky behaviour reads realistically.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, Pencil, Search } from "lucide-react";
import { clsx } from "clsx";

type StayType = "SHORT" | "LONG";
type Persons = 1 | 2;

const CITIES = [
  { value: "hamburg", label: "Hamburg" },
  { value: "berlin", label: "Berlin" },
  { value: "vallendar", label: "Vallendar" },
];

function FauxNavbar() {
  return (
    <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-black px-5 text-white">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Faux navbar (h-16)
        </span>
      </div>
      <span className="text-xs text-white/40">preview</span>
    </div>
  );
}

function FauxResults() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
          Mock content
        </p>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl">
          12 rooms <span className="italic font-light">available</span>
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/2] rounded-[5px] bg-white ring-1 ring-black/8 shadow-[0_4px_18px_rgba(0,0,0,0.05)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Option C, Summary-chip + slide-down editor ─────────────────── */

function SummaryChipBar() {
  const [open, setOpen] = useState(false);
  const [stayType, setStayType] = useState<StayType>("LONG");
  const [persons, setPersons] = useState<Persons>(1);
  const [city, setCity] = useState("hamburg");
  const [moveIn, setMoveIn] = useState("May 1");

  const summary = (() => {
    const parts: string[] = [];
    parts.push(stayType === "SHORT" ? "Short stay" : "Long stay");
    if (stayType === "LONG") parts.push(CITIES.find((c) => c.value === city)?.label ?? "");
    if (stayType === "LONG") parts.push(moveIn);
    parts.push(persons === 1 ? "1 person" : "2 people");
    return parts.filter(Boolean).join(" · ");
  })();

  const segmentTrack = "flex shrink-0 gap-1 rounded-[5px] bg-[#F5F5F5] p-1";
  const segmentBtn = (
    active: boolean,
    accent: "neutral" | "pink" | "black" = "neutral",
  ) =>
    clsx(
      "rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-all duration-150",
      active
        ? accent === "pink"
          ? "bg-pink text-black shadow-sm"
          : accent === "black"
            ? "bg-black text-white shadow-sm"
            : "bg-white text-black shadow-sm"
        : "text-gray hover:text-black",
    );

  return (
    <>
      {/* Sticky summary bar, sits right below the faux navbar. */}
      <div className="sticky top-16 z-30 border-b border-black/5 bg-[#FAFAFA]/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={clsx(
              "group flex w-full items-center gap-3 rounded-[5px] bg-white px-4 py-3 ring-1 transition-all duration-200",
              open
                ? "ring-pink shadow-[0_8px_24px_rgba(252,176,192,0.25)]"
                : "ring-black/8 shadow-[0_4px_18px_rgba(0,0,0,0.06)] hover:scale-[1.01] hover:ring-black/15 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
            )}
            aria-expanded={open}
            aria-controls="search-editor"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pink/15 text-pink">
              <Search size={16} strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-bold text-black sm:text-base">
                {summary}
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-pink">
                {open ? "Tap to close" : "Tap to refine your search"}
              </span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-1.5 rounded-[5px] bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
              <Pencil size={11} strokeWidth={2.4} />
              Edit
            </span>
            <ChevronDown
              size={16}
              className={clsx(
                "flex-shrink-0 text-gray transition-transform duration-300",
                open && "rotate-180 text-black",
              )}
            />
          </button>
        </div>

        {/* Slide-down editor */}
        <div
          id="search-editor"
          className={clsx(
            "mx-auto grid max-w-3xl overflow-hidden transition-all duration-300 ease-out",
            open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="rounded-[5px] bg-white p-4 ring-1 ring-black/8 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <div className="flex flex-wrap items-center gap-3">
                {/* Stay type */}
                <div role="radiogroup" aria-label="Stay type" className={segmentTrack}>
                  {(["SHORT", "LONG"] as StayType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={stayType === t}
                      onClick={() => setStayType(t)}
                      className={segmentBtn(stayType === t, t === "SHORT" ? "black" : "pink")}
                    >
                      {t === "SHORT" ? "Short" : "Long"}
                    </button>
                  ))}
                </div>

                {/* Persons */}
                <div role="radiogroup" aria-label="Persons" className={segmentTrack}>
                  {([1, 2] as Persons[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={persons === p}
                      onClick={() => setPersons(p)}
                      className={segmentBtn(persons === p)}
                    >
                      {p} {p === 1 ? "person" : "people"}
                    </button>
                  ))}
                </div>

                {/* City (LONG only) */}
                {stayType === "LONG" && (
                  <div role="radiogroup" aria-label="City" className={segmentTrack}>
                    {CITIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={city === c.value}
                        onClick={() => setCity(c.value)}
                        className={segmentBtn(city === c.value)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Date trigger (mock for preview) */}
                <button
                  type="button"
                  onClick={() => {
                    const choices = ["May 1", "May 8", "May 15", "Jun 1", "Jul 1"];
                    setMoveIn(choices[(choices.indexOf(moveIn) + 1) % choices.length]);
                  }}
                  className="rounded-[5px] bg-pink px-3 py-2 text-xs font-bold text-black transition-all hover:scale-[1.04]"
                >
                  {stayType === "LONG" ? `Move in: ${moveIn}` : "Apr 30 → May 9"}
                </button>

                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-[5px] bg-black px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.04]"
                  >
                    Apply
                  </button>
                </span>
              </div>
              <p className="mt-3 text-[11px] text-gray">
                Mock-Editor: tap the date pill to cycle through example
                values, tap segments to switch state, &ldquo;Apply&rdquo;
                closes the editor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Page wrapper ───────────────────────────────────────────────── */

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <FauxNavbar />
      <SummaryChipBar />
      <FauxResults />
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
          Internal preview · option C
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Sticky Summary-Chip mit Slide-Down Editor
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray">
          Tap die Chip-Bar oben (sticky unter dem faux navbar). Sie
          schiebt einen full-Editor-Panel runter, gleiche Filter-Pillen
          wie aktuell aber zum Bearbeiten. Erneut tippen oder
          &ldquo;Apply&rdquo; klicken schließt sie wieder.
        </p>
        <Link
          href="/move-in"
          className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-pink"
        >
          Back to /move-in (current implementation)
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="h-screen" />
    </main>
  );
}
