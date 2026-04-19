import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * PATCH /api/admin/bookings/[id]/lead-source
 * Body: { leadSourceOverride: string | null }
 *
 * Let the admin annotate a manual lead source (Walk-in, Empfehlung, etc.)
 * on top of the UTM-captured automatic fields.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { leadSourceOverride } = await request.json();
  const cleanValue =
    typeof leadSourceOverride === "string" && leadSourceOverride.trim()
      ? leadSourceOverride.trim().slice(0, 200)
      : null;

  const updated = await prisma.booking.update({
    where: { id },
    data: { leadSourceOverride: cleanValue },
  });

  await audit(request, {
    module: "booking",
    action: "lead_source_override",
    entityType: "booking",
    entityId: id,
    summary: cleanValue
      ? `Set lead-source override: "${cleanValue}"`
      : "Removed lead-source override",
    metadata: { value: cleanValue },
  });

  return Response.json({
    id: updated.id,
    leadSourceOverride: updated.leadSourceOverride,
  });
}
