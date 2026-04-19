import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { env } from "@/lib/env";
import ConsentScripts from "@/components/legal/ConsentScripts";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
});

const TITLE = "STACEY — Coliving. Just Better.";
const DESCRIPTION =
  "STACEY offers furnished coliving apartments in Hamburg, Berlin, and Vallendar. All-inclusive, community included. Short stays from 5 nights, long stays from 3 months.";

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
    "all-inclusive rent",
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
      <head>
        <ConsentScripts />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
