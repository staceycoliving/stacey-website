import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const { content, tags, sticky, followUpAt } = body;

  if (!content || typeof content !== "string") {
    return Response.json({ error: "content required" }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      tenantId: id,
      content: content.trim(),
      tags: Array.isArray(tags)
        ? tags.map((t: unknown) => String(t).trim()).filter(Boolean)
        : [],
      sticky: Boolean(sticky),
      followUpAt: followUpAt ? new Date(followUpAt) : null,
    },
  });

  return Response.json({ id: note.id });
}
