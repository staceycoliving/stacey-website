"use client";

// Snapshot route for the LONG lease-signing screen. Mirrors the
// default state of components/move-in/StepLease.tsx (the not-yet-
// opened state) but isolated so it can be screenshotted at the
// laptop aspect ratio for the HowItWorks Step 02 LONG mockup.

import { ArrowRight, Check, FileText, Lock, Mail, Phone, Shield } from "lucide-react";

export default function SignLongSnap() {
  return (
    <div className="min-h-screen bg-white p-12">
      <div className="mx-auto max-w-3xl">
        {/* Step header */}
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black font-mono text-sm font-black text-white">
            2
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gray">
            Step 2 of 3
          </span>
        </div>

        <h2 className="text-3xl font-bold sm:text-4xl">
          Let&apos;s make it <em className="font-bold italic">official</em>
        </h2>
        <p className="mt-2 text-sm text-gray">
          Review your personalized lease, then sign digitally. Takes about two
          minutes, nothing to print, no wet ink.
        </p>

        {/* Doc card */}
        <div className="mt-8 overflow-hidden rounded-[5px] border border-[#E8E6E0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {/* Doc header */}
          <div className="flex items-center gap-3 border-b border-[#F0F0F0] bg-[#FAFAFA] px-6 py-4">
            <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-[3px] bg-white ring-1 ring-[#E8E6E0]">
              <FileText size={16} className="text-black" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Lease agreement · PDF</p>
              <p className="text-xs text-gray">
                Personalized for your tenancy · generated just now
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm leading-relaxed text-gray">
              Anna Müller · STACEY Mühlenkamp · Mighty room · move-in 1 Jun
              2026. Lease term: 12 months minimum. Notice period: 3 months.
              Includes furniture, utilities, internet, weekly cleaning of
              common areas, and free transfers between STACEY cities.
            </p>

            <div className="mt-6 flex items-center justify-between rounded-[5px] bg-[#FAFAFA] px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-gray">
                <Lock size={14} className="text-black" />
                Yousign · GDPR-compliant · qualified e-signature
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-pink">
                ~2 min
              </span>
            </div>

            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-[5px] bg-black px-8 py-4 text-sm font-bold text-white">
              Open signing page
              <ArrowRight size={14} />
            </button>

            {/* Trust row */}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray">
              <span className="flex items-center gap-1.5">
                <Shield size={12} /> Encrypted at rest
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={12} /> Audit trail
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={12} /> Copy by email
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={12} /> Sign on any device
              </span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-gray">
          Booking fee €195 follows after signing · deposit (2× monthly rent)
          due by separate email within 48 hours.
        </p>
      </div>
    </div>
  );
}
