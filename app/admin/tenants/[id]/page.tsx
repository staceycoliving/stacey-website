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
      roomTransfers: {
        include: {
          fromRoom: { select: { roomNumber: true } },
          toRoom: { select: { roomNumber: true } },
        },
        orderBy: { transferDate: "desc" },
      },
    },
  });

  if (!tenant) notFound();

  // 14-day Widerruf window starts at deposit payment. Computed on the server
  // so the client render stays pure (React Compiler in Next 16).
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const withdrawEligible = tenant.booking?.depositPaidAt
    ? nowMs - new Date(tenant.booking.depositPaidAt).getTime() <=
      14 * 24 * 60 * 60 * 1000
    : false;

  return (
    <TenantFolioPage
      tenant={JSON.parse(JSON.stringify(tenant))}
      withdrawEligible={withdrawEligible}
    />
  );
}
