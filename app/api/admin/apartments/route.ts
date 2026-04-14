import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { locationId, houseNumber, floor, label } = await request.json();
  if (!locationId || !houseNumber || !floor) {
    return Response.json(
      { error: "locationId, houseNumber, floor required" },
      { status: 400 }
    );
  }

  const apt = await prisma.apartment.create({
    data: {
      locationId: String(locationId),
      houseNumber: String(houseNumber).trim(),
      floor: String(floor).trim(),
      label: label ? String(label).trim() : null,
    },
  });

  return Response.json({ id: apt.id });
}
