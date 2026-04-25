import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

// Compact about-teaser. The long-form team story + stat tiles live on
// /why-stacey now — this card is just the brand handshake on the
// homepage with a CTA to the full page.
export default function AboutSection() {
  return (
    <section className="bg-[#FAFAFA] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <FadeIn>
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-8 rounded-[5px] bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-[280px_1fr] sm:gap-10 sm:p-8 lg:p-10">
            {/* Photo */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-[5px] sm:aspect-square">
              <Image
                src="/images/stacey-team.webp"
                alt="The STACEY team"
                fill
                className="object-cover"
                sizes="(min-width: 640px) 280px, 100vw"
              />
            </div>

            {/* Copy */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Hamburg, since 2019
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-4xl">
                Coliving for people who&rsquo;d rather{" "}
                <span className="italic font-light">meet someone</span> than
                scroll someone.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray sm:text-base">
                Six years, three cities, hundreds of members. Read the founder
                story, meet the team, and see why we built STACEY this way.
              </p>
              <Link
                href="/why-stacey"
                className="group mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-80"
              >
                The full story
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
