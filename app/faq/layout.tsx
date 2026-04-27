import type { Metadata } from "next";
import { faqItems } from "@/lib/data";
import { FAQPageSchema } from "@/components/seo/StructuredData";

const TITLE = "FAQ";
const DESCRIPTION =
  "Everything you need to know about STACEY coliving. Booking, deposits, registration, community life, and what's actually included.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/faq",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Server layout around the (client) FAQ page. The FAQPage JSON-LD
// renders here so Google can show the accordion-style rich result in
// the SERP, the questions surface directly under the title.
export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FAQPageSchema items={faqItems} />
      {children}
    </>
  );
}
