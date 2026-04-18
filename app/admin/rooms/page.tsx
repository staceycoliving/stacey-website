import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import RoomsPage from "./RoomsPage";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const locations = await prisma.location.findMany({
    include: {
      apartments: {
        include: {
          rooms: {
            include: {
              tenants: true,
              transfersTo: {
                where: { status: "SCHEDULED" },
                include: { tenant: { select: { firstName: true, lastName: true } } },
                take: 1,
              },
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
        orderBy: [{ number: "asc" }, { houseNumber: "asc" }],
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
