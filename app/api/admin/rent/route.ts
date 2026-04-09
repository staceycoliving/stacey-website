import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rentPaymentId, action, amount } = await request.json();

  if (!rentPaymentId || !action) {
    return Response.json({ error: "rentPaymentId and action required" }, { status: 400 });
  }

  const rentPayment = await prisma.rentPayment.findUnique({ where: { id: rentPaymentId } });
  if (!rentPayment) {
    return Response.json({ error: "RentPayment not found" }, { status: 404 });
  }

  if (action === "mark_paid") {
    const updated = await prisma.rentPayment.update({
      where: { id: rentPaymentId },
      data: {
        status: "PAID",
        paidAmount: amount || rentPayment.amount,
        paidAt: new Date(),
      },
    });
    return Response.json(updated);
  }

  if (action === "adjust") {
    if (amount === undefined) {
      return Response.json({ error: "amount required for adjust" }, { status: 400 });
    }
    const updated = await prisma.rentPayment.update({
      where: { id: rentPaymentId },
      data: {
        paidAmount: Math.round(amount),
        status: amount >= rentPayment.amount ? "PAID" : "PARTIAL",
      },
    });
    return Response.json(updated);
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
