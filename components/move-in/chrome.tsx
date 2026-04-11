"use client";

import { motion } from "framer-motion";
import { Check, Pencil } from "lucide-react";
import type { ReactNode } from "react";

// ─── Reveal animation ───
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section header with big number ───
export function SectionHeader({ number, title, titleItalic }: { number: string; title: string; titleItalic: string }) {
  return (
    <div className="mb-8 flex items-baseline gap-4">
      <span className="text-5xl font-extralight text-[#E8E6E0] sm:text-6xl">{number}</span>
      <h2 className="text-2xl font-bold sm:text-3xl">
        {title} <em className="font-bold italic">{titleItalic}</em>
      </h2>
    </div>
  );
}

// ─── Collapsed section ───
export function CollapsedSection({ label, summary, onEdit }: { label: string; summary: string; onEdit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between rounded-[5px] border border-[#E8E6E0] px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
          <Check size={13} strokeWidth={3} />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray">{label}</p>
          <p className="text-sm font-semibold">{summary}</p>
        </div>
      </div>
      <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-medium text-gray transition-colors hover:text-black">
        <Pencil size={11} /> Edit
      </button>
    </motion.div>
  );
}
