import { notFound } from "next/navigation";
import LocationDetailPage from "@/components/LocationDetailPage";
import { getLocationsByCity } from "@/lib/data";

export function generateStaticParams() {
  return getLocationsByCity("hamburg").map((loc) => ({
    location: loc.slug,
  }));
}

export default async function HamburgLocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: slug } = await params;
  const loc = getLocationsByCity("hamburg").find((l) => l.slug === slug);
  if (!loc) notFound();
  return <LocationDetailPage location={loc} cityLabel="Hamburg" />;
}
