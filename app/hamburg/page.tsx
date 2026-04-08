import CityPage from "@/components/CityPage";
import { getLocationsByCity } from "@/lib/data";

export default function HamburgPage() {
  return <CityPage city="hamburg" cityLocations={getLocationsByCity("hamburg")} />;
}
