import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import OccupancyPage from "./OccupancyPage";

export const dynamic = "force-dynamic";

export default async function AdminOccupancyPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const locations = await prisma.location.findMany({
    where: { stayType: "LONG" },
    include: {
      apartments: {
        include: {
          rooms: {
            include: {
              tenants: true,
              bookings: {
                where: {
                  stayType: "LONG",
                  status: { in: ["DEPOSIT_PENDING"] },
                },
                orderBy: { moveInDate: "asc" },
              },
            },
            orderBy: { roomNumber: "asc" },
          },
        },
        orderBy: { houseNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <OccupancyPage
      locations={JSON.parse(JSON.stringify(locations))}
    />
  );
}
