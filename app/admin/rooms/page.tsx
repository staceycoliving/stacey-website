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
            include: {
              tenant: true,
              bookings: {
                where: {
                  stayType: "LONG",
                  status: { notIn: ["CANCELLED", "CONFIRMED"] },
                },
                orderBy: { createdAt: "desc" },
                take: 1,
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
    <RoomsPage
      locations={JSON.parse(JSON.stringify(locations))}
    />
  );
}
