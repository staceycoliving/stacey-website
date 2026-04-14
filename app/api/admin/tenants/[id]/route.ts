import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * PATCH /api/admin/tenants/[id]
 *
 * Update a tenant's contact details. Name + dateOfBirth are intentionally
 * read-only — they're set on the signed lease and must not drift.
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
  if (typeof body.email === "string") data.email = body.email.trim();
  if (typeof body.phone === "string" || body.phone === null) data.phone = body.phone;
  if (typeof body.street === "string" || body.street === null) data.street = body.street;
  if (typeof body.zipCode === "string" || body.zipCode === null) data.zipCode = body.zipCode;
  if (typeof body.addressCity === "string" || body.addressCity === null) data.addressCity = body.addressCity;
  if (typeof body.country === "string" || body.country === null) data.country = body.country;

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data,
  });

  await audit(request, {
    module: "tenant",
    action: "patch_profile",
    entityType: "tenant",
    entityId: id,
    summary: `Edited profile of ${tenant.firstName} ${tenant.lastName}`,
    metadata: { fields: Object.keys(data) },
  });

  return Response.json({ id: tenant.id });
}
