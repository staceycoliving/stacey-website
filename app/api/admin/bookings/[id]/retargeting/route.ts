import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  sendRetargetingNudge,
  buildResumeUrl,
  buildUnsubscribeUrl,
} from "@/lib/email";

/**
 * PATCH /api/admin/bookings/[id]/retargeting
 *   body: { eligible: boolean }
 *     → toggle retargetingEligible flag.
 *
 * POST /api/admin/bookings/[id]/retargeting
 *   body: {}  (no body, sends nudge)
 *     → manually fire the retargeting nudge email now (admin-triggered).
 *       Updates retargetingLastSentAt + increments retargetingSentCount.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { eligible } = await request.json();
  if (typeof eligible !== "boolean") {
    return Response.json({ error: "eligible boolean required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  await prisma.booking.update({
    where: { id },
    data: { retargetingEligible: eligible },
  });

  await audit(request, {
    module: "booking",
    action: eligible ? "retargeting_enabled" : "retargeting_disabled",
    entityType: "booking",
    entityId: id,
    summary: `Retargeting ${eligible ? "ON" : "OFF"} for ${booking.firstName} ${booking.lastName}`,
  });

  return Response.json({ ok: true });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { location: true },
  });
  if (!booking) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "PENDING") {
    return Response.json(
      { error: "Retargeting only makes sense for PENDING leads" },
      { status: 400 }
    );
  }
  if (!booking.retargetingEligible) {
    return Response.json(
      { error: "This booking has unsubscribed from retargeting" },
      { status: 400 }
    );
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(booking.createdAt).getTime()) / 86_400_000
  );

  try {
    await sendRetargetingNudge(
      {
        firstName: booking.firstName,
        email: booking.email,
        locationName: booking.location.name,
        category: booking.category,
        moveInDate: booking.moveInDate?.toISOString() ?? null,
        bookingId: booking.id,
        daysSinceBooking: daysSince,
        resumeUrl: buildResumeUrl(booking.id),
        unsubscribeUrl: buildUnsubscribeUrl(booking.id),
      },
      { triggeredBy: "manual_resend" }
    );

    await prisma.booking.update({
      where: { id },
      data: {
        retargetingLastSentAt: new Date(),
        retargetingSentCount: { increment: 1 },
      },
    });

    await audit(request, {
      module: "booking",
      action: "retargeting_sent_manual",
      entityType: "booking",
      entityId: id,
      summary: `Manually sent retargeting nudge to ${booking.firstName} ${booking.lastName}`,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: `Send failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
