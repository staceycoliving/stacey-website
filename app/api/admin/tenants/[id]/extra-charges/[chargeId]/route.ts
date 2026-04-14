import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; chargeId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chargeId } = await ctx.params;
  const { paid } = await request.json();

  await prisma.extraCharge.update({
    where: { id: chargeId },
    data: { paidAt: paid ? new Date() : null },
  });

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; chargeId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chargeId } = await ctx.params;
  await prisma.extraCharge.delete({ where: { id: chargeId } });
  return Response.json({ ok: true });
}
