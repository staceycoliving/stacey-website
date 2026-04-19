import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; commId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { commId } = await ctx.params;
  await prisma.tenantCommunication.delete({ where: { id: commId } });
  return Response.json({ ok: true });
}
