"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import type { StayType } from "@/lib/data";

export default function PreviewPage() {
  const [stayType, setStayType] = useState<StayType | null>(null);
  const [persons, setPersons] = useState<1 | 2>(1);
  const [city, setCity] = useState("");

  // Dynamic headline based on progress
  const headline = (): { top: string; bottom: string } => {
    if (!stayType) return { top: "HOW LONG DO YOU WANT", bottom: "TO STAY WITH US?" };
    if (stayType && !city && stayType === "LONG") {
      return { top: "HOW MANY OF YOU", bottom: "ARE MOVING IN?" };
    }
    if (stayType === "SHORT") {
      return { top: "HOW MANY OF YOU", bottom: "ARE MOVING IN?" };
    }
    if (city && stayType === "LONG") {
      return { top: "WHEN DO YOU WANT", bottom: "TO MOVE IN?" };
    }
    return { top: "HOW LONG DO YOU WANT", bottom: "TO STAY WITH US?" };
  };

  // After persons is selected, advance headline
  const [personsSelected, setPersonsSelected] = useState(false);

  const getHeadline = (): { top: string; bottom: string } => {
    if (!stayType) return { top: "HOW LONG DO YOU WANT", bottom: "TO STAY WITH US?" };
    if (!personsSelected) return { top: "HOW MANY OF YOU", bottom: "ARE MOVING IN?" };
    if (stayType === "LONG" && !city) return { top: "WHERE DO YOU WANT", bottom: "TO LIVE?" };
    if (stayType === "SHORT" || (stayType === "LONG" && city)) return { top: "WHEN DO YOU WANT", bottom: "TO MOVE IN?" };
    return { top: "LET'S FIND", bottom: "YOUR ROOM." };
  };

  const h = getHeadline();

  const handleStayType = (t: StayType) => {
    setStayType(t);
    setCity("");
    setPersonsSelected(false);
  };

  const handlePersons = (p: 1 | 2) => {
    setPersons(p);
    setPersonsSelected(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-50 border-b border-[#F0F0F0] bg-white px-4 py-3">
        <p className="text-center text-sm font-bold">Move-in Intro — Animated Background + Dynamic Headlines</p>
      </div>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4">
        {/* ── Animated STACEY background ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Floating logos */}
          {[
            { top: "8%", left: "5%", size: "w-24", opacity: "opacity-[0.04]", delay: "0s", dur: "18s" },
            { top: "15%", left: "75%", size: "w-32", opacity: "opacity-[0.03]", delay: "2s", dur: "22s" },
            { top: "45%", left: "85%", size: "w-20", opacity: "opacity-[0.05]", delay: "4s", dur: "16s" },
            { top: "70%", left: "10%", size: "w-28", opacity: "opacity-[0.03]", delay: "1s", dur: "20s" },
            { top: "80%", left: "65%", size: "w-24", opacity: "opacity-[0.04]", delay: "3s", dur: "24s" },
            { top: "30%", left: "2%", size: "w-16", opacity: "opacity-[0.05]", delay: "5s", dur: "19s" },
            { top: "55%", left: "50%", size: "w-20", opacity: "opacity-[0.03]", delay: "6s", dur: "21s" },
          ].map((logo, i) => (
            <div
              key={i}
              className={`absolute ${logo.size} ${logo.opacity}`}
              style={{
                top: logo.top,
                left: logo.left,
                animation: `floatLogo ${logo.dur} ease-in-out ${logo.delay} infinite`,
              }}
            >
              <Image
                src="/images/stacey-logo-new-pink-001.webp"
                alt=""
                width={128}
                height={48}
                className="h-auto w-full"
              />
            </div>
          ))}

          {/* Floating text fragments */}
          {[
            { text: "COLIVING", top: "12%", left: "60%", delay: "1s", dur: "17s" },
            { text: "COMMUNITY", top: "35%", left: "80%", delay: "3s", dur: "21s" },
            { text: "HOME", top: "65%", left: "8%", delay: "0s", dur: "19s" },
            { text: "FURNISHED", top: "85%", left: "45%", delay: "5s", dur: "23s" },
            { text: "ALL-INCLUSIVE", top: "20%", left: "15%", delay: "2s", dur: "20s" },
            { text: "MOVE IN", top: "50%", left: "70%", delay: "4s", dur: "18s" },
          ].map((item, i) => (
            <p
              key={i}
              className="absolute text-[10px] font-bold uppercase tracking-[0.3em] text-pink/[0.06]"
              style={{
                top: item.top,
                left: item.left,
                animation: `floatText ${item.dur} ease-in-out ${item.delay} infinite`,
              }}
            >
              {item.text}
            </p>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 w-full max-w-md text-center">
          {/* Dynamic headline */}
          <AnimatePresence mode="wait">
            <motion.div
              key={h.top + h.bottom}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {h.top}
                <br />
                <span className="text-pink">{h.bottom}</span>
              </h1>
            </motion.div>
          </AnimatePresence>

          {/* 1. Stay type — always visible */}
          <div className="mt-10 text-left">
            <div className="flex gap-2">
              <button
                onClick={() => handleStayType("SHORT")}
                className={clsx(
                  "flex-1 rounded-[5px] px-4 py-3 text-left transition-all duration-200",
                  stayType === "SHORT" ? "bg-black text-white shadow-lg" : "bg-[#F5F5F5] hover:bg-[#E8E6E0]"
                )}
              >
                <p className="text-sm font-bold">SHORT</p>
                <p className={clsx("mt-0.5 text-[11px]", stayType === "SHORT" ? "text-white/60" : "text-gray")}>{"<"} 3 months</p>
              </button>
              <button
                onClick={() => handleStayType("LONG")}
                className={clsx(
                  "flex-1 rounded-[5px] px-4 py-3 text-left transition-all duration-200",
                  stayType === "LONG" ? "bg-black text-white shadow-lg" : "bg-[#F5F5F5] hover:bg-[#E8E6E0]"
                )}
              >
                <p className="text-sm font-bold">LONG</p>
                <p className={clsx("mt-0.5 text-[11px]", stayType === "LONG" ? "text-white/60" : "text-gray")}>3+ months</p>
              </button>
            </div>
          </div>

          {/* 2. Persons */}
          <AnimatePresence>
            {stayType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="text-left overflow-hidden"
              >
                <div className="mt-5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePersons(1)}
                      className={clsx(
                        "flex-1 rounded-[5px] px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        persons === 1 && personsSelected ? "bg-black text-white shadow-lg" : "bg-[#F5F5F5] text-black hover:bg-[#E8E6E0]"
                      )}
                    >
                      1 person
                    </button>
                    <button
                      onClick={() => handlePersons(2)}
                      className={clsx(
                        "flex-1 rounded-[5px] px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        persons === 2 && personsSelected ? "bg-black text-white shadow-lg" : "bg-[#F5F5F5] text-black hover:bg-[#E8E6E0]"
                      )}
                    >
                      2 persons
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. City (LONG only) */}
          <AnimatePresence>
            {stayType === "LONG" && personsSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="text-left overflow-hidden"
              >
                <div className="mt-5">
                  <div className="flex gap-2">
                    {[
                      { value: "hamburg", label: "Hamburg" },
                      { value: "berlin", label: "Berlin" },
                      { value: "vallendar", label: "Vallendar" },
                    ].map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCity(c.value)}
                        className={clsx(
                          "flex-1 rounded-[5px] px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          city === c.value ? "bg-black text-white shadow-lg" : "bg-[#F5F5F5] text-black hover:bg-[#E8E6E0]"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Date placeholder */}
          <AnimatePresence>
            {((stayType === "SHORT" && personsSelected) || (stayType === "LONG" && city)) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="text-left overflow-hidden"
              >
                <div className="mt-5">
                  {stayType === "SHORT" ? (
                    <div className="rounded-[5px] border border-[#E8E6E0] bg-white p-4 text-center text-xs text-gray">
                      [ Calendar ]
                    </div>
                  ) : (
                    <select className="w-full rounded-[5px] border border-[#E8E6E0] bg-white px-4 py-2.5 text-sm font-medium outline-none">
                      <option value="">Select move-in date</option>
                      <option>May 1, 2026</option>
                      <option>May 15, 2026</option>
                      <option>June 1, 2026</option>
                    </select>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <AnimatePresence>
            {personsSelected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-8"
              >
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-[5px] bg-black px-10 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80">
                  Show available rooms <ArrowRight size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CSS for floating animations */}
        <style jsx>{`
          @keyframes floatLogo {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-12px) rotate(1deg); }
            50% { transform: translateY(-6px) rotate(-0.5deg); }
            75% { transform: translateY(-15px) rotate(0.5deg); }
          }
          @keyframes floatText {
            0%, 100% { transform: translateY(0) translateX(0); }
            33% { transform: translateY(-8px) translateX(5px); }
            66% { transform: translateY(-4px) translateX(-3px); }
          }
        `}</style>
      </section>
    </div>
  );
}
