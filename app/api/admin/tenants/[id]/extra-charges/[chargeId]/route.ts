import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; chargeId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chargeId } = await ctx.params;
  const { paid } = await request.json();

  const existing = await prisma.extraCharge.findUnique({
    where: { id: chargeId },
    select: { stripePaymentIntentId: true },
  });
  if (!existing) {
    return Response.json({ error: "Charge not found" }, { status: 404 });
  }
  // Items already bundled into a Stripe PaymentIntent with the monthly
  // rent can't be toggled manually, their paidAt is part of the Stripe
  // ledger. Admin can still delete (for audit cleanup) but can't simply
  // flip the status.
  if (existing.stripePaymentIntentId) {
    return Response.json(
      { error: "Bereits mit Miete via Stripe verrechnet, Status nicht manuell änderbar" },
      { status: 409 }
    );
  }

  await prisma.extraCharge.update({
    where: { id: chargeId },
    data: { paidAt: paid ? new Date() : null },
  });

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; chargeId: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chargeId } = await ctx.params;
  await prisma.extraCharge.delete({ where: { id: chargeId } });
  return Response.json({ ok: true });
}
