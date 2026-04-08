import CityPage from "@/components/CityPage";
import { getLocationsByCity } from "@/lib/data";

export default function VallenPage() {
  return <CityPage city="vallendar" cityLocations={getLocationsByCity("vallendar")} />;
}
