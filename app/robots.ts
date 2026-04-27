import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Robots policy. Allow everything by default, then explicitly disallow:
// - admin (private dashboard)
// - api routes (data endpoints, never useful in search)
// - post-payment success/cancel pages (transient confirmation URLs)
// - feedback / preview / checkin (internal tools and one-off flows)
//
// /move-in itself stays indexable (the booking entry page is a real
// landing target), but downstream URL state with deep-link query
// params will all canonicalize back to /move-in via per-page metadata.
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/move-in/deposit-success",
          "/move-in/payment-setup-success",
          "/feedback",
          "/preview",
          "/checkin",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
