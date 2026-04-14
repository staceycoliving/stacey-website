import { isAuthenticated } from "@/lib/admin-auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TenantFolioPage from "./TenantFolioPage";

export const dynamic = "force-dynamic";

export default async function TenantFolioRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      room: { include: { apartment: { include: { location: true } } } },
      booking: true,
      rentPayments: { orderBy: { month: "desc" } },
      extraCharges: { orderBy: { createdAt: "desc" } },
      rentAdjustments: { orderBy: { createdAt: "desc" } },
      defects: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!tenant) notFound();

  return (
    <TenantFolioPage
      tenant={JSON.parse(JSON.stringify(tenant))}
    />
  );
}
