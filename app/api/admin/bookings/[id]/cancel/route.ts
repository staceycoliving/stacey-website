import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { CancellationKind } from "@/lib/generated/prisma/client";

const VALID_KINDS: CancellationKind[] = [
  "WIDERRUF_BY_TENANT",
  "CANCELLED_BY_STACEY",
  "DEPOSIT_TIMEOUT",
  "LEAD_ABANDONED",
  "TENANT_NO_SHOW",
  "OTHER",
];

/**
 * POST /api/admin/bookings/[id]/cancel
 *   body: { kind: CancellationKind, reason?: string }
 *
 * Structured cancellation replacing the old free-text approach. Sets
 * status=CANCELLED, kind=<enum>, reason=<optional detail>, auto-disables
 * retargeting. Refund (if any) is a SEPARATE endpoint (/refund) — we
 * don't auto-refund, admin must explicitly confirm even when kind=
 * CANCELLED_BY_STACEY.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { kind, reason } = await request.json();

  if (!kind || !VALID_KINDS.includes(kind)) {
    return Response.json(
      { error: "kind required (one of: " + VALID_KINDS.join(", ") + ")" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  const cleanReason =
    typeof reason === "string" && reason.trim() ? reason.trim() : null;

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancellationKind: kind as CancellationKind,
      cancellationReason: cleanReason,
      // Stop retargeting on cancel — don't nudge a lost lead forever
      retargetingEligible: false,
    },
  });

  await audit(request, {
    module: "booking",
    action: "cancel",
    entityType: "booking",
    entityId: id,
    summary: `Cancelled ${booking.firstName} ${booking.lastName} · ${kind}${cleanReason ? `: ${cleanReason}` : ""}`,
    metadata: { kind, reason: cleanReason },
  });

  return Response.json({
    id: updated.id,
    status: updated.status,
    cancellationKind: updated.cancellationKind,
    cancellationReason: updated.cancellationReason,
  });
}
