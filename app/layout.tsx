import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { env } from "@/lib/env";
import ConsentScripts from "@/components/legal/ConsentScripts";
import { OrganizationSchema } from "@/components/seo/StructuredData";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
});

const TITLE = "STACEY, Coliving. Just Better.";
const DESCRIPTION =
  "STACEY offers furnished coliving apartments in Hamburg, Berlin, and Vallendar. Almost everything included, community built-in. Short stays from 5 nights, long stays from 3 months.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: TITLE,
    template: "%s · STACEY",
  },
  description: DESCRIPTION,
  applicationName: "STACEY Coliving",
  authors: [{ name: "STACEY Real Estate GmbH" }],
  keywords: [
    "coliving",
    "Hamburg",
    "Berlin",
    "Vallendar",
    "furnished apartment",
    "inclusive rent",
    "shared living",
    "STACEY",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "STACEY Coliving",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/images/website-hero.webp",
        width: 1920,
        height: 1080,
        alt: "STACEY Coliving",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/website-hero.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${montserrat.variable}`}>
      <body className="min-h-full flex flex-col">
        {/* next/script with beforeInteractive self-injects into <head>; do not wrap manually, that clashes with Next.js head management and causes hydration errors. */}
        <ConsentScripts />
        {/* Site-wide Organization JSON-LD. Loads on every page so
            search engines reliably pick up the brand entity, contact
            info, and social profiles for the knowledge panel. */}
        <OrganizationSchema baseUrl={env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")} />
        {children}
      </body>
    </html>
  );
}
