import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { generateWohnungsgeberbestaetigung } from "@/lib/wohnungsgeberbestaetigung";
import { generateMietschuldenfreiheitsbescheinigung } from "@/lib/mietschuldenfreiheit";

/**
 * GET /api/admin/tenants/[id]/certificate?type=rent_clearance|residence_confirmation
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const type = new URL(request.url).searchParams.get("type");

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      room: { include: { apartment: { include: { location: true } } } },
      rentPayments: true,
      extraCharges: true,
    },
  });

  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    if (type === "rent_clearance") {
      const totalDue =
        tenant.rentPayments.reduce((s, p) => s + p.amount, 0) +
        tenant.extraCharges.filter((c) => !c.paidAt).reduce((s, c) => s + c.amount, 0);
      const totalPaid = tenant.rentPayments.reduce((s, p) => s + p.paidAmount, 0);
      const openBalance = totalDue - totalPaid;

      const pdf = await generateMietschuldenfreiheitsbescheinigung({
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        dateOfBirth: tenant.dateOfBirth?.toISOString() ?? null,
        locationName: tenant.room!.apartment.location.name,
        locationAddress: tenant.room!.apartment.location.address,
        roomNumber: tenant.room!.roomNumber,
        apartmentLabel: tenant.room!.apartment.label ?? tenant.room!.apartment.floor,
        moveIn: tenant.moveIn.toISOString(),
        moveOut: tenant.moveOut?.toISOString() ?? null,
        totalPaid,
        totalDue,
        openBalance,
      });

      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Mietschuldenfreiheit_${tenant.lastName}_${tenant.firstName}.pdf"`,
        },
      });
    }

    if (type === "residence_confirmation") {
      const pdf = await generateWohnungsgeberbestaetigung({
        persons: [{ firstName: tenant.firstName, lastName: tenant.lastName }],
        moveInDate: tenant.moveIn.toISOString().split("T")[0],
        roomNumber: tenant.room!.roomNumber,
        locationSlug: tenant.room!.apartment.location.slug,
        floor: tenant.room!.floorDescription ?? tenant.room!.apartment.floor,
        buildingAddress: tenant.room!.buildingAddress ?? undefined,
      });

      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Wohnungsgeberbestaetigung_${tenant.lastName}_${tenant.firstName}.pdf"`,
        },
      });
    }

    return Response.json({ error: "Unknown certificate type" }, { status: 400 });
  } catch (err) {
    console.error("Certificate generation failed:", err);
    return Response.json(
      { error: "Certificate generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
