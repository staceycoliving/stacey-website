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
  const { content } = await request.json();

  if (!content || typeof content !== "string") {
    return Response.json({ error: "content required" }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      tenantId: id,
      content: content.trim(),
    },
  });

  return Response.json({ id: note.id });
}
