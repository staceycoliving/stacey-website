import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { description, amount, month } = await request.json();

  if (!description || typeof description !== "string") {
    return Response.json({ error: "description required" }, { status: 400 });
  }
  const amountCents = Math.round(Number(amount));
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return Response.json({ error: "amount must be positive integer cents" }, { status: 400 });
  }

  const charge = await prisma.extraCharge.create({
    data: {
      tenantId: id,
      description: description.trim(),
      amount: amountCents,
      month: month ? new Date(month) : null,
    },
  });

  return Response.json({ id: charge.id });
}
