import Image from "next/image";

// Brand pause between What's-Included and FAQ. A single member pull-
// quote on full-bleed black, decorative pink quotation marks, member
// avatar + caption underneath. Functions as the third black anchor in
// the page rhythm (Video, here, Final-CTA), and breaks the run of
// content-heavy text sections in the lower half of the page.

export default function PullQuoteSection() {
  return (
    <section className="relative overflow-hidden bg-black px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      {/* Subtle pink corner glows for atmosphere, pure decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-pink/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-pink/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        {/* Decorative pink opening quotation mark, sits behind the text */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-2 -top-10 font-serif text-8xl leading-none text-pink/60 sm:-left-6 sm:-top-12 sm:text-9xl"
        >
          &ldquo;
        </span>

        <p
          className="relative px-2 text-2xl italic font-light leading-snug text-white/95 sm:text-3xl lg:text-4xl"
          style={{ textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}
        >
          Most serviced apartments feel like hotels pretending to be homes.
          STACEY actually feels like a place you live in.
        </p>

        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-14 -right-2 font-serif text-8xl leading-none text-pink/60 sm:-bottom-16 sm:-right-6 sm:text-9xl"
        >
          &rdquo;
        </span>

        {/* Member avatar + caption */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className="relative inline-block h-12 w-12 overflow-hidden rounded-full ring-2 ring-pink shadow-[0_0_0_3px_rgba(252,176,192,0.25)]">
            <Image src="/images/members/member-7.jpeg" alt="" fill className="object-cover" sizes="48px" />
          </span>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Lisa, 36</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">
              Eppendorf · since Mar 2025
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
