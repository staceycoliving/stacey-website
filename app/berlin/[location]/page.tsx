import { notFound } from "next/navigation";
import LocationDetailPage from "@/components/LocationDetailPage";
import { getLocationsByCity } from "@/lib/data";

export function generateStaticParams() {
  return getLocationsByCity("berlin").map((loc) => ({
    location: loc.slug,
  }));
}

export default async function BerlinLocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: slug } = await params;
  const loc = getLocationsByCity("berlin").find((l) => l.slug === slug);
  if (!loc) notFound();
  return <LocationDetailPage location={loc} cityLabel="Berlin" />;
}
