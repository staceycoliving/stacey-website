import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/team-notes
 * Body: { content, author?, sticky?, tenantId?, bookingId? }
 *
 * Creates a shared team note. Kept simple: no auth-user mapping yet, so
 * author is a free-text field the admin types (or leaves blank).
 * Optional tenantId OR bookingId attaches the note to a specific entity
 * so it shows up in that folio / booking detail panel.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, author, sticky, tenantId, bookingId } = await request.json();
  if (!content || typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "content required" }, { status: 400 });
  }

  const note = await prisma.teamNote.create({
    data: {
      content: content.trim().slice(0, 2000),
      author: author?.trim() || null,
      sticky: Boolean(sticky),
      tenantId: tenantId || null,
      bookingId: bookingId || null,
    },
  });

  return Response.json({ id: note.id });
}
