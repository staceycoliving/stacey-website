// Server-side layout wrapper around the (client) location detail page.
// Lets us emit per-location metadata (OG tags, canonical URL, structured
// data) without having to convert the page itself away from useState/effect.

import type { Metadata } from "next";
import { env } from "@/lib/env";
import { getLocationBySlug } from "@/lib/data";
import { LocalBusinessSchema, BreadcrumbSchema } from "@/components/seo/StructuredData";

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

  const cityName =
    loc.city === "hamburg" ? "Hamburg" : loc.city === "berlin" ? "Berlin" : "Vallendar";
  const stayLabel = loc.stayType === "SHORT" ? "short-stay" : "long-stay";
  const priceUnit = loc.stayType === "SHORT" ? "/night" : "/month";
  const title = `STACEY ${loc.name}, ${loc.tagline}`;
  // Sub-160-char description tuned for SERP snippet, leads with the
  // strongest local signals (city + neighborhood + stay type) and
  // closes with the price hook.
  const description = `Furnished ${stayLabel} coliving at STACEY ${loc.name}, ${loc.neighborhood}, ${cityName}. From €${loc.priceFrom}${priceUnit}, almost everything included.`;
  const baseUrl = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  const ogImage = loc.images[0]?.startsWith("http")
    ? loc.images[0]
    : `${baseUrl}${loc.images[0] ?? "/images/website-hero.webp"}`;
  const canonical = `/locations/${loc.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: [{ url: ogImage, width: 1920, height: 1080, alt: `STACEY ${loc.name}` }],
      locale: "en_US",
      siteName: "STACEY Coliving",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function LocationLayout({ params, children }: Props) {
  const { slug } = await params;
  const loc = getLocationBySlug(slug);
  const baseUrl = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");

  return (
    <>
      {loc && (
        <>
          <LocalBusinessSchema location={loc} baseUrl={baseUrl} />
          <BreadcrumbSchema
            baseUrl={baseUrl}
            items={[
              { name: "Home", path: "/" },
              {
                name: loc.city === "hamburg" ? "Hamburg" : loc.city === "berlin" ? "Berlin" : "Vallendar",
                path: `/?city=${loc.city}`,
              },
              { name: loc.name, path: `/locations/${loc.slug}` },
            ]}
          />
        </>
      )}
      {children}
    </>
  );
}
