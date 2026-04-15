import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/admin/team-notes/[id]
 * Body: { sticky?, content? }
 *
 * Toggle sticky or edit the content of a note.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.sticky === "boolean") data.sticky = body.sticky;
  if (typeof body.content === "string" && body.content.trim()) {
    data.content = body.content.trim().slice(0, 2000);
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }
  await prisma.teamNote.update({ where: { id }, data });
  return Response.json({ ok: true });
}

/**
 * DELETE /api/admin/team-notes/[id]
 */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.teamNote.delete({ where: { id } });
  return Response.json({ ok: true });
}
