"use client";

// Snapshot route for the SHORT booking summary card. This is the
// right-hand sticky card from app/move-in/page.tsx (the final view
// before Stripe Checkout). Headless Chrome captures this at
// 1280x800 for the HowItWorks Step 02 SHORT mockup.

import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function SignShortSnap() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] p-12">
      <div className="mx-auto max-w-md">
        <div className="rounded-[5px] bg-black p-6 text-white">
          {/* Room image */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-[5px]">
            <Image
              src="/images/locations/alster/premium-plus/01-premium-plus-al.webp"
              alt="STACEY Alster Mighty"
              fill
              className="object-cover"
              sizes="400px"
            />
          </div>

          {/* Details */}
          <div className="mt-4">
            <p className="text-lg font-bold">STACEY Alster · Mighty</p>
            <p className="mt-1 text-sm text-white/60">
              1 person · 12 May 2026, 17 May 2026 · 5 nights
            </p>
            <p className="mt-0.5 text-sm text-white/40">8 m²</p>
          </div>

          {/* Pricing */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/60">
                <span>€95 × 5 nights</span>
                <span>€475.00</span>
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>incl. 7% VAT</span>
                <span>€31.07</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>City tax</span>
                <span>€19.00</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold">
                <span>Total</span>
                <span>€494.00</span>
              </div>
            </div>
          </div>

          {/* T&C checkbox */}
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[5px] border border-white/10 p-4">
            <input
              type="checkbox"
              checked
              readOnly
              className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] accent-pink"
            />
            <span className="text-sm leading-relaxed text-white/60">
              I agree to the{" "}
              <span className="font-medium text-white underline">Terms &amp; Conditions</span> and{" "}
              <span className="font-medium text-white underline">Privacy Policy</span>.
            </span>
          </label>

          {/* CTA */}
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-[5px] bg-pink py-3.5 text-base font-bold text-black">
            Continue to payment <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
