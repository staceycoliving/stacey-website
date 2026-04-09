import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import RentPage from "./RentPage";

export default async function AdminRentPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  // Get current month and 12 months back
  const now = new Date();
  const monthsBack = 12;
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

  const rentPayments = await prisma.rentPayment.findMany({
    where: { month: { gte: startDate } },
    include: {
      tenant: {
        include: {
          room: {
            include: {
              apartment: {
                include: { location: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ month: "desc" }, { tenant: { lastName: "asc" } }],
  });

  return (
    <RentPage
      rentPayments={JSON.parse(JSON.stringify(rentPayments))}
    />
  );
}
