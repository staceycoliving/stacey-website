import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, monthlyRent } = await request.json();

  if (!tenantId || monthlyRent === undefined) {
    return Response.json({ error: "tenantId and monthlyRent required" }, { status: 400 });
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { monthlyRent: Math.round(monthlyRent) },
  });

  return Response.json({
    id: updated.id,
    monthlyRent: updated.monthlyRent,
  });
}
