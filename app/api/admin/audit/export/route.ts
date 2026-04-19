import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * GET /api/admin/audit/export
 *   ?module&action&entityType&entityId&search&from&to
 *
 * CSV of all matching audit events. Caps at 5000 rows to avoid runaway
 * exports — narrow the filter if you need more.
 */
function csvEscape(v: string | null | undefined): string {
  const s = v ?? "";
  if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDateDE(d: Date): string {
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const where: Prisma.AuditLogWhereInput = {};
  if (params.get("module")) where.module = params.get("module")!;
  if (params.get("action")) where.action = params.get("action")!;
  if (params.get("entityType")) where.entityType = params.get("entityType")!;
  if (params.get("entityId")) where.entityId = params.get("entityId")!;
  const search = params.get("search")?.trim();
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
    ];
  }
  const from = params.get("from");
  const to = params.get("to");
  if (from || to) {
    where.at = {
      ...(from ? { gte: new Date(from + "T00:00:00") } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
    };
  }

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { at: "desc" },
    take: 5000,
  });

  const header = [
    "When",
    "Module",
    "Action",
    "Entity type",
    "Entity ID",
    "Summary",
    "IP",
    "Path",
    "Metadata JSON",
  ].join(";");

  const lines = entries.map((e) =>
    [
      fmtDateDE(new Date(e.at)),
      csvEscape(e.module),
      csvEscape(e.action),
      csvEscape(e.entityType),
      csvEscape(e.entityId),
      csvEscape(e.summary),
      csvEscape(e.ip),
      csvEscape(e.path),
      csvEscape(e.metadata ? JSON.stringify(e.metadata) : null),
    ].join(";")
  );

  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  const filterTag =
    [params.get("module"), params.get("action")].filter(Boolean).join("_") ||
    "all";
  const filename = `audit_${filterTag}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
