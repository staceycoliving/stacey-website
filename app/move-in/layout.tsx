import type { Metadata } from "next";

const TITLE = "Move in with STACEY";
const DESCRIPTION =
  "Find your STACEY home. Pick a stay length, a city, your dates, then book the room. Furnished coliving across Hamburg, Berlin and Vallendar.";

// Move-in is the booking funnel. The /move-in entry page itself is
// indexed (people search "stacey booking" and should land here), but
// every downstream URL state (room IDs, deep-linked filters, payment
// success/cancel pages) is noindex'd via robots.ts so we don't pollute
// the SERP with 90 near-duplicate variants.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/move-in" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/move-in",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function MoveInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
