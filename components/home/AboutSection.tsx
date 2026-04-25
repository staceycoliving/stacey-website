import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

// Closing block — two side-by-side teaser cards in one light-grey
// section. Replaces the old separate AboutSection + TestimonialsSection
// combo with a single 50:50 row that points readers to /why-stacey for
// the full team story and to /why-stacey#stories for the full member
// interviews. Same card style for both so they read as a pair.
export default function AboutSection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <FadeIn>
        <div className="mx-auto grid max-w-6xl gap-4 sm:gap-6 lg:grid-cols-2">
          {/* About teaser — Hamburg-since-2019 brand handshake */}
          <Link
            href="/why-stacey"
            className="group grid items-center gap-5 rounded-[5px] bg-[#FAFAFA] p-5 shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[180px_1fr] sm:gap-6 sm:p-6 lg:p-7"
          >
            <div className="relative aspect-square overflow-hidden rounded-[5px]">
              <Image
                src="/images/stacey-team.webp"
                alt="The STACEY team"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 640px) 180px, 100vw"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Hamburg, since 2019
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight tracking-tight sm:text-2xl">
                Coliving for people who&rsquo;d{" "}
                <span className="italic font-light">rather meet someone</span>.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray">
                Six years, three cities, hundreds of members. Read the founder
                story.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-black transition-colors group-hover:text-pink">
                The full story
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </div>
          </Link>

          {/* Stories teaser — featured Jihane interview pointing to the
              full grid on /why-stacey#stories. Play badge on the photo
              signals it's a video without launching one inline. */}
          <Link
            href="/why-stacey#stories"
            className="group grid items-center gap-5 rounded-[5px] bg-[#FAFAFA] p-5 shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[180px_1fr] sm:gap-6 sm:p-6 lg:p-7"
          >
            <div className="relative aspect-square overflow-hidden rounded-[5px] bg-black">
              <Image
                src="/images/interview-3-thumb.webp"
                alt="Jihane"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 640px) 180px, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110">
                  <Play size={16} className="ml-0.5 fill-black text-black" />
                </span>
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink">
                Member stories
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight tracking-tight sm:text-2xl">
                <span className="italic font-light">&ldquo;Strangers became</span>{" "}
                neighbors.&rdquo;
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray">
                Three members, three stories. Watch the full interviews.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-black transition-colors group-hover:text-pink">
                More stories
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </div>
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
