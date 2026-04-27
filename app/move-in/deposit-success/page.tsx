import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Home } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

// Post-payment confirmation page. Should never appear in search
// results, only reachable from a Stripe redirect after a successful
// deposit charge.
export const metadata: Metadata = {
  title: "Deposit received",
  robots: { index: false, follow: false },
  alternates: { canonical: "/move-in/deposit-success" },
};

export default function DepositSuccessPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-24 pb-16 sm:pt-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black">
              <Check size={28} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
              Deposit received, <em className="font-bold italic">welcome to STACEY!</em>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-gray leading-relaxed">
              Your security deposit has been received. Your room is now fully reserved and your move-in is confirmed.
            </p>

            <div className="mx-auto mt-8 max-w-sm text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-gray">What happens next</p>
              <div className="mt-4 space-y-3">
                {[
                  "You'll receive a confirmation email shortly with all your booking details.",
                  "3 days before your move-in, we'll send you a welcome email with check-in instructions, the address and your room number.",
                  "On your move-in day, our community manager will welcome you and hand over your keys.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-bold">{i + 1}</span>
                    <p className="text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/"
              className="mt-10 inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              <Home size={14} /> Back to homepage <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
