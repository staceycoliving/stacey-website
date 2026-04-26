import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Brand-final CTA, gives the "OUR MEMBERS CALL US HOME" claim its own
// stage right before the footer. Used to live as a small ribbon at the
// top of the footer where nobody sees it. Now it's a full-bleed black
// closer with the animated gradient claim sweeping across in 7xl, plus
// one last conversion CTA back to /move-in.
//
// The animated gradient (claimFill keyframe) is defined in app/globals.css
// and was already in use on the old footer ribbon, just promoted here.
export default function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-black px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
      {/* Soft pink corner glows so the wall of black has some atmosphere
          behind the claim. Pure decoration, pointer-events-none. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-pink/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-pink/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl text-center">
        <p
          className="text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl sm:tracking-[0.04em] lg:text-7xl xl:text-[5.5rem]"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) var(--fill), #FCB0C0 var(--fill), #FCB0C0 100%)",
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
          <Link
            href="/move-in"
            className="group inline-flex items-center gap-2 rounded-[5px] bg-pink px-8 py-4 text-sm font-bold text-black shadow-[0_12px_30px_rgba(252,176,192,0.35)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_16px_40px_rgba(252,176,192,0.45)] sm:text-base"
          >
            Find your room
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
