import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import AuditPage from "./AuditPage";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    module?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    search?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const params = await searchParams;

  const where: Prisma.AuditLogWhereInput = {};
  if (params.module) where.module = params.module;
  if (params.action) where.action = params.action;
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;
  if (params.search) {
    const q = params.search.trim();
    if (q) {
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
      ];
    }
  }
  if (params.from || params.to) {
    where.at = {
      ...(params.from ? { gte: new Date(params.from + "T00:00:00") } : {}),
      ...(params.to ? { lte: new Date(params.to + "T23:59:59") } : {}),
    };
  }

  const take = PAGE_SIZE;
  const skip = params.cursor ? Math.max(0, parseInt(params.cursor, 10)) : 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 86_400_000);

  const [entries, totalCount, modules, actions, todayCount, weekCount] =
    await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { at: "desc" },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ["module"],
        _count: { module: true },
        orderBy: { module: "asc" },
      }),
      // Distinct actions for the filter dropdown. Cap so we don't blow up
      // on giant histories.
      prisma.auditLog.findMany({
        distinct: ["action"],
        select: { action: true, module: true },
        orderBy: { action: "asc" },
        take: 200,
      }),
      prisma.auditLog.count({ where: { at: { gte: todayStart } } }),
      prisma.auditLog.count({ where: { at: { gte: weekStart } } }),
    ]);

  // ─── Entity-label map ────────────────────────────────────────
  // Resolve the entities referenced in the visible events so the UI can
  // show "tenant/Max Mustermann" instead of raw IDs, and deep-link to
  // the right admin page.
  const tenantIdsDirect = new Set<string>();
  const bookingIds = new Set<string>();
  const rentPaymentIds = new Set<string>();
  const defectIds = new Set<string>();
  const noteIds = new Set<string>();
  const extraChargeIds = new Set<string>();
  const sentEmailIds = new Set<string>();

  for (const e of entries) {
    if (!e.entityId) continue;
    switch (e.entityType) {
      case "tenant":
        tenantIdsDirect.add(e.entityId);
        break;
      case "booking":
        bookingIds.add(e.entityId);
        break;
      case "rentPayment":
        rentPaymentIds.add(e.entityId);
        break;
      case "defect":
        defectIds.add(e.entityId);
        break;
      case "note":
        noteIds.add(e.entityId);
        break;
      case "extraCharge":
        extraChargeIds.add(e.entityId);
        break;
      case "sentEmail":
        sentEmailIds.add(e.entityId);
        break;
    }
  }

  const [
    directTenants,
    bookings,
    rentPayments,
    defects,
    notes,
    extraCharges,
  ] = await Promise.all([
    tenantIdsDirect.size > 0
      ? prisma.tenant.findMany({
          where: { id: { in: Array.from(tenantIdsDirect) } },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
    bookingIds.size > 0
      ? prisma.booking.findMany({
          where: { id: { in: Array.from(bookingIds) } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tenant: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : Promise.resolve([]),
    rentPaymentIds.size > 0
      ? prisma.rentPayment.findMany({
          where: { id: { in: Array.from(rentPaymentIds) } },
          select: {
            id: true,
            month: true,
            tenant: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : Promise.resolve([]),
    defectIds.size > 0
      ? prisma.defect.findMany({
          where: { id: { in: Array.from(defectIds) } },
          select: {
            id: true,
            description: true,
            tenant: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : Promise.resolve([]),
    noteIds.size > 0
      ? prisma.note.findMany({
          where: { id: { in: Array.from(noteIds) } },
          select: {
            id: true,
            tenant: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : Promise.resolve([]),
    extraChargeIds.size > 0
      ? prisma.extraCharge.findMany({
          where: { id: { in: Array.from(extraChargeIds) } },
          select: {
            id: true,
            description: true,
            tenant: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  // Build a flat resolver table: { "tenant:<id>": { label, tenantId } }
  type EntityRef = { label: string; tenantId: string | null };
  const entityRefs: Record<string, EntityRef> = {};
  for (const t of directTenants) {
    entityRefs[`tenant:${t.id}`] = {
      label: `${t.firstName} ${t.lastName}`,
      tenantId: t.id,
    };
  }
  for (const b of bookings) {
    const name = `${b.firstName} ${b.lastName}`;
    entityRefs[`booking:${b.id}`] = {
      label: name,
      tenantId: b.tenant?.id ?? null,
    };
  }
  for (const rp of rentPayments) {
    const name = rp.tenant
      ? `${rp.tenant.firstName} ${rp.tenant.lastName}`
      : null;
    const monthLabel = new Date(rp.month).toLocaleDateString("de-DE", {
      month: "short",
      year: "numeric",
    });
    entityRefs[`rentPayment:${rp.id}`] = {
      label: `${name ?? ","} · ${monthLabel}`,
      tenantId: rp.tenant?.id ?? null,
    };
  }
  for (const d of defects) {
    const name = d.tenant
      ? `${d.tenant.firstName} ${d.tenant.lastName}`
      : null;
    entityRefs[`defect:${d.id}`] = {
      label: `${name ?? ","} · ${d.description.slice(0, 40)}`,
      tenantId: d.tenant?.id ?? null,
    };
  }
  for (const n of notes) {
    const name = n.tenant
      ? `${n.tenant.firstName} ${n.tenant.lastName}`
      : null;
    entityRefs[`note:${n.id}`] = {
      label: name ?? ",",
      tenantId: n.tenant?.id ?? null,
    };
  }
  for (const e of extraCharges) {
    const name = e.tenant
      ? `${e.tenant.firstName} ${e.tenant.lastName}`
      : null;
    entityRefs[`extraCharge:${e.id}`] = {
      label: `${name ?? ","} · ${e.description.slice(0, 40)}`,
      tenantId: e.tenant?.id ?? null,
    };
  }

  // Dedup actions, enrich with module count
  const actionsByModule = new Map<string, Set<string>>();
  for (const a of actions) {
    const set = actionsByModule.get(a.module) ?? new Set<string>();
    set.add(a.action);
    actionsByModule.set(a.module, set);
  }
  const actionList = Array.from(
    new Set(actions.map((a) => a.action))
  ).sort();

  return (
    <AuditPage
      entries={JSON.parse(JSON.stringify(entries))}
      entityRefs={entityRefs}
      modules={modules.map((m) => ({
        name: m.module,
        count: m._count.module,
      }))}
      actions={actionList}
      stats={{ total: totalCount, today: todayCount, week: weekCount }}
      filters={{
        module: params.module ?? "",
        action: params.action ?? "",
        entityType: params.entityType ?? "",
        entityId: params.entityId ?? "",
        search: params.search ?? "",
        from: params.from ?? "",
        to: params.to ?? "",
      }}
      pagination={{
        cursor: skip,
        pageSize: PAGE_SIZE,
        hasMore: skip + take < totalCount,
      }}
    />
  );
}
