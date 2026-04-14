import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import AuditPage from "./AuditPage";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; from?: string; to?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const params = await searchParams;
  const filters: { module?: string; from?: Date; to?: Date } = {};
  if (params.module) filters.module = params.module;
  if (params.from) filters.from = new Date(params.from + "T00:00:00");
  if (params.to) filters.to = new Date(params.to + "T23:59:59");

  const where: Record<string, unknown> = {};
  if (filters.module) where.module = filters.module;
  if (filters.from || filters.to) {
    where.at = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  const [entries, modules] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { at: "desc" },
      take: 500,
    }),
    prisma.auditLog.groupBy({
      by: ["module"],
      _count: { module: true },
      orderBy: { module: "asc" },
    }),
  ]);

  return (
    <AuditPage
      entries={JSON.parse(JSON.stringify(entries))}
      modules={modules.map((m) => ({ name: m.module, count: m._count.module }))}
      filterModule={params.module ?? ""}
      filterFrom={params.from ?? ""}
      filterTo={params.to ?? ""}
    />
  );
}
