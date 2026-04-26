"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";
import { clsx } from "clsx";

// FAQ accordion, answers the five conversion-blocking questions that
// don't get covered elsewhere on the homepage. Sits between Receipts
// (the math case) and the Closing Teasers (about + member stories).
// Q1 (length of stay) renders as a SHORT/LONG badge split so the two
// stay types read at a glance, using the same badge palette as the
// location cards and map markers.

type QA = { q: string; a?: string; node?: React.ReactNode };

const QUESTIONS: QA[] = [
  {
    q: "How long do I have to stay?",
    node: (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 rounded-[5px] bg-black px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white">
            Short
          </span>
          <p className="text-sm leading-relaxed text-gray sm:text-base">
            Up to 180 nights. Available at Alster and Downtown.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 rounded-[5px] bg-pink px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white">
            Long
          </span>
          <p className="text-sm leading-relaxed text-gray sm:text-base">
            From 3 months at all other STACEY homes. Notice period is 3 months.
            Want to switch cities later? Members get priority over external
            applicants when a STACEY home opens up elsewhere.
          </p>
        </div>
      </div>
    ),
  },
  {
    q: "What&rsquo;s actually included in the rent?",
    a: "Furnished private suite, weekly cleaning of common areas, internet, all utilities (power, water, heating), and community events. You bring clothes, a toothbrush, and your own towels (towels are provided only in our short-stay homes).",
  },
  {
    q: "Can I bring my partner?",
    a: "Yes. Our Jumbo and Studio rooms are couple-friendly and priced for two occupants. Other categories are single occupancy. Use the &lsquo;2 persons&rsquo; toggle on any location page to filter the available rooms.",
  },
  {
    q: "What about pets?",
    a: "We love animals, and saying no to them isn&rsquo;t easy. STACEY homes are pet-free so the shared kitchens, common areas, and housemates with allergies stay comfortable for everyone. If your dog or cat is part of the family, we completely understand that STACEY may not be the right fit, and we wish you the best wherever you land.",
  },
  {
    q: "Why is this cheaper than renting alone?",
    a: "Because we share fixed costs across more people: building, internet, cleaning, furniture, maintenance. The math is in our &lsquo;Do the math&rsquo; section above: roughly €685/month savings vs. solo Hamburg, €8,200/year. Plus you skip the extra contracts and admin headaches that come with renting solo.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-block rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold uppercase text-white">
              Five questions
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              The things people{" "}
              <span className="italic font-light">actually</span> ask.
            </h2>
            <p className="mt-3 text-sm text-gray sm:text-base">
              Straight answers, no marketing speak. Read these and you&rsquo;ll
              know enough to decide.
            </p>
          </div>

          <div className="mt-10 divide-y divide-black/10 rounded-[5px] bg-white shadow-sm ring-1 ring-black/5 sm:mt-12">
            {QUESTIONS.map((qa, i) => {
              const isOpen = open === i;
              return (
                <div key={qa.q}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FAFAFA] sm:px-6 sm:py-5"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={clsx(
                          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-black transition-colors",
                          isOpen ? "bg-pink text-black" : "bg-black text-white",
                        )}
                      >
                        0{i + 1}
                      </span>
                      <span
                        className="text-base font-bold leading-tight sm:text-lg"
                        dangerouslySetInnerHTML={{ __html: qa.q }}
                      />
                    </span>
                    <span
                      className={clsx(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all",
                        isOpen ? "rotate-45 bg-black text-white" : "bg-[#F0F0F0] text-black",
                      )}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </span>
                  </button>
                  <div
                    className={clsx(
                      "grid transition-all duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 pl-14 sm:px-6 sm:pb-6 sm:pl-16">
                        {qa.node ? (
                          qa.node
                        ) : (
                          <p
                            className="text-sm leading-relaxed text-gray sm:text-base"
                            dangerouslySetInnerHTML={{ __html: qa.a ?? "" }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row sm:gap-6">
            <p className="text-sm text-gray">More questions?</p>
            <Link
              href="/faq"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-black transition-colors hover:text-pink"
            >
              The full FAQ
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
