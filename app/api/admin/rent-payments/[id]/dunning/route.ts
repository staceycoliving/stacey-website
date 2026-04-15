import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const STAGE_FIELD: Record<string, "reminder1SentAt" | "mahnung1SentAt" | "mahnung2SentAt"> = {
  reminder1: "reminder1SentAt",
  mahnung1: "mahnung1SentAt",
  mahnung2: "mahnung2SentAt",
};

/**
 * POST /api/admin/rent-payments/[id]/dunning
 * Body: { stage: "reminder1" | "mahnung1" | "mahnung2" }
 *
 * Marks the given dunning stage as sent on the RentPayment. Does NOT
 * dispatch an email — the admin is expected to handle the outbound
 * communication manually (email/letter). This endpoint only records
 * that the step has been taken so the action item disappears from the
 * dashboard.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { stage } = await request.json();
  const field = STAGE_FIELD[stage];
  if (!field) {
    return Response.json(
      { error: "stage must be reminder1, mahnung1, or mahnung2" },
      { status: 400 }
    );
  }

  const rent = await prisma.rentPayment.findUnique({
    where: { id },
    include: { tenant: true },
  });
  if (!rent) {
    return Response.json({ error: "RentPayment not found" }, { status: 404 });
  }

  await prisma.rentPayment.update({
    where: { id },
    data: { [field]: new Date() },
  });

  await audit(request, {
    module: "rent",
    action: `dunning_${stage}_marked_sent`,
    entityType: "rentPayment",
    entityId: id,
    summary: `${stage} marked sent for ${rent.tenant.firstName} ${rent.tenant.lastName} (${rent.month.toISOString().slice(0, 7)})`,
    metadata: { stage, tenantId: rent.tenantId, month: rent.month },
  });

  return Response.json({ ok: true });
}
