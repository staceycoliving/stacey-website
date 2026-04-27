import type { Metadata } from "next";

const TITLE = "Why STACEY";
const DESCRIPTION =
  "What makes STACEY different from a serviced apartment, a hotel, or a regular flat-share. Our take on furnished coliving in Hamburg, Berlin and Vallendar.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/why-stacey" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/why-stacey",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function WhyStaceyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
