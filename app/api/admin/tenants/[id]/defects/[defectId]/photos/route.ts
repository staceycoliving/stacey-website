import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/admin/tenants/[id]/defects/[defectId]/photos
 * Body: { photos: string[] }   // full replacement list of URLs
 *
 * Photos are stored as a string[] on Defect. Upload to Google Drive
 * happens client-side (direct browser → Drive via signed URL) or via
 * the generic document-upload flow; this endpoint just persists the
 * final list of URLs.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; defectId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { defectId } = await ctx.params;
  const { photos } = await request.json();

  if (!Array.isArray(photos)) {
    return Response.json(
      { error: "photos[] required" },
      { status: 400 }
    );
  }
  const urls = photos
    .map((p: unknown) => String(p).trim())
    .filter((s: string) => Boolean(s));

  const updated = await prisma.defect.update({
    where: { id: defectId },
    data: { photos: urls },
  });
  return Response.json({ id: updated.id, photos: updated.photos });
}
