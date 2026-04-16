import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TenantsPage from "./TenantsPage";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [tenantsRaw, locations, tenantNotes] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        room: {
          include: {
            apartment: {
              include: { location: true },
            },
          },
        },
        // Load both the unpaid (for the payment-status badge) and the paid
        // (for the Widerruf refund calculation) rents in one query.
        rentPayments: {
          select: {
            id: true,
            status: true,
            amount: true,
            paidAmount: true,
            month: true,
            reminder1SentAt: true,
            mahnung1SentAt: true,
            mahnung2SentAt: true,
          },
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
    prisma.teamNote.findMany({
      where: { tenantId: { not: null } },
      select: { tenantId: true },
    }),
  ]);

  // Group notes by tenantId → just the count, list view only needs that
  const notesCountByTenant: Record<string, number> = {};
  for (const n of tenantNotes) {
    if (!n.tenantId) continue;
    notesCountByTenant[n.tenantId] = (notesCountByTenant[n.tenantId] ?? 0) + 1;
  }

  // Pre-compute paidRentsCents per tenant so the Widerruf modal can show
  // an accurate live preview without doing aggregation client-side.
  const tenants = tenantsRaw.map((t) => ({
    ...t,
    paidRentsCents: t.rentPayments
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.paidAmount, 0),
    notesCount: notesCountByTenant[t.id] ?? 0,
  }));

  return (
    <TenantsPage
      tenants={JSON.parse(JSON.stringify(tenants))}
      locations={JSON.parse(JSON.stringify(locations))}
    />
  );
}
