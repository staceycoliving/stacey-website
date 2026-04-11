"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mail } from "lucide-react";
import { clsx } from "clsx";

// ─── Floating contact bubble (Bruno community manager) ───
export default function BrunoWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Card — positioned above the button */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-18 right-0 w-80 rounded-[5px] bg-black p-6 text-white shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                <Image
                  src="/images/community-manager.webp"
                  alt="Bruno"
                  fill
                  className="object-cover"
                  sizes="48px"
                />
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-green-400" />
              </div>
              <div>
                <p className="text-base font-bold">Bruno</p>
                <p className="text-sm text-white/50">Community Manager</p>
              </div>
            </div>
            <p className="mt-4 text-base text-white/70 leading-relaxed">
              Hey! Need help with your booking? I&apos;m happy to answer any questions.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="mailto:booking@stacey.de"
                className="flex flex-1 items-center justify-center gap-2 rounded-[5px] bg-pink px-4 py-3 text-sm font-bold text-black transition-all duration-200 hover:opacity-80"
              >
                <Mail size={15} /> Email
              </a>
              <a
                href="https://wa.me/4940696389600"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-[5px] bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-white/20"
              >
                WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3"
      >
        {!open && (
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Need help?</span>
        )}
        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-black shadow-lg transition-transform duration-200 hover:scale-110">

        {/* Chat icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className={clsx(
            "absolute text-white transition-all duration-200",
            open ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* Close icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className={clsx(
            "absolute text-white transition-all duration-200",
            open ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        >
          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        </div>
      </button>
    </div>
  );
}
