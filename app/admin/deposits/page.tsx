import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DepositsPage from "./DepositsPage";

export const dynamic = "force-dynamic";

export default async function AdminDepositsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const tenants = await prisma.tenant.findMany({
    where: {
      depositAmount: { not: null },
    },
    include: {
      room: {
        include: {
          apartment: { include: { location: true } },
        },
      },
      rentPayments: {
        where: { status: { in: ["PENDING", "FAILED", "PARTIAL"] } },
        select: { id: true, amount: true, paidAmount: true, month: true },
      },
      extraCharges: {
        where: { paidAt: null },
        select: { id: true, description: true, amount: true },
      },
      defects: {
        select: { id: true, description: true, deductionAmount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
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
