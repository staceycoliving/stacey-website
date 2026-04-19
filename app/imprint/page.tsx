import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { imprint } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Imprint",
  description: "Legal disclosure of Stacey Real Estate GmbH per §5 TMG.",
  alternates: { canonical: "/imprint" },
};

export default function ImprintPage() {
  return (
    <>
      <Navbar />

      <section className="bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pb-16 pt-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Imprint
          </h1>
          <p className="mt-4 text-white/60">
            Legal disclosure per §5 TMG
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl space-y-8 px-4">
          {imprint.map((section, idx) => (
            <div key={idx}>
              {section.heading && (
                <h2 className="mb-3 text-lg font-semibold text-black">
                  {section.heading}
                </h2>
              )}
              <div className="space-y-1 text-sm leading-relaxed text-gray">
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
