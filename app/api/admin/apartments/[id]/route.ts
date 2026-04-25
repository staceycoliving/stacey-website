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
  if (typeof body.houseNumber === "string") data.houseNumber = body.houseNumber.trim();
  if (typeof body.floor === "string") data.floor = body.floor.trim();
  if (body.label === null || typeof body.label === "string")
    data.label = body.label ? String(body.label).trim() : null;

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No editable fields provided" }, { status: 400 });
  }

  await prisma.apartment.update({ where: { id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const roomCount = await prisma.room.count({ where: { apartmentId: id } });
  if (roomCount > 0) {
    return Response.json(
      { error: `Apartment has ${roomCount} room(s), delete those first.` },
      { status: 409 }
    );
  }

  await prisma.apartment.delete({ where: { id } });
  return Response.json({ ok: true });
}
