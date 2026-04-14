import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await ctx.params;
  await prisma.note.delete({ where: { id: noteId } });
  return Response.json({ ok: true });
}
