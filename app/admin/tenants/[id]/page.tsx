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
      notes: { orderBy: [{ sticky: "desc" }, { createdAt: "desc" }] },
      roomTransfers: {
        include: {
          fromRoom: { select: { roomNumber: true } },
          toRoom: { select: { roomNumber: true } },
        },
        orderBy: { transferDate: "desc" },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
      communications: { orderBy: { at: "desc" } },
    },
  });

  if (!tenant) notFound();

  // Email history for this tenant — three sources:
  //   1. entityType=tenant, entityId=this.id      (post-tenant emails)
  //   2. entityType=booking, entityId=bookingId   (pre-tenant/booking phase)
  //   3. recipient=tenant.email                    (fallback for legacy logs)
  // Union'd so the folio Emails-tab shows the full lifecycle.
  const [sentEmails, auditEvents, relatedTenantsRaw] = await Promise.all([
    prisma.sentEmail.findMany({
      where: {
        OR: [
          { entityType: "tenant", entityId: id },
          ...(tenant.bookingId
            ? [{ entityType: "booking", entityId: tenant.bookingId }]
            : []),
          { recipient: tenant.email },
        ],
      },
      orderBy: { sentAt: "desc" },
      take: 50,
    }),

    // Audit events for this tenant — entityType=tenant OR entityId matching
    // any of this tenant's child records.
    (async () => {
      const [rpIds, ecIds, dIds, nIds] = await Promise.all([
        prisma.rentPayment.findMany({
          where: { tenantId: id },
          select: { id: true },
        }),
        prisma.extraCharge.findMany({
          where: { tenantId: id },
          select: { id: true },
        }),
        prisma.defect.findMany({
          where: { tenantId: id },
          select: { id: true },
        }),
        prisma.note.findMany({
          where: { tenantId: id },
          select: { id: true },
        }),
      ]);
      const conditions = [
        { entityType: "tenant", entityId: id },
        ...rpIds.map((r) => ({ entityType: "rentPayment", entityId: r.id })),
        ...ecIds.map((r) => ({ entityType: "extraCharge", entityId: r.id })),
        ...dIds.map((r) => ({ entityType: "defect", entityId: r.id })),
        ...nIds.map((r) => ({ entityType: "note", entityId: r.id })),
      ];
      if (tenant.bookingId) {
        conditions.push({ entityType: "booking", entityId: tenant.bookingId });
      }
      return prisma.auditLog.findMany({
        where: { OR: conditions },
        orderBy: { at: "desc" },
        take: 100,
      });
    })(),

    // Related tenants: same current room (room-mate) OR same apartment
    // history (alumni) — excluding self and archived.
    tenant.roomId
      ? prisma.tenant.findMany({
          where: {
            id: { not: id },
            archivedAt: null,
            room: { apartmentId: tenant.room?.apartmentId },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            moveIn: true,
            moveOut: true,
            roomId: true,
            room: {
              select: {
                roomNumber: true,
              },
            },
          },
          orderBy: { moveIn: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

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
      sentEmails={JSON.parse(JSON.stringify(sentEmails))}
      auditEvents={JSON.parse(JSON.stringify(auditEvents))}
      relatedTenants={JSON.parse(JSON.stringify(relatedTenantsRaw))}
      withdrawEligible={withdrawEligible}
    />
  );
}
