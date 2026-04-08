import CityPage from "@/components/CityPage";
import { getLocationsByCity } from "@/lib/data";

export default function BerlinPage() {
  return <CityPage city="berlin" cityLocations={getLocationsByCity("berlin")} />;
}
