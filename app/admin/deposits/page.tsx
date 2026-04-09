import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DepositsPage from "./DepositsPage";

export default async function AdminDepositsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const tenants = await prisma.tenant.findMany({
    where: {
      depositAmount: { not: null },
    },
    include: {
      room: {
        include: {
          apartment: {
            include: { location: true },
          },
        },
      },
      rentPayments: {
        where: { status: { in: ["PENDING", "FAILED"] } },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return (
    <DepositsPage
      tenants={JSON.parse(JSON.stringify(tenants))}
    />
  );
}
