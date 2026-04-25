import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TenantsPage from "./TenantsPage";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  // Date.now() is fine in a Server Component, the React Compiler rule
  // fires by default; skip it here.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const [tenantsRaw, locations, tenantNotes, recentAudit] = await Promise.all([
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
        roomTransfers: {
          where: { status: "SCHEDULED" },
          include: { toRoom: { select: { roomNumber: true } } },
          take: 1,
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
    // Audit entries about tenant changes in the last 7 days, for the
    // "Recently changed" section. Distinct tenant IDs then ordered by
    // most-recent activity.
    prisma.auditLog.findMany({
      where: {
        entityType: "tenant",
        at: { gte: sevenDaysAgo },
      },
      orderBy: { at: "desc" },
      take: 100, // plenty, we distinct by tenantId on the server below
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

  // Recently-changed tenants: first 5 distinct tenantIds from the audit
  // log. Carry the most-recent summary + timestamp for the dashboard card.
  const seenTenant = new Set<string>();
  const recentlyChanged: { tenantId: string; at: Date; summary: string }[] = [];
  for (const a of recentAudit) {
    if (!a.entityId || seenTenant.has(a.entityId)) continue;
    seenTenant.add(a.entityId);
    recentlyChanged.push({
      tenantId: a.entityId,
      at: a.at,
      summary: a.summary ?? `${a.module} · ${a.action}`,
    });
    if (recentlyChanged.length >= 5) break;
  }

  return (
    <TenantsPage
      tenants={JSON.parse(JSON.stringify(tenants))}
      locations={JSON.parse(JSON.stringify(locations))}
      recentlyChanged={JSON.parse(JSON.stringify(recentlyChanged))}
    />
  );
}
