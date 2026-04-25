import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { calculateProRataRent } from "@/lib/rent-charge";

/**
 * POST /api/admin/tenants/[id]/transfer
 * Body: {
 *   toRoomId: string,
 *   transferDate: string (ISO),
 *   reason?: string,
 *   newMonthlyRent?: number (cents, null = keep current),
 *   forceOverride?: boolean (allow double-booking)
 * }
 *
 * Creates a RoomTransfer record. If transferDate <= today, executes
 * immediately (COMPLETED). If in the future, stays SCHEDULED for the
 * daily cron to execute.
 *
 * When rent changes mid-month, creates an automatic ExtraCharge
 * (NEXT_RENT) for the pro-rata difference.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tenantId } = await ctx.params;
  const body = await request.json();
  const { toRoomId, transferDate, reason, newMonthlyRent, forceOverride } = body;

  if (!toRoomId || !transferDate) {
    return Response.json(
      { error: "toRoomId and transferDate required" },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { room: true },
  });
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  const toRoom = await prisma.room.findUnique({
    where: { id: toRoomId },
    include: { tenants: true },
  });
  if (!toRoom) {
    return Response.json({ error: "Target room not found" }, { status: 404 });
  }

  // Check for existing occupant on the target room
  const existingTenant = toRoom.tenants[0];
  if (existingTenant && existingTenant.id !== tenantId && !forceOverride) {
    return Response.json(
      {
        error: `Room ${toRoom.roomNumber} is occupied by ${existingTenant.firstName} ${existingTenant.lastName}. Set forceOverride=true to proceed.`,
        occupiedBy: {
          id: existingTenant.id,
          name: `${existingTenant.firstName} ${existingTenant.lastName}`,
        },
      },
      { status: 409 }
    );
  }

  const tDate = new Date(transferDate);
  tDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isImmediate = tDate.getTime() <= today.getTime();

  const oldRent = tenant.monthlyRent;
  const rentChanges = newMonthlyRent !== null && newMonthlyRent !== undefined;
  const finalRent = rentChanges ? newMonthlyRent : oldRent;

  // Create the transfer record
  const transfer = await prisma.roomTransfer.create({
    data: {
      tenantId,
      fromRoomId: tenant.roomId,
      toRoomId,
      transferDate: tDate,
      reason: reason || null,
      oldMonthlyRent: oldRent,
      newMonthlyRent: rentChanges ? newMonthlyRent : null,
      status: isImmediate ? "COMPLETED" : "SCHEDULED",
      completedAt: isImmediate ? new Date() : null,
    },
  });

  // If immediate (today or past), execute the transfer now
  if (isImmediate) {
    await executeTransfer(tenantId, toRoomId, finalRent, tDate, oldRent);
  }

  await audit(request, {
    module: "tenant",
    action: "room_transfer",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Room transfer ${isImmediate ? "executed" : "scheduled"}: ${tenant.firstName} ${tenant.lastName} from ${tenant.room?.roomNumber ?? "unassigned"} → ${toRoom.roomNumber}${isImmediate ? "" : ` on ${transferDate}`}${rentChanges ? ` (rent €${(oldRent / 100).toFixed(0)} → €${(finalRent / 100).toFixed(0)})` : ""}`,
    metadata: {
      transferId: transfer.id,
      fromRoomId: tenant.roomId,
      toRoomId,
      transferDate,
      oldRent,
      newRent: finalRent,
      forceOverride: Boolean(forceOverride),
    },
  });

  return Response.json({
    id: transfer.id,
    status: transfer.status,
    executed: isImmediate,
  });
}

/** Execute a room transfer: move tenant to new room, adjust rent, and
 *  create a pro-rata ExtraCharge if rent changed mid-month. */
async function executeTransfer(
  tenantId: string,
  toRoomId: string,
  newRent: number,
  transferDate: Date,
  oldRent: number
) {
  // Update tenant's room + rent
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      roomId: toRoomId,
      monthlyRent: newRent,
    },
  });

  // If rent changed, check if we need a pro-rata adjustment for the
  // current month (transfer happened mid-month after rent was already
  // charged at the old rate).
  if (newRent !== oldRent) {
    const monthStart = new Date(
      transferDate.getFullYear(),
      transferDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      transferDate.getFullYear(),
      transferDate.getMonth() + 1,
      0
    );
    const daysInMonth = monthEnd.getDate();
    const transferDay = transferDate.getDate();

    // Days at old rate = 1..transferDay-1, days at new rate = transferDay..end
    const daysOldRate = transferDay - 1;
    const daysNewRate = daysInMonth - daysOldRate;

    const correctAmount =
      Math.round((oldRent * daysOldRate) / daysInMonth) +
      Math.round((newRent * daysNewRate) / daysInMonth);

    // Check if there's already a PAID rent for this month
    const existingRent = await prisma.rentPayment.findFirst({
      where: {
        tenantId,
        month: monthStart,
        status: { in: ["PAID", "PROCESSING"] },
      },
    });

    if (existingRent) {
      const diff = correctAmount - existingRent.amount;
      if (diff !== 0) {
        // Update the RentPayment amount to the correct pro-rata
        await prisma.rentPayment.update({
          where: { id: existingRent.id },
          data: { amount: correctAmount },
        });

        // If already paid and diff > 0 → tenant owes more → ExtraCharge
        // If already paid and diff < 0 → tenant overpaid → credit (shows in settlement)
        if (existingRent.paidAmount > 0 && diff > 0) {
          await prisma.extraCharge.create({
            data: {
              tenantId,
              description: `Nachzahlung Zimmerwechsel (${transferDate.toISOString().slice(0, 10)})`,
              amount: diff,
              type: "CHARGE",
              chargeOn: "NEXT_RENT",
            },
          });
        }
      }
    } else {
      // No rent payment yet for this month, update the PENDING one if exists
      const pendingRent = await prisma.rentPayment.findFirst({
        where: { tenantId, month: monthStart, status: "PENDING" },
      });
      if (pendingRent) {
        await prisma.rentPayment.update({
          where: { id: pendingRent.id },
          data: { amount: correctAmount },
        });
      }
    }
  }
}

/**
 * GET /api/admin/tenants/[id]/transfer
 * Returns all transfers for the tenant (history + scheduled).
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const transfers = await prisma.roomTransfer.findMany({
    where: { tenantId: id },
    include: {
      fromRoom: { select: { roomNumber: true, category: true } },
      toRoom: { select: { roomNumber: true, category: true } },
    },
    orderBy: { transferDate: "desc" },
  });
  return Response.json({ transfers });
}

/**
 * DELETE /api/admin/tenants/[id]/transfer
 * Body: { transferId }
 * Cancels a SCHEDULED transfer.
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const { transferId } = await request.json();

  const transfer = await prisma.roomTransfer.findUnique({
    where: { id: transferId },
  });
  if (!transfer || transfer.tenantId !== id) {
    return Response.json({ error: "Transfer not found" }, { status: 404 });
  }
  if (transfer.status !== "SCHEDULED") {
    return Response.json(
      { error: "Only SCHEDULED transfers can be cancelled" },
      { status: 409 }
    );
  }

  await prisma.roomTransfer.update({
    where: { id: transferId },
    data: { status: "CANCELLED" },
  });

  await audit(request, {
    module: "tenant",
    action: "room_transfer_cancel",
    entityType: "tenant",
    entityId: id,
    summary: `Cancelled scheduled room transfer ${transferId}`,
    metadata: { transferId },
  });

  return Response.json({ ok: true });
}
