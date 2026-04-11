// Server-side layout wrapper around the (client) location detail page.
// Lets us emit per-location metadata (OG tags, canonical URL, structured
// data) without having to convert the page itself away from useState/effect.

import type { Metadata } from "next";
import { env } from "@/lib/env";
import { getLocationBySlug } from "@/lib/data";

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = getLocationBySlug(slug);

  if (!loc) {
    return {
      title: "Location not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `STACEY ${loc.name} — ${loc.tagline}`;
  const description = loc.description;
  const image = loc.images[0] ?? "/images/website-hero.webp";
  const url = `${env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")}/locations/${loc.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: `STACEY ${loc.name}` }],
      locale: "en_US",
      siteName: "STACEY Coliving",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function LocationLayout({ params, children }: Props) {
  const { slug } = await params;
  const loc = getLocationBySlug(slug);

  // schema.org/LodgingBusiness structured data — gets rendered into the
  // page's HTML so Google can pick it up for rich results.
  const jsonLd = loc
    ? {
        "@context": "https://schema.org",
        "@type": "LodgingBusiness",
        name: `STACEY ${loc.name}`,
        description: loc.description,
        address: {
          "@type": "PostalAddress",
          streetAddress: loc.address,
          addressLocality:
            loc.city === "hamburg" ? "Hamburg" : loc.city === "berlin" ? "Berlin" : "Vallendar",
          addressCountry: "DE",
        },
        image: loc.images.slice(0, 6).map((src) =>
          src.startsWith("http") ? src : `${env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")}${src}`
        ),
        priceRange:
          loc.stayType === "SHORT" ? `€${loc.priceFrom}/night and up` : `€${loc.priceFrom}/month and up`,
        url: `${env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")}/locations/${loc.slug}`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
