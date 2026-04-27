"use client";

import { motion, useReducedMotion } from "framer-motion";

// Cinematic word-by-word reveal. Each word sits in an overflow-hidden
// line and slides up from below the baseline, so the reveal feels like
// the letters rise out of a mask rather than fading in. The "HOME."
// closer keeps the brand's italic-font-light contrast against the
// uppercase wall, no extra decoration, the type change is the moment.
//
// Timing is intentionally tight (full reveal under ~1.1s) so return
// visits never feel slow. Full respect for prefers-reduced-motion: in
// that case we render the final state immediately with no animation.
export default function HeroHeadline() {
  const reduce = useReducedMotion();

  // Promote each word to its own GPU compositor layer so the slide-up
  // is composited on the GPU instead of repainted by the main thread,
  // which fights with hydration on cold loads and shows up as jitter.
  const layerPromote = { willChange: "transform" } as const;
  const word = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { y: "0%" }, style: layerPromote }
      : {
          initial: { y: "110%" },
          animate: { y: "0%" },
          transition: {
            duration: 0.8,
            delay,
            ease: [0.16, 1, 0.3, 1] as const, // ease-out-expo
          },
          style: layerPromote,
        };

  return (
    <h1 className="mx-auto max-w-5xl text-center text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl">
      <Line>
        <motion.span {...word(0.05)} className="inline-block">
          OUR
        </motion.span>{" "}
        <motion.span {...word(0.15)} className="inline-block">
          MEMBERS
        </motion.span>
      </Line>
      <Line>
        <motion.span {...word(0.25)} className="inline-block">
          CALL
        </motion.span>{" "}
        <motion.span {...word(0.33)} className="inline-block">
          US
        </motion.span>{" "}
        <motion.span
          {...word(0.42)}
          className="inline-block font-light italic"
        >
          HOME.
        </motion.span>
      </Line>
    </h1>
  );
}

// overflow-hidden masks the translated words below the baseline.
// pb gives breathing room so the mask doesn't clip descenders.
function Line({ children }: { children: React.ReactNode }) {
  return <span className="block overflow-hidden pb-[0.12em]">{children}</span>;
}
