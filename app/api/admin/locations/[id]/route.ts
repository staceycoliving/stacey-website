import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

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
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.city === "string") data.city = body.city.trim();
  if (typeof body.address === "string") data.address = body.address.trim();
  if (typeof body.slug === "string") data.slug = body.slug.trim().toLowerCase();
  if (body.stayType === "LONG" || body.stayType === "SHORT") data.stayType = body.stayType;

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No editable fields provided" }, { status: 400 });
  }

  try {
    await prisma.location.update({ where: { id }, data });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "Slug already in use" }, { status: 409 });
    }
    return Response.json({ error: "Update failed", details: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  // Safety: refuse delete if the location has any apartments.
  const apartmentCount = await prisma.apartment.count({ where: { locationId: id } });
  if (apartmentCount > 0) {
    return Response.json(
      { error: `Location has ${apartmentCount} apartment(s), delete those first.` },
      { status: 409 }
    );
  }

  await prisma.location.delete({ where: { id } });
  return Response.json({ ok: true });
}
