import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { locations } from "@/lib/data";

// Auto-generated sitemap. Includes the homepage, every location detail
// page, value pages, and legal pages. Refreshed on every deploy.
// Priorities reflect commercial importance: homepage + booking entry >
// location pages > value pages > legal pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/move-in`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/why-stacey`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/partners`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/imprint`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const locationPages: MetadataRoute.Sitemap = locations.map((loc) => ({
    url: `${base}/locations/${loc.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...locationPages];
}
