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

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await ctx.params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.content === "string") data.content = body.content.trim();
  if (Array.isArray(body.tags)) {
    data.tags = body.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
  }
  if (typeof body.sticky === "boolean") data.sticky = body.sticky;
  if (body.followUpAt !== undefined) {
    data.followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
  }

  const updated = await prisma.note.update({
    where: { id: noteId },
    data,
  });
  return Response.json({ id: updated.id });
}
