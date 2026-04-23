import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

export default function AboutSection() {
  return (
    <section className="bg-[#FAFAFA] py-20">
      <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
            {/* Photo left */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[5px]">
              <Image
                src="/images/stacey-team.webp"
                alt="The STACEY Team"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Text right */}
            <div className="text-center sm:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                The story behind <span className="italic font-light">STACEY.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                Founded in Hamburg in 2019 with a simple mission: make city living
                better. We believe that home is more than four walls — it&apos;s the
                people you share it with.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gray">
                From our first apartment in Winterhude to locations across Germany,
                we&apos;re building a community of like-minded people who value
                connection, convenience and beautiful spaces.
              </p>
              <Link
                href="/why-stacey"
                className="mx-auto mt-6 inline-flex items-center gap-2 text-sm font-semibold text-black transition-all duration-200 hover:opacity-60 sm:mx-0"
              >
                Learn more about us <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
