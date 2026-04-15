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
      // Include unpaid rents (for arrears) AND any PAID rents with
      // paidAmount > amount (overpayment from moveOut reconcile).
      rentPayments: {
        where: {
          OR: [
            { status: { in: ["PENDING", "FAILED", "PARTIAL"] } },
            { status: "PAID" }, // filtered to overpayment in computeBreakdown
          ],
        },
        select: { id: true, amount: true, paidAmount: true, month: true, status: true },
      },
      extraCharges: {
        where: { paidAt: null, chargeOn: "DEPOSIT_SETTLEMENT" },
        select: { id: true, description: true, amount: true, type: true },
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
