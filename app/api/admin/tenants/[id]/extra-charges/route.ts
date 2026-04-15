import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { description, amount, month, type, chargeOn } = await request.json();

  if (!description || typeof description !== "string") {
    return Response.json({ error: "description required" }, { status: 400 });
  }
  const amountCents = Math.round(Number(amount));
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return Response.json({ error: "amount must be positive integer cents" }, { status: 400 });
  }
  const typeVal = type === "DISCOUNT" ? "DISCOUNT" : "CHARGE";
  const timingVal = chargeOn === "DEPOSIT_SETTLEMENT" ? "DEPOSIT_SETTLEMENT" : "NEXT_RENT";

  const charge = await prisma.extraCharge.create({
    data: {
      tenantId: id,
      description: description.trim(),
      amount: amountCents,
      month: month ? new Date(month) : null,
      type: typeVal,
      chargeOn: timingVal,
    },
  });

  // Audit every adjustment. Discounts in particular leave a clear trail
  // (who gave what rebate, when, and why) so the admin can review later.
  await audit(request, {
    module: "tenant",
    action: typeVal === "DISCOUNT" ? "discount_grant" : "extra_charge_add",
    entityType: "tenant",
    entityId: id,
    summary: `${typeVal === "DISCOUNT" ? "Nachlass" : "Forderung"} €${(amountCents / 100).toFixed(
      2
    )}: ${description.trim()}${timingVal === "DEPOSIT_SETTLEMENT" ? " (→ Auszug)" : ""}`,
    metadata: {
      chargeId: charge.id,
      amount: amountCents,
      type: typeVal,
      chargeOn: timingVal,
      description: description.trim(),
    },
  });

  return Response.json({ id: charge.id });
}
