import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { locations } from "@/lib/data";

// Auto-generated sitemap. Includes the homepage, every location detail page,
// and the static utility pages. Refreshed on every deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/move-in`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/why-stacey`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const locationPages: MetadataRoute.Sitemap = locations.map((loc) => ({
    url: `${base}/locations/${loc.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...locationPages];
}
