"use client";

import { Key, MapPin, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

// Mini boarding-pass strip for /move-in. Sets expectations for the
// three-step booking journey without taking up a whole section. Three
// pink medallions (icon + step number) connected by a dashed pink
// line, time-codes underneath. Sits dezent under the hero search.
//
// The full HowItWorks-as-section concept used to live on the homepage
// but didn't earn its weight there (users browsing /move-in are the
// ones actually about to start the flow, so the explainer is far more
// useful here than on /).

const STATIONS: { num: string; icon: LucideIcon; label: string; time: string }[] = [
  { num: "01", icon: MapPin, label: "Pick", time: "~10 min" },
  { num: "02", icon: PenLine, label: "Sign + pay", time: "Same day" },
  { num: "03", icon: Key, label: "Move in", time: "Day one" },
];

export default function JourneyStrip({ tone = "light" }: { tone?: "light" | "dark" }) {
  const isDark = tone === "dark";
  return (
    <div
      className={clsx(
        "mx-auto flex w-full max-w-md items-start justify-between gap-2 sm:max-w-lg sm:gap-4",
      )}
    >
      {STATIONS.map((s, i) => (
        <div key={s.num} className="relative flex flex-1 flex-col items-center text-center">
          {/* Dashed connector to the previous medallion. Sits behind the
              medallion via z-index, stops at the medallion radius. */}
          {i > 0 && (
            <div
              aria-hidden
              className="absolute right-1/2 top-5 h-px w-full -translate-y-1/2"
              style={{
                backgroundImage: `linear-gradient(to right, ${isDark ? "rgba(252,176,192,0.7)" : "#FCB0C0"} 50%, transparent 50%)`,
                backgroundSize: "6px 1px",
                backgroundRepeat: "repeat-x",
              }}
            />
          )}

          {/* Medallion */}
          <div
            className={clsx(
              "relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-pink shadow-[0_4px_12px_rgba(252,176,192,0.5)]",
              isDark ? "ring-2 ring-black" : "ring-2 ring-white",
            )}
          >
            <s.icon size={16} className="text-black" strokeWidth={2.4} />
            <span
              className={clsx(
                "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black font-mono text-[8px] font-black text-pink ring-1",
                isDark ? "ring-black" : "ring-white",
              )}
            >
              {s.num}
            </span>
          </div>

          {/* Time-code + label */}
          <p
            className={clsx(
              "mt-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em]",
              isDark ? "text-pink" : "text-pink",
            )}
          >
            {s.time}
          </p>
          <p
            className={clsx(
              "mt-0.5 text-xs font-bold leading-tight",
              isDark ? "text-white" : "text-black",
            )}
          >
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
