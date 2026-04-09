import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

// 3 Monate Kündigungsfrist zum Monatsende
function calculateMoveOut(noticeDate: Date): Date {
  const d = new Date(noticeDate);
  d.setMonth(d.getMonth() + 3);
  // Last day of that month
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, noticeDate } = await request.json();

  if (!tenantId) {
    return Response.json({ error: "tenantId required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  const notice = noticeDate ? new Date(noticeDate) : new Date();
  const moveOut = calculateMoveOut(notice);

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { notice, moveOut },
  });

  return Response.json({
    id: updated.id,
    notice: updated.notice,
    moveOut: updated.moveOut,
  });
}
