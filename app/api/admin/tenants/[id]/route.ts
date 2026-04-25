import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * PATCH /api/admin/tenants/[id]
 *
 * Update a tenant's contact details. Name + dateOfBirth are intentionally
 * read-only, they're set on the signed lease and must not drift.
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
  if (typeof body.email === "string") {
    const v = body.email.trim();
    // Minimal email validation, full regex is overkill, this catches the
    // common mistakes (missing @, missing domain TLD).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }
    data.email = v;
  }
  if (typeof body.phone === "string" || body.phone === null) data.phone = body.phone;
  if (typeof body.street === "string" || body.street === null) data.street = body.street;
  if (typeof body.zipCode === "string" || body.zipCode === null) data.zipCode = body.zipCode;
  if (typeof body.addressCity === "string" || body.addressCity === null) data.addressCity = body.addressCity;
  if (typeof body.country === "string" || body.country === null) data.country = body.country;
  if (typeof body.emergencyContactName === "string" || body.emergencyContactName === null) {
    data.emergencyContactName = body.emergencyContactName;
  }
  if (typeof body.emergencyContactPhone === "string" || body.emergencyContactPhone === null) {
    data.emergencyContactPhone = body.emergencyContactPhone;
  }
  if (typeof body.language === "string" && ["en", "de"].includes(body.language)) {
    data.language = body.language;
  }
  if (typeof body.paymentMethod === "string" && ["SEPA", "BANK_TRANSFER"].includes(body.paymentMethod)) {
    data.paymentMethod = body.paymentMethod;
  }

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
