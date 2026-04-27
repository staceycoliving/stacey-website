// JSON-LD structured-data components. Each renders a single
// <script type="application/ld+json"> tag with the proper schema.org
// payload. These power Google's rich results: address chips for
// LocalBusiness, FAQ accordion in the SERP for FAQPage, knowledge
// panel for Organization, breadcrumb trail for BreadcrumbList.
//
// Pure React components, no client-side JS, safe to render anywhere
// in a server component tree. Inline JSON via dangerouslySetInnerHTML
// so quotes inside descriptions don't get HTML-escaped.

import type { Location, FAQItem } from "@/lib/data";

function Json({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify guarantees valid JSON; the payload is built
      // from typed data inputs, no user input flows through here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationSchema({ baseUrl }: { baseUrl: string }) {
  return (
    <Json
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "STACEY Coliving",
        legalName: "STACEY Real Estate GmbH",
        url: baseUrl,
        logo: `${baseUrl}/images/stacey-logo-new-white-001.webp`,
        sameAs: [
          "https://www.instagram.com/staceycoliving/",
          "https://www.linkedin.com/company/stacey-coliving/",
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: "booking@stacey.de",
            telephone: "+49-40-696389600",
            areaServed: "DE",
            availableLanguage: ["English", "German"],
          },
        ],
        foundingDate: "2019",
        description:
          "STACEY operates furnished coliving locations across Hamburg, Berlin and Vallendar with short stays from 5 nights and long stays from 3 months.",
      }}
    />
  );
}

export function LocalBusinessSchema({
  location,
  baseUrl,
}: {
  location: Location;
  baseUrl: string;
}) {
  // Parse the address string into components. Format we use is
  // consistent: "Street Number, ZIP City". Falling back to the full
  // string under streetAddress if parsing fails keeps the schema
  // valid, just less granular.
  const [street, cityPart] = location.address.split(",").map((s) => s.trim());
  const cityParts = cityPart?.split(" ") ?? [];
  const postalCode = cityParts[0] || "";
  const addressLocality = cityParts.slice(1).join(" ") || location.city;

  // Coords stored as [lng, lat] (Mapbox convention). schema.org wants
  // separate fields.
  const [lng, lat] = location.coords;

  return (
    <Json
      data={{
        "@context": "https://schema.org",
        "@type": location.stayType === "SHORT" ? "LodgingBusiness" : "ApartmentComplex",
        "@id": `${baseUrl}/locations/${location.slug}`,
        name: `STACEY ${location.name}`,
        url: `${baseUrl}/locations/${location.slug}`,
        image: location.images.map((img) =>
          img.startsWith("http") ? img : `${baseUrl}${img}`,
        ),
        description: location.description,
        priceRange: `from €${location.priceFrom}${location.stayType === "SHORT" ? "/night" : "/month"}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: street || location.address,
          postalCode,
          addressLocality,
          addressCountry: "DE",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: lat,
          longitude: lng,
        },
        telephone: "+49-40-696389600",
        email: "booking@stacey.de",
      }}
    />
  );
}

export function FAQPageSchema({ items }: { items: FAQItem[] }) {
  return (
    <Json
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      }}
    />
  );
}

export function BreadcrumbSchema({
  items,
  baseUrl,
}: {
  items: { name: string; path: string }[];
  baseUrl: string;
}) {
  return (
    <Json
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${baseUrl}${item.path}`,
        })),
      }}
    />
  );
}
