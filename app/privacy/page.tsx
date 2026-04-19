import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { privacy } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy of Stacey Real Estate GmbH under GDPR.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />

      <section className="bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pb-16 pt-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-white/60">
            How we process your personal data under GDPR
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4">
          {privacy.map((section, idx) => (
            <div key={idx}>
              <h2 className="mb-4 text-xl font-semibold text-black">
                {section.heading}
              </h2>

              {section.paragraphs?.map((p, pIdx) => (
                <p
                  key={pIdx}
                  className="mb-3 text-sm leading-relaxed text-gray"
                >
                  {p}
                </p>
              ))}

              {section.items && (
                <ul className="mt-4 space-y-4">
                  {section.items.map((item, iIdx) => (
                    <li
                      key={iIdx}
                      className="rounded-[5px] border border-lightgray bg-background p-4"
                    >
                      <h3 className="text-sm font-semibold text-black">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray">
                        <span className="font-medium">Provider:</span>{" "}
                        {item.provider}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray">
                        <span className="font-medium">Purpose:</span>{" "}
                        {item.purpose}
                      </p>
                      {item.legalBasis && (
                        <p className="mt-1 text-xs leading-relaxed text-gray">
                          <span className="font-medium">Legal basis:</span>{" "}
                          {item.legalBasis}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
