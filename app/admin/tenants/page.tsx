import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TenantsPage from "./TenantsPage";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [tenants, locations] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        room: {
          include: {
            apartment: {
              include: { location: true },
            },
          },
        },
        rentPayments: {
          where: { status: { in: ["PENDING", "FAILED", "PROCESSING", "PARTIAL"] } },
          select: { id: true, status: true, amount: true, paidAmount: true, month: true },
        },
        booking: {
          select: { id: true, depositPaidAt: true, bookingFeePaidAt: true },
        },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.location.findMany({
      where: { stayType: "LONG" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <TenantsPage
      tenants={JSON.parse(JSON.stringify(tenants))}
      locations={JSON.parse(JSON.stringify(locations))}
    />
  );
}
