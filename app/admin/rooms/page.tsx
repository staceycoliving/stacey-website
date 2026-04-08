import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import RoomsPage from "./RoomsPage";

export default async function AdminRoomsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const locations = await prisma.location.findMany({
    where: { stayType: "LONG" },
    include: {
      apartments: {
        include: {
          rooms: {
            include: { tenant: true },
            orderBy: { roomNumber: "asc" },
          },
        },
        orderBy: { houseNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Also fetch SHORT stay locations with capacity info
  const shortLocations = await prisma.location.findMany({
    where: { stayType: "SHORT" },
    include: {
      capacities: true,
      bookings: {
        where: {
          status: { not: "CANCELLED" },
          checkOut: { gte: new Date() },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <RoomsPage
      locations={JSON.parse(JSON.stringify(locations))}
      shortLocations={JSON.parse(JSON.stringify(shortLocations))}
    />
  );
}
