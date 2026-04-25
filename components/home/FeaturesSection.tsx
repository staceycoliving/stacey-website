import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  Sofa,
  Sparkles,
  Users,
  Wifi,
  Wrench,
} from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

// Editorial "all-inclusive" section. Resolves the "almost" in the
// headline at the bottom — the three things you do bring — so the
// candor reads as a feature, not a hedge. The transfer-between-homes
// item is flagged as STACEY-only since no comparable coliving offers it.
type Feature = {
  icon: typeof Sofa;
  title: string;
  body: string;
  highlight?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: Sofa,
    title: "Fully furnished suite",
    body: "Bed, desk, storage. Every detail thought through.",
  },
  {
    icon: Wifi,
    title: "Utilities & fibre WiFi",
    body: "Power, water, heating, internet. One price.",
  },
  {
    icon: Sparkles,
    title: "Weekly cleaning",
    body: "Common areas every week. Your room stays your space.",
  },
  {
    icon: Users,
    title: "Community life",
    body: "Brunch, drinks, run club. Friends, not flatmates.",
  },
  {
    icon: ArrowLeftRight,
    title: "Move between cities",
    body: "Change STACEY homes mid-stay. No fees, no break clauses.",
    highlight: true,
  },
  {
    icon: Wrench,
    title: "On-call maintenance",
    body: "Something broken? Often fixed the same day.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-6xl">
          {/* Editorial header — same micro-uppercase + italic-keyword
              pattern as the rest of the homepage so the section sits
              in the same family. */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
              All-inclusive living
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Almost everything{" "}
              <span className="italic font-light">included</span>.
            </h2>
            <p className="mt-3 text-sm text-gray sm:text-base">
              One price. No surprises. Move in with a suitcase — we handle the rest.
            </p>
          </div>

          {/* Feature grid — 1 col mobile, 2 col tablet, 3 col desktop.
              "Move between cities" is flagged as STACEY-exclusive since
              it's the one item competitors don't offer. */}
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:mt-12 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, highlight }) => (
              <div
                key={title}
                className={
                  highlight
                    ? "group relative overflow-hidden rounded-[5px] bg-black p-5 text-white ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                    : "group relative overflow-hidden rounded-[5px] bg-white p-5 ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:ring-pink/30 hover:shadow-md sm:p-6"
                }
              >
                {highlight && (
                  <span className="absolute right-3 top-3 rounded-[3px] bg-pink px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">
                    Stacey only
                  </span>
                )}
                <span
                  className={
                    highlight
                      ? "flex h-10 w-10 items-center justify-center rounded-[5px] bg-pink text-black"
                      : "flex h-10 w-10 items-center justify-center rounded-[5px] bg-black text-white"
                  }
                >
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <p className="mt-4 text-base font-bold leading-tight sm:text-lg">
                  {title}
                </p>
                <p
                  className={
                    highlight
                      ? "mt-1.5 text-sm leading-relaxed text-white/70"
                      : "mt-1.5 text-sm leading-relaxed text-gray"
                  }
                >
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* "Almost" reveal — closes the headline's promise by naming
              the three things you do bring. Keeps the candor light. */}
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-gray sm:mt-12 sm:text-base">
            You bring{" "}
            <span className="font-semibold text-black">your clothes</span>,{" "}
            <span className="font-semibold text-black">a toothbrush</span>, and{" "}
            <span className="font-semibold text-black">yourself</span>. We&rsquo;ve
            got the rest.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/move-in"
              className="group inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              Find your room
              <ArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
