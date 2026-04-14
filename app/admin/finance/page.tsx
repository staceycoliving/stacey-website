import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import FinancePage from "./FinancePage";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const now = new Date();
  // Last 12 months window for charts.
  const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [rentPayments, tenants, bookingsWithFee, locations] = await Promise.all([
    prisma.rentPayment.findMany({
      where: { month: { gte: start12 } },
      include: {
        tenant: {
          include: {
            room: { include: { apartment: { include: { location: true } } } },
          },
        },
      },
      orderBy: [{ month: "desc" }, { tenant: { lastName: "asc" } }],
    }),
    prisma.tenant.findMany({
      where: { depositStatus: "RECEIVED" },
      include: {
        room: { include: { apartment: { include: { location: true } } } },
      },
    }),
    prisma.booking.findMany({
      where: { bookingFeePaidAt: { gte: start12 } },
      include: { location: true },
    }),
    prisma.location.findMany({
      where: { stayType: "LONG" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <FinancePage
      data={JSON.parse(
        JSON.stringify({
          rentPayments,
          tenants,
          bookingsWithFee,
          locations,
        })
      )}
    />
  );
}
