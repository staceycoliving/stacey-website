import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { termsOfService } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service for short-stay bookings at STACEY Coliving, accommodation contracts with Stacey Real Estate GmbH.",
  alternates: { canonical: "/terms-of-service" },
};

export default function TermsPage() {
  return (
    <>
      <Navbar />

      <section className="bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pb-16 pt-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-white/60">
            Accommodation contract terms for short-stay bookings
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-10 rounded-[5px] border-l-4 border-pink bg-pink/5 p-5 text-sm leading-relaxed text-black/80">
            <p className="font-semibold">Scope of these terms</p>
            <p className="mt-2">
              These Terms of Service govern <strong>short-stay bookings</strong>{" "}
              (up to 182 consecutive days) at STACEY locations. Long-stay
              rentals (3 months or more) are governed by the separately-signed
              rental lease, not by these terms.
            </p>
          </div>

          <div className="space-y-10">
            {termsOfService.map((section, idx) => (
              <div key={idx}>
                <h2 className="mb-4 text-xl font-semibold text-black">
                  {section.heading}
                </h2>
                <ol className="list-outside list-decimal space-y-3 pl-5 text-sm leading-relaxed text-gray">
                  {section.paragraphs.map((p, pIdx) => (
                    <li key={pIdx}>{p}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <p className="mt-12 text-xs text-gray">
            Last updated: April 2026.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
